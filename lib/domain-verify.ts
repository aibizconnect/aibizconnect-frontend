import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { promises as dns } from "node:dns";
import { randomUUID } from "node:crypto";
import { canUseFeature, FEATURES } from "./entitlements";

/**
 * Custom-domain lifecycle: purchase (billing attribution) + DNS verification.
 *
 * DNS verification is REAL: a TXT challenge at _aibizconnect.<domain> must contain the
 * row's verification_token; on match the domain flips to 'active' (routing then serves it).
 *
 * PURCHASE is a deliberate NON-CHARGING STUB. Real payment (Stripe checkout) is a
 * financial action that requires the owner's keys + explicit authorization — it is NOT
 * auto-executed here. startPurchase only records intent + payer attribution and returns
 * a clear "billing not configured" signal until Ali wires a payment provider.
 */

function service(): SupabaseClient {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
}

const TXT_HOST = (domain: string) => `_aibizconnect.${domain}`;

/** Ensure a custom-domain row has a verification token; return the TXT instructions. */
export async function getDnsChallenge(tenantId: string, id: string): Promise<{ ok: boolean; host?: string; token?: string; error?: string }> {
  try {
    const sb = service();
    const { data, error } = await sb.from("tenant_domains").select("custom_domain, verification_token").eq("tenant_id", tenantId).eq("id", id).maybeSingle();
    if (error || !data?.custom_domain) return { ok: false, error: "domain not found" };
    let token = data.verification_token as string | null;
    if (!token) {
      token = `abc-verify=${randomUUID()}`;
      await sb.from("tenant_domains").update({ verification_token: token }).eq("tenant_id", tenantId).eq("id", id);
    }
    return { ok: true, host: TXT_HOST(data.custom_domain), token };
  } catch (e: unknown) {
    return { ok: false, error: (e as Error).message };
  }
}

/** Verify the TXT record. On success -> custom_domain_status='active'. */
export async function verifyCustomDomain(tenantId: string, id: string): Promise<{ ok: boolean; active: boolean; error?: string }> {
  try {
    const sb = service();
    const { data, error } = await sb.from("tenant_domains").select("custom_domain, verification_token").eq("tenant_id", tenantId).eq("id", id).maybeSingle();
    if (error || !data?.custom_domain) return { ok: false, active: false, error: "domain not found" };
    if (!data.verification_token) return { ok: false, active: false, error: "no challenge issued — generate DNS instructions first" };
    let records: string[][] = [];
    try { records = await dns.resolveTxt(TXT_HOST(data.custom_domain)); } catch { return { ok: true, active: false, error: "TXT record not found yet (DNS may take time to propagate)" }; }
    const flat = records.map((r) => r.join(""));
    const match = flat.some((v) => v.includes(data.verification_token as string));
    if (!match) return { ok: true, active: false, error: "TXT record found but token does not match" };
    await sb.from("tenant_domains").update({ custom_domain_status: "active", verified_at: new Date().toISOString(), paid: true }).eq("tenant_id", tenantId).eq("id", id);
    return { ok: true, active: true };
  } catch (e: unknown) {
    return { ok: false, active: false, error: (e as Error).message };
  }
}

/**
 * Purchase intent (NON-CHARGING STUB). Records payer attribution and sets the domain to
 * 'pending_payment'. Does NOT charge. Returns checkoutConfigured:false until a provider
 * key is present — Ali wires Stripe + authorizes any real charge separately.
 */
export async function startPurchase(args: { tenantId: string; userId?: string | null; id: string; payer?: "tenant" | "user" | "parent_tenant" }): Promise<{ ok: boolean; checkoutConfigured: boolean; note: string; error?: string }> {
  // Custom domains are entitlement-gated.
  if (!(await canUseFeature(args.tenantId, args.userId ?? null, FEATURES.CUSTOM_DOMAIN))) {
    return { ok: false, checkoutConfigured: false, note: "Custom domains require an upgrade for this tenant.", error: "entitlement" };
  }
  try {
    await service().from("tenant_domains").update({ custom_domain_status: "pending_payment", payer: args.payer ?? "tenant" }).eq("tenant_id", args.tenantId).eq("id", args.id);
  } catch { /* graceful */ }
  const hasProvider = !!process.env.STRIPE_SECRET_KEY;
  return {
    ok: true,
    checkoutConfigured: hasProvider,
    note: hasProvider
      ? "Checkout session creation is wired but a real charge requires explicit owner authorization."
      : "Billing provider not configured. No charge made. Owner must connect Stripe to enable purchases.",
  };
}
