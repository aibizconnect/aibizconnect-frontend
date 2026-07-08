import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { getMarketplaceItem } from "./catalog";
import { platformStripeKey, appBase } from "@/lib/server/platform-stripe";

/**
 * Marketplace checkout — platform-side Stripe for selling add-on SUBSCRIPTIONS to a tenant.
 * Mirrors lib/server/store.ts (raw fetch, verify-on-return, idempotent by stripe_session_id)
 * but uses the PLATFORM key and mode=subscription. All writes degrade gracefully until the
 * 0085 DDL is applied. Success/error are surfaced explicitly ({ ok, error }) — never silently
 * swallowed on the purchase path.
 */

const svc = () => createSupabaseServiceClient();

/** Begin an add-on subscription: a Stripe Checkout session (platform account). */
export async function startAddonCheckout(tenantId: string, itemKey: string): Promise<{ ok: boolean; url?: string; error?: string }> {
  const item = getMarketplaceItem(itemKey);
  if (!item) return { ok: false, error: "Unknown add-on." };
  if (item.status === "soon") return { ok: false, error: "This add-on isn't available yet — coming soon." };
  if (item.priceCents <= 0) return { ok: false, error: "This add-on has no price set." };
  const key = platformStripeKey();
  if (!key) return { ok: false, error: "Marketplace checkout isn't enabled yet." };

  const params = new URLSearchParams();
  params.set("mode", "subscription");
  params.set("success_url", `${appBase()}/tenants/${tenantId}/marketplace/success?cs={CHECKOUT_SESSION_ID}`);
  params.set("cancel_url", `${appBase()}/tenants/${tenantId}/marketplace`);
  params.set("metadata[tenant_id]", tenantId);
  params.set("metadata[item_key]", itemKey);
  params.set("subscription_data[metadata][tenant_id]", tenantId);
  params.set("subscription_data[metadata][item_key]", itemKey);
  params.set("line_items[0][quantity]", "1");
  params.set("line_items[0][price_data][currency]", "usd");
  params.set("line_items[0][price_data][unit_amount]", String(item.priceCents));
  params.set("line_items[0][price_data][recurring][interval]", item.interval);
  params.set("line_items[0][price_data][product_data][name]", item.name);
  if (item.blurb) params.set("line_items[0][price_data][product_data][description]", item.blurb.slice(0, 500));

  try {
    const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });
    const json: any = await res.json().catch(() => ({}));
    if (!res.ok || !json?.url) return { ok: false, error: json?.error?.message || `Stripe ${res.status}` };
    return { ok: true, url: json.url };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "Stripe request failed." };
  }
}

/** Verify a returned session is paid, then upsert the add-on as active. Idempotent. */
export async function confirmAddonPurchase(tenantId: string, sessionId: string): Promise<{ ok: boolean; itemName?: string; error?: string }> {
  const key = platformStripeKey();
  if (!key) return { ok: false, error: "Marketplace checkout isn't enabled yet." };
  const sb = svc();

  // Idempotency: already recorded this session?
  try {
    const existing = await sb.from("marketplace_purchases").select("item_key").eq("tenant_id", tenantId).eq("stripe_session_id", sessionId).maybeSingle();
    if (existing.data) { const it = getMarketplaceItem(existing.data.item_key); return { ok: true, itemName: it?.name ?? "your add-on" }; }
  } catch { /* table may not exist yet — fall through to verify + upsert */ }

  try {
    const res = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`, { headers: { Authorization: `Bearer ${key}` } });
    const s: any = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: s?.error?.message || `Stripe ${res.status}` };
    if (!(s?.payment_status === "paid" || s?.status === "complete")) return { ok: false, error: "Payment not completed." };

    const itemKey = String(s?.metadata?.item_key ?? "");
    const item = getMarketplaceItem(itemKey);
    if (!item) return { ok: false, error: "Unknown add-on on this session." };

    const { error } = await sb.from("marketplace_purchases").upsert({
      tenant_id: tenantId,
      item_key: itemKey,
      status: "active",
      billing_interval: item.interval,
      amount_cents: typeof s?.amount_total === "number" ? s.amount_total : item.priceCents,
      currency: (s?.currency || "usd").toUpperCase(),
      stripe_customer_id: (typeof s?.customer === "string" ? s.customer : null),
      stripe_subscription_id: (typeof s?.subscription === "string" ? s.subscription : null),
      stripe_session_id: sessionId,
      canceled_at: null,
      updated_at: new Date().toISOString(),
    }, { onConflict: "tenant_id,item_key" });
    if (error) return { ok: false, error: error.message };
    return { ok: true, itemName: item.name };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "Verification failed." };
  }
}

/** Cancel an add-on: tell Stripe to cancel at period end (best-effort) and revoke access now. */
export async function cancelAddon(tenantId: string, itemKey: string): Promise<{ ok: boolean; error?: string }> {
  const sb = svc();
  const key = platformStripeKey();

  let subId: string | null = null;
  try {
    const { data } = await sb.from("marketplace_purchases").select("stripe_subscription_id").eq("tenant_id", tenantId).eq("item_key", itemKey).maybeSingle();
    subId = data?.stripe_subscription_id ?? null;
  } catch { /* degrade */ }

  if (key && subId) {
    try {
      await fetch(`https://api.stripe.com/v1/subscriptions/${encodeURIComponent(subId)}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/x-www-form-urlencoded" },
        body: "cancel_at_period_end=true",
      });
    } catch { /* best-effort; local status is the source of truth for access */ }
  }

  try {
    const { error } = await sb.from("marketplace_purchases")
      .update({ status: "canceled", canceled_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("tenant_id", tenantId).eq("item_key", itemKey);
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "Could not cancel." };
  }
}
