"use server";

import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { requireTenantAccess } from "@/lib/auth/tenant-access";
import { setIntegrationSecret, getIntegrationSecret, deleteIntegrationSecret } from "@/lib/server/integrations";
import { testStripe, stripeIsLiveKey, testPaypal } from "@/lib/server/payments";

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

export interface PaymentProviderView {
  status: string; config: Record<string, any>; hasSecret: boolean;
}
export interface PaymentsView { stripe: PaymentProviderView; paypal: PaymentProviderView }

async function providerView(tenantId: string, provider: string): Promise<PaymentProviderView> {
  const supabase = createSupabaseServiceClient();
  const [{ data: integ }, { data: sec }] = await Promise.all([
    supabase.from("tenant_integrations").select("status, config").eq("tenant_id", tenantId).eq("provider", provider).maybeSingle(),
    supabase.from("tenant_secrets").select("provider").eq("tenant_id", tenantId).eq("provider", provider).maybeSingle(),
  ]);
  return { status: integ?.status ?? "disconnected", config: (integ?.config as Record<string, any>) ?? {}, hasSecret: !!sec };
}

/** Non-secret payment settings (+ hasSecret). NEVER returns secret_key / client_secret. */
export async function getPaymentsSettings(tenantId: string): Promise<PaymentsView> {
  await requireTenantAccess(tenantId);
  const [stripe, paypal] = await Promise.all([providerView(tenantId, "stripe"), providerView(tenantId, "paypal")]);
  return { stripe, paypal };
}

export async function saveStripe(
  tenantId: string, input: { secret_key?: string; publishable_key?: string }
): Promise<{ ok: boolean; status?: string; livemode?: boolean; message?: string }> {
  await requireTenantAccess(tenantId);
  try { await requireAdminWrite(); } catch (e: any) { return { ok: false, message: e?.message }; }
  const pub = (input.publishable_key || "").trim();
  if (pub && !/^pk_(live|test)_/.test(pub)) return { ok: false, message: "Publishable key must start with pk_live_ or pk_test_." };

  try {
    let secret_key = (input.secret_key || "").trim();
    if (secret_key) {
      if (!/^(sk|rk)_(live|test)_/.test(secret_key)) return { ok: false, message: "Secret key must start with sk_ or rk_ (restricted key)." };
      const { encryptionReady } = await import("@/lib/server/encryption");
      if (!encryptionReady()) return { ok: false, message: "Set SETTINGS_ENCRYPTION_KEY to store credentials securely." };
      await setIntegrationSecret(tenantId, "stripe", { secret_key });
    } else {
      const existing = await getIntegrationSecret(tenantId, "stripe");
      if (!existing?.secret_key) return { ok: false, message: "Enter your Stripe secret key to connect." };
      secret_key = String(existing.secret_key);
    }
    const livemode = stripeIsLiveKey(secret_key);
    const supabase = createSupabaseServiceClient();
    await supabase.from("tenant_integrations").upsert(
      { tenant_id: tenantId, provider: "stripe", status: "pending", config: { publishable_key: pub || undefined, livemode }, updated_at: new Date().toISOString() },
      { onConflict: "tenant_id,provider" }
    );
    const test = await testStripe(tenantId);
    const status = test.ok ? "connected" : "error";
    await supabase.from("tenant_integrations").update({
      status, config: { publishable_key: pub || undefined, livemode, account_id: test.accountId, display_name: test.displayName, charges_enabled: test.chargesEnabled }, updated_at: new Date().toISOString(),
    }).eq("tenant_id", tenantId).eq("provider", "stripe");
    await audit("payments.save_stripe", { tenantId, status, livemode });
    return test.ok ? { ok: true, status, livemode } : { ok: false, status, livemode, message: test.error || "Could not verify Stripe key." };
  } catch (e: any) { return { ok: false, message: e?.message ?? "Could not save Stripe settings." }; }
}

export async function savePaypal(
  tenantId: string, input: { client_id: string; client_secret?: string; environment: "live" | "sandbox" }
): Promise<{ ok: boolean; status?: string; message?: string }> {
  await requireTenantAccess(tenantId);
  try { await requireAdminWrite(); } catch (e: any) { return { ok: false, message: e?.message }; }
  const client_id = (input.client_id || "").trim();
  if (!client_id) return { ok: false, message: "Enter your PayPal client ID." };
  const environment = input.environment === "live" ? "live" : "sandbox";

  try {
    let client_secret = (input.client_secret || "").trim();
    if (client_secret) {
      const { encryptionReady } = await import("@/lib/server/encryption");
      if (!encryptionReady()) return { ok: false, message: "Set SETTINGS_ENCRYPTION_KEY to store credentials securely." };
      await setIntegrationSecret(tenantId, "paypal", { client_id, client_secret });
    } else {
      const existing = await getIntegrationSecret(tenantId, "paypal");
      if (!existing?.client_secret) return { ok: false, message: "Enter your PayPal secret to connect." };
      client_secret = String(existing.client_secret);
      await setIntegrationSecret(tenantId, "paypal", { client_id, client_secret });
    }
    const supabase = createSupabaseServiceClient();
    await supabase.from("tenant_integrations").upsert(
      { tenant_id: tenantId, provider: "paypal", status: "pending", config: { environment }, updated_at: new Date().toISOString() },
      { onConflict: "tenant_id,provider" }
    );
    const test = await testPaypal(tenantId);
    const status = test.ok ? "connected" : "error";
    await supabase.from("tenant_integrations").update({ status, config: { environment }, updated_at: new Date().toISOString() }).eq("tenant_id", tenantId).eq("provider", "paypal");
    await audit("payments.save_paypal", { tenantId, status, environment });
    return test.ok ? { ok: true, status } : { ok: false, status, message: test.error || "Could not verify PayPal credentials." };
  } catch (e: any) { return { ok: false, message: e?.message ?? "Could not save PayPal settings." }; }
}

export async function testPayments(tenantId: string, provider: "stripe" | "paypal"): Promise<{ ok: boolean; message?: string }> {
  await requireTenantAccess(tenantId);
  try { await requireAdminWrite(); } catch (e: any) { return { ok: false, message: e?.message }; }
  const test = provider === "stripe" ? await testStripe(tenantId) : await testPaypal(tenantId);
  const supabase = createSupabaseServiceClient();
  await supabase.from("tenant_integrations").update({ status: test.ok ? "connected" : "error", updated_at: new Date().toISOString() }).eq("tenant_id", tenantId).eq("provider", provider);
  await audit("payments.test", { tenantId, provider, ok: test.ok });
  return test.ok ? { ok: true, message: "Verified ✓" } : { ok: false, message: test.error };
}

export async function disconnectPayment(tenantId: string, provider: "stripe" | "paypal"): Promise<{ ok: boolean; message?: string }> {
  await requireTenantAccess(tenantId);
  try { await requireAdminWrite(); } catch (e: any) { return { ok: false, message: e?.message }; }
  const supabase = createSupabaseServiceClient();
  await deleteIntegrationSecret(tenantId, provider);
  await supabase.from("tenant_integrations").update({ status: "disconnected", updated_at: new Date().toISOString() }).eq("tenant_id", tenantId).eq("provider", provider);
  await audit("payments.disconnect", { tenantId, provider });
  return { ok: true };
}
