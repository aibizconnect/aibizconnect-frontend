"use server";

import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { requireTenantAccess } from "@/lib/auth/tenant-access";
import { setIntegrationSecret, deleteIntegrationSecret } from "@/lib/server/integrations";

/**
 * Client-facing integration + settings actions. These NEVER return secret values — only the
 * non-secret config + a `hasSecret` flag. Storing a secret encrypts it server-side. Every
 * sensitive change is audited. Tenant-scoped via requireTenantAccess.
 */

export interface IntegrationView { provider: string; status: string; config: Record<string, unknown>; hasSecret: boolean }

/** Sensitive writes (credentials, settings) require an admin/superadmin role, not just tenant
 *  membership. Tenant-owner roles will be honored here once the tenant-role model lands. */
async function requireAdminWrite(): Promise<void> {
  const { isPlatformAdmin } = await import("@/lib/auth/platform-admin");
  if (!(await isPlatformAdmin())) throw new Error("Not authorized — admin only.");
}

export async function listIntegrations(tenantId: string): Promise<IntegrationView[]> {
  await requireTenantAccess(tenantId);
  const supabase = createSupabaseServiceClient();
  const [{ data: ints }, { data: secs }] = await Promise.all([
    supabase.from("tenant_integrations").select("provider, status, config").eq("tenant_id", tenantId),
    supabase.from("tenant_secrets").select("provider").eq("tenant_id", tenantId),
  ]);
  const withSecret = new Set((secs ?? []).map((s: any) => s.provider));
  return (ints ?? []).map((i: any) => ({ provider: i.provider, status: i.status, config: i.config ?? {}, hasSecret: withSecret.has(i.provider) }));
}

export async function saveIntegration(
  tenantId: string, provider: string, config: Record<string, unknown>, secret?: Record<string, unknown>
): Promise<{ ok: boolean; message?: string }> {
  await requireTenantAccess(tenantId);
  try { await requireAdminWrite(); } catch (e: any) { return { ok: false, message: e?.message }; }
  const hasSecret = !!secret && Object.keys(secret).length > 0;
  try {
    if (hasSecret) {
      const { encryptionReady } = await import("@/lib/server/encryption");
      if (!encryptionReady()) return { ok: false, message: "Set SETTINGS_ENCRYPTION_KEY (32 bytes) to store credentials securely." };
    }
    const supabase = createSupabaseServiceClient();
    await supabase.from("tenant_integrations").upsert(
      { tenant_id: tenantId, provider, status: hasSecret ? "connected" : "pending", config: config ?? {}, updated_at: new Date().toISOString() },
      { onConflict: "tenant_id,provider" }
    );
    if (hasSecret) await setIntegrationSecret(tenantId, provider, secret!);
    const { logPlatformEvent } = await import("@/lib/audit/platform-audit");
    const { getCurrentUserEmail } = await import("@/lib/auth/platform-admin");
    await logPlatformEvent({ action: "integration.save", actorEmail: await getCurrentUserEmail(), meta: { tenantId, provider, hasSecret } });
    return { ok: true };
  } catch (e: any) { return { ok: false, message: e?.message ?? "Could not save integration." }; }
}

export async function disconnectIntegration(tenantId: string, provider: string): Promise<void> {
  await requireTenantAccess(tenantId);
  await requireAdminWrite();
  const supabase = createSupabaseServiceClient();
  await supabase.from("tenant_integrations").update({ status: "disconnected", updated_at: new Date().toISOString() }).eq("tenant_id", tenantId).eq("provider", provider);
  await deleteIntegrationSecret(tenantId, provider);
  const { logPlatformEvent } = await import("@/lib/audit/platform-audit");
  const { getCurrentUserEmail } = await import("@/lib/auth/platform-admin");
  await logPlatformEvent({ action: "integration.disconnect", actorEmail: await getCurrentUserEmail(), meta: { tenantId, provider } });
}

export async function getTenantSettings(tenantId: string): Promise<Record<string, unknown>> {
  await requireTenantAccess(tenantId);
  const supabase = createSupabaseServiceClient();
  const { data } = await supabase.from("tenant_settings").select("setting_key, setting_value").eq("tenant_id", tenantId);
  const out: Record<string, unknown> = {};
  for (const r of (data ?? []) as any[]) out[r.setting_key] = r.setting_value;
  return out;
}

export async function setTenantSetting(tenantId: string, key: string, value: unknown): Promise<void> {
  await requireTenantAccess(tenantId);
  await requireAdminWrite();
  const supabase = createSupabaseServiceClient();
  await supabase.from("tenant_settings").upsert(
    { tenant_id: tenantId, setting_key: key, setting_value: value, updated_at: new Date().toISOString() },
    { onConflict: "tenant_id,setting_key" }
  );
}
