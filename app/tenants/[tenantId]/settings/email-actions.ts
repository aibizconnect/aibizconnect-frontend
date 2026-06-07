"use server";

import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { requireTenantAccess } from "@/lib/auth/tenant-access";
import { verifyDnsRecord } from "@/lib/server/cloudflare";

async function requireAdminWrite(): Promise<void> {
  const { isPlatformAdmin } = await import("@/lib/auth/platform-admin");
  if (!(await isPlatformAdmin())) throw new Error("Not authorized — admin only.");
}

export interface EmailDnsRecord { type: string; name: string; value: string; status: string }
export interface EmailSettingsView { sender_name: string; sender_email: string; esp_provider: string; status: string; dns_records_required: EmailDnsRecord[]; hasSecret: boolean }

/** The DNS records a domain needs to send email through Resend (SPF + DMARC; DKIM comes from
 *  Resend after the domain is added there). Pure helper. */
function emailDnsFor(senderEmail: string): EmailDnsRecord[] {
  const domain = (senderEmail.split("@")[1] || "").toLowerCase();
  if (!domain) return [];
  return [
    { type: "TXT", name: domain, value: "v=spf1 include:_spf.resend.com ~all", status: "pending" },
    { type: "TXT", name: `_dmarc.${domain}`, value: "v=DMARC1; p=none; rua=mailto:dmarc@" + domain, status: "pending" },
    { type: "CNAME", name: `resend._domainkey.${domain}`, value: "(DKIM — copy the exact value Resend shows after you add this domain)", status: "pending" },
  ];
}

export async function getEmailSettings(tenantId: string): Promise<EmailSettingsView | null> {
  await requireTenantAccess(tenantId);
  const supabase = createSupabaseServiceClient();
  const [{ data: row }, { data: sec }] = await Promise.all([
    supabase.from("tenant_email_settings").select("sender_name, sender_email, esp_provider, status, dns_records_required").eq("tenant_id", tenantId).maybeSingle(),
    supabase.from("tenant_secrets").select("provider").eq("tenant_id", tenantId).eq("provider", "resend").maybeSingle(),
  ]);
  if (!row) return null;
  return { ...row, dns_records_required: (row.dns_records_required ?? []) as EmailDnsRecord[], hasSecret: !!sec } as EmailSettingsView;
}

export async function saveEmailSettings(
  tenantId: string, input: { sender_name: string; sender_email: string; esp_provider?: string; apiKey?: string }
): Promise<{ ok: boolean; records?: EmailDnsRecord[]; message?: string }> {
  await requireTenantAccess(tenantId);
  try { await requireAdminWrite(); } catch (e: any) { return { ok: false, message: e?.message }; }
  const sender_email = (input.sender_email || "").trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(sender_email)) return { ok: false, message: "Enter a valid sender email." };
  const esp_provider = input.esp_provider || "resend";
  const records = emailDnsFor(sender_email);
  try {
    const supabase = createSupabaseServiceClient();
    await supabase.from("tenant_email_settings").upsert(
      { tenant_id: tenantId, sender_name: input.sender_name || sender_email, sender_email, esp_provider, status: "pending_verification", dns_records_required: records, updated_at: new Date().toISOString() },
      { onConflict: "tenant_id,sender_email" }
    );
    if (input.apiKey && input.apiKey.trim()) {
      const { encryptionReady } = await import("@/lib/server/encryption");
      if (!encryptionReady()) return { ok: false, message: "Set SETTINGS_ENCRYPTION_KEY to store the ESP API key." };
      const { setIntegrationSecret } = await import("@/lib/server/integrations");
      await setIntegrationSecret(tenantId, esp_provider, { api_key: input.apiKey.trim() });
      await supabase.from("tenant_integrations").upsert(
        { tenant_id: tenantId, provider: esp_provider, status: "connected", config: { kind: "email", sender_email }, updated_at: new Date().toISOString() },
        { onConflict: "tenant_id,provider" }
      );
    }
    const { logPlatformEvent } = await import("@/lib/audit/platform-audit");
    const { getCurrentUserEmail } = await import("@/lib/auth/platform-admin");
    await logPlatformEvent({ action: "email.save_settings", actorEmail: await getCurrentUserEmail(), meta: { tenantId, sender_email, esp_provider } });
    return { ok: true, records };
  } catch (e: any) { return { ok: false, message: e?.message ?? "Could not save email settings." }; }
}

/** Verify SPF + DMARC for the sender domain via public DoH; update status. */
export async function verifyEmailDns(tenantId: string): Promise<{ ok: boolean; status: string; records: EmailDnsRecord[] }> {
  await requireTenantAccess(tenantId);
  const supabase = createSupabaseServiceClient();
  const { data: row } = await supabase.from("tenant_email_settings").select("sender_email, dns_records_required").eq("tenant_id", tenantId).maybeSingle();
  if (!row) return { ok: false, status: "failed", records: [] };
  const recs = (row.dns_records_required ?? []) as EmailDnsRecord[];
  const checked = await Promise.all(recs.map(async (r) => {
    // DKIM (CNAME): verify the record EXISTS (its target is the ESP's value, which varies) —
    // empty `expected` matches any present answer. SPF/DMARC (TXT): match the policy prefix.
    if (r.type === "CNAME") return { ...r, status: (await verifyDnsRecord(r.name, "CNAME", "")) ? "verified" : "pending" };
    const key = r.name.startsWith("_dmarc") ? "v=dmarc1" : "v=spf1";
    return { ...r, status: (await verifyDnsRecord(r.name, "TXT", key)) ? "verified" : "pending" };
  }));
  const allOk = checked.every((r) => r.status === "verified");
  const status = allOk ? "verified" : "pending_verification";
  await supabase.from("tenant_email_settings").update({ status, dns_records_required: checked, updated_at: new Date().toISOString() }).eq("tenant_id", tenantId);
  return { ok: allOk, status, records: checked };
}
