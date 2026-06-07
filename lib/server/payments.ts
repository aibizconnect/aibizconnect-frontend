import { getIntegrationSecret } from "./integrations";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

/**
 * Server-only Payments client (NOT "use server"). VERIFY-ONLY by design: this module can read a
 * tenant's encrypted Stripe/PayPal credentials and CHECK that they are valid — it deliberately
 * contains NO function that charges, refunds, pays out, or transfers money. That absence is the
 * safety guarantee (PAY-V14) and matches the platform's prohibited-actions rule. Secrets are
 * decrypted ONLY here and NEVER returned to a client.
 */

// ---------- Stripe ----------
export interface StripeCreds { secret_key: string }

export async function getStripeCreds(tenantId: string): Promise<StripeCreds | null> {
  const s = await getIntegrationSecret(tenantId, "stripe");
  if (s?.secret_key) return { secret_key: String(s.secret_key) };
  return null;
}
export async function stripeReady(tenantId: string): Promise<boolean> { return !!(await getStripeCreds(tenantId)); }

export function stripeIsLiveKey(secretKey: string): boolean { return secretKey.trim().startsWith("sk_live_"); }

/** Validate Stripe credentials via the non-charging GET /v1/account. */
export async function testStripe(tenantId: string): Promise<{ ok: boolean; accountId?: string; displayName?: string; chargesEnabled?: boolean; error?: string }> {
  const creds = await getStripeCreds(tenantId);
  if (!creds) return { ok: false, error: "Stripe is not configured." };
  try {
    const res = await fetch("https://api.stripe.com/v1/account", { headers: { Authorization: `Bearer ${creds.secret_key}` } });
    const json: any = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: json?.error?.message || `Stripe ${res.status}` };
    return { ok: true, accountId: json?.id, displayName: json?.business_profile?.name || json?.settings?.dashboard?.display_name, chargesEnabled: !!json?.charges_enabled };
  } catch (e: any) { return { ok: false, error: e?.message ?? "Stripe request failed." }; }
}

// ---------- PayPal ----------
export interface PaypalCreds { client_id: string; client_secret: string }

export async function getPaypalCreds(tenantId: string): Promise<PaypalCreds | null> {
  const s = await getIntegrationSecret(tenantId, "paypal");
  if (s?.client_id && s?.client_secret) return { client_id: String(s.client_id), client_secret: String(s.client_secret) };
  return null;
}
export async function paypalReady(tenantId: string): Promise<boolean> { return !!(await getPaypalCreds(tenantId)); }

async function paypalEnvironment(tenantId: string): Promise<"live" | "sandbox"> {
  const supabase = createSupabaseServiceClient();
  const { data } = await supabase.from("tenant_integrations").select("config").eq("tenant_id", tenantId).eq("provider", "paypal").maybeSingle();
  return (data?.config as any)?.environment === "live" ? "live" : "sandbox";
}
export function paypalBaseUrl(env: "live" | "sandbox"): string {
  return env === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
}

/** Validate PayPal credentials by requesting a client-credentials access token (non-charging). */
export async function testPaypal(tenantId: string): Promise<{ ok: boolean; appId?: string; error?: string }> {
  const creds = await getPaypalCreds(tenantId);
  if (!creds) return { ok: false, error: "PayPal is not configured." };
  const env = await paypalEnvironment(tenantId);
  try {
    const auth = Buffer.from(`${creds.client_id}:${creds.client_secret}`).toString("base64");
    const res = await fetch(`${paypalBaseUrl(env)}/v1/oauth2/token`, {
      method: "POST",
      headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
      body: "grant_type=client_credentials",
    });
    const json: any = await res.json().catch(() => ({}));
    if (!res.ok || !json?.access_token) return { ok: false, error: json?.error_description || json?.error || `PayPal ${res.status}` };
    return { ok: true, appId: json?.app_id };
  } catch (e: any) { return { ok: false, error: e?.message ?? "PayPal request failed." }; }
}
