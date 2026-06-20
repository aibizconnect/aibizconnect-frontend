"use server";

import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { requireTenantAccess } from "@/lib/auth/tenant-access";
import { verifyDnsRecord, cloudflareReady, isInPlatformZone, createTxtRecord, createCname, listRecords } from "@/lib/server/cloudflare";

async function requireAdminWrite(): Promise<void> {
  const { isPlatformAdmin } = await import("@/lib/auth/platform-admin");
  if (!(await isPlatformAdmin())) throw new Error("Not authorized — admin only.");
}

export interface EmailDnsRecord { type: string; name: string; value: string; status: string }
export interface EmailSettingsView { sender_name: string; sender_email: string; esp_provider: string; status: string; dns_records_required: EmailDnsRecord[]; hasSecret: boolean; cloudflareManaged: boolean }

/** The DNS records a domain needs to send email through Resend (SPF + DMARC; DKIM comes from
 *  Resend after the domain is added there). Pure helper. */
function emailDnsFor(senderEmail: string): EmailDnsRecord[] {
  const domain = (senderEmail.split("@")[1] || "").toLowerCase();
  if (!domain) return [];
  return [
    { type: "TXT", name: domain, value: "v=spf1 include:_spf.resend.com ~all", status: "pending" },
    { type: "TXT", name: `_dmarc.${domain}`, value: "v=DMARC1; p=none; rua=mailto:dmarc@" + domain, status: "pending" },
    { type: "TXT", name: `resend._domainkey.${domain}`, value: "(DKIM — paste the TXT value Resend's Records tab shows, e.g. p=MIGfMA0GCSq…)", status: "pending" },
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
  // Can WE fix the DNS for them? Only when the sender domain is in a platform Cloudflare zone
  // AND Cloudflare is connected (Ali: help people fix their DNS when we have Cloudflare access).
  const domain = (((row as any).sender_email as string)?.split("@")[1] || "").toLowerCase();
  let cloudflareManaged = false;
  try { cloudflareManaged = !!domain && isInPlatformZone(domain) && (await cloudflareReady()); } catch { /* ignore */ }
  return { ...row, dns_records_required: (row.dns_records_required ?? []) as EmailDnsRecord[], hasSecret: !!sec, cloudflareManaged } as EmailSettingsView;
}

/**
 * Auto-create the email DNS records on the platform Cloudflare zone (Ali: "when we have access to
 * Cloudflare, help people fix their DNS"). Only for sender domains inside our zone (isInPlatformZone)
 * and only records with REAL values — the DKIM CNAME value is provided by Resend and is skipped until
 * the tenant pastes it. Dedups (a duplicate SPF record breaks email).
 */
export async function autoFixEmailDnsOnCloudflare(
  tenantId: string
): Promise<{ ok: boolean; added: string[]; skipped: string[]; message?: string }> {
  await requireTenantAccess(tenantId);
  if (!(await cloudflareReady())) return { ok: false, added: [], skipped: [], message: "Cloudflare isn't connected on this platform yet." };
  const supabase = createSupabaseServiceClient();
  const { data: row } = await supabase.from("tenant_email_settings").select("sender_email, dns_records_required").eq("tenant_id", tenantId).maybeSingle();
  if (!row) return { ok: false, added: [], skipped: [], message: "Save your email settings first." };
  const recs = (row.dns_records_required ?? []) as EmailDnsRecord[];
  const added: string[] = [];
  const skipped: string[] = [];
  for (const r of recs) {
    const isPlaceholder = r.value.trim().startsWith("(");
    if (!isInPlatformZone(r.name)) { skipped.push(`${r.name} — not on our Cloudflare; add it at your DNS host`); continue; }
    if (isPlaceholder) { skipped.push(`${r.name} — DKIM value comes from Resend (see the ⓘ), then re-run`); continue; }
    const existing = await listRecords(r.name).catch(() => []);
    if (existing.some((x) => x.type === r.type && x.content.replace(/^"|"$/g, "") === r.value)) { skipped.push(`${r.name} — already present`); continue; }
    const res = r.type === "CNAME" ? await createCname(r.name, r.value, false) : await createTxtRecord(r.name, r.value);
    if (res.ok) added.push(r.name); else skipped.push(`${r.name} — ${res.error ?? "failed"}`);
  }
  return {
    ok: added.length > 0,
    added,
    skipped,
    message: added.length ? `Added ${added.length} record${added.length > 1 ? "s" : ""} to Cloudflare. Click “Verify DNS” in a minute.` : "Nothing was added automatically — follow the steps in the ⓘ on each record.",
  };
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
    // DKIM (TXT public key at resend._domainkey): just verify the record EXISTS — its value (p=…)
    // is generated by Resend and varies, so empty `expected` matches any present answer.
    if (/_domainkey/i.test(r.name)) return { ...r, status: (await verifyDnsRecord(r.name, (r.type === "CNAME" ? "CNAME" : "TXT"), "")) ? "verified" : "pending" };
    if (r.type === "CNAME") return { ...r, status: (await verifyDnsRecord(r.name, "CNAME", "")) ? "verified" : "pending" };
    // SPF/DMARC (TXT): match the policy prefix.
    const key = r.name.startsWith("_dmarc") ? "v=dmarc1" : "v=spf1";
    return { ...r, status: (await verifyDnsRecord(r.name, "TXT", key)) ? "verified" : "pending" };
  }));
  const allOk = checked.every((r) => r.status === "verified");
  const status = allOk ? "verified" : "pending_verification";
  await supabase.from("tenant_email_settings").update({ status, dns_records_required: checked, updated_at: new Date().toISOString() }).eq("tenant_id", tenantId);
  return { ok: allOk, status, records: checked };
}
