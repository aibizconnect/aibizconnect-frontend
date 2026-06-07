"use server";

import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { requireTenantAccess } from "@/lib/auth/tenant-access";
import { setIntegrationSecret, getIntegrationSecret, deleteIntegrationSecret } from "@/lib/server/integrations";
import { testTwilioConnection, isE164 } from "@/lib/server/twilio";

async function requireAdminWrite(): Promise<void> {
  const { isPlatformAdmin } = await import("@/lib/auth/platform-admin");
  if (!(await isPlatformAdmin())) throw new Error("Not authorized — admin only.");
}
async function audit(action: string, meta: Record<string, unknown>) {
  try {
    const { logPlatformEvent } = await import("@/lib/audit/platform-audit");
    const { getCurrentUserEmail } = await import("@/lib/auth/platform-admin");
    await logPlatformEvent({ action, actorEmail: await getCurrentUserEmail(), meta });
  } catch { /* best effort */ }
}

export interface TwilioSettingsView {
  status: string; account_sid: string; messaging_service_sid: string; from_number: string;
  status_callback_url: string; hasSecret: boolean;
}

/** Non-secret Twilio settings (+ hasSecret). NEVER returns the auth token. */
export async function getTwilioSettings(tenantId: string): Promise<TwilioSettingsView> {
  await requireTenantAccess(tenantId);
  const supabase = createSupabaseServiceClient();
  const [{ data: integ }, { data: sec }] = await Promise.all([
    supabase.from("tenant_integrations").select("status, config").eq("tenant_id", tenantId).eq("provider", "twilio").maybeSingle(),
    supabase.from("tenant_secrets").select("provider").eq("tenant_id", tenantId).eq("provider", "twilio").maybeSingle(),
  ]);
  const cfg = (integ?.config as Record<string, any>) ?? {};
  return {
    status: integ?.status ?? "disconnected",
    account_sid: cfg.account_sid ?? "",
    messaging_service_sid: cfg.messaging_service_sid ?? "",
    from_number: cfg.from_number ?? "",
    status_callback_url: cfg.status_callback_url ?? "",
    hasSecret: !!sec,
  };
}

export async function saveTwilioSettings(
  tenantId: string,
  input: { account_sid: string; auth_token?: string; messaging_service_sid?: string; from_number?: string }
): Promise<{ ok: boolean; status?: string; message?: string }> {
  await requireTenantAccess(tenantId);
  try { await requireAdminWrite(); } catch (e: any) { return { ok: false, message: e?.message }; }

  const account_sid = (input.account_sid || "").trim();
  if (!/^AC[0-9a-zA-Z]{30,}$/.test(account_sid)) return { ok: false, message: "Enter a valid Account SID (starts with AC)." };
  const from_number = (input.from_number || "").trim();
  if (from_number && !isE164(from_number)) return { ok: false, message: "From number must be E.164 (e.g. +14165551234)." };

  try {
    const supabase = createSupabaseServiceClient();
    // Encrypt the secret. If no new token provided, keep the existing one (token edits are optional).
    let auth_token = (input.auth_token || "").trim();
    if (!auth_token) {
      const existing = await getIntegrationSecret(tenantId, "twilio");
      if (!existing?.auth_token) return { ok: false, message: "Enter the Auth Token to connect." };
      auth_token = String(existing.auth_token);
    } else {
      const { encryptionReady } = await import("@/lib/server/encryption");
      if (!encryptionReady()) return { ok: false, message: "Set SETTINGS_ENCRYPTION_KEY to store credentials securely." };
    }
    await setIntegrationSecret(tenantId, "twilio", { account_sid, auth_token });

    const config = {
      account_sid,
      messaging_service_sid: (input.messaging_service_sid || "").trim() || undefined,
      from_number: from_number || undefined,
    };
    await supabase.from("tenant_integrations").upsert(
      { tenant_id: tenantId, provider: "twilio", status: "pending", config, updated_at: new Date().toISOString() },
      { onConflict: "tenant_id,provider" }
    );

    // Verify credentials with a real (non-sending) API call, then reflect the result.
    const test = await testTwilioConnection(tenantId);
    const status = test.ok ? "connected" : "error";
    await supabase.from("tenant_integrations").update({ status, updated_at: new Date().toISOString() }).eq("tenant_id", tenantId).eq("provider", "twilio");
    await audit("twilio.save", { tenantId, status, hasToken: !!input.auth_token });
    return test.ok ? { ok: true, status } : { ok: false, status, message: test.error || "Could not verify Twilio credentials." };
  } catch (e: any) { return { ok: false, message: e?.message ?? "Could not save Twilio settings." }; }
}

export async function testTwilio(tenantId: string): Promise<{ ok: boolean; message?: string }> {
  await requireTenantAccess(tenantId);
  try { await requireAdminWrite(); } catch (e: any) { return { ok: false, message: e?.message }; }
  const test = await testTwilioConnection(tenantId);
  const supabase = createSupabaseServiceClient();
  await supabase.from("tenant_integrations").update({ status: test.ok ? "connected" : "error", updated_at: new Date().toISOString() }).eq("tenant_id", tenantId).eq("provider", "twilio");
  await audit("twilio.test", { tenantId, ok: test.ok });
  return test.ok ? { ok: true, message: test.friendlyName ? `Connected: ${test.friendlyName}` : "Connected." } : { ok: false, message: test.error };
}

export async function disconnectTwilio(tenantId: string): Promise<{ ok: boolean; message?: string }> {
  await requireTenantAccess(tenantId);
  try { await requireAdminWrite(); } catch (e: any) { return { ok: false, message: e?.message }; }
  const supabase = createSupabaseServiceClient();
  await deleteIntegrationSecret(tenantId, "twilio");
  await supabase.from("tenant_integrations").update({ status: "disconnected", updated_at: new Date().toISOString() }).eq("tenant_id", tenantId).eq("provider", "twilio");
  await audit("twilio.disconnect", { tenantId });
  return { ok: true };
}
