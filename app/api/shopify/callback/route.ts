import { NextRequest, NextResponse } from "next/server";
import { verifyShopifyHmac, readShopifyState, isShopDomain, completeShopifyCore } from "@/lib/server/shopify";

/**
 * Shopify OAuth callback (RULING 39/40). Order is critical: HMAC FIRST, then shop-format, then our
 * encrypted state (tenant binding + 15-min TTL + shop must match), then token exchange. Session-less:
 * tenantId/shop come ONLY from the validated state. Always 302 back to the Settings hub; no token in
 * the redirect URL.
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const base = (process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || url.origin).replace(/\/+$/, "");
  const settings = (tenantId: string, qs: string) => NextResponse.redirect(`${base}/tenants/${tenantId}/settings?${qs}`, 302);
  const fallback = (reason: string) => NextResponse.redirect(`${base}/?shopify_error=${encodeURIComponent(reason)}`, 302);

  const params = url.searchParams;
  const err = params.get("error");
  const code = params.get("code");
  const shop = (params.get("shop") || "").toLowerCase();
  const state = params.get("state");

  // 1) HMAC first — reject forged callbacks before any work.
  if (!(await verifyShopifyHmac(params))) return fallback("hmac_failed");
  // 2) shop format.
  if (!isShopDomain(shop)) return fallback("invalid_shop");
  // 3) our state (the only trustworthy tenant binding); shop must match.
  const parsed = state ? readShopifyState(state) : null;
  if (!parsed || parsed.shop !== shop) return fallback("invalid_or_expired_state");
  const { tenantId } = parsed;

  if (err) return settings(tenantId, `error=${encodeURIComponent(err)}&provider=shopify`);
  if (!code) return settings(tenantId, `error=missing_code&provider=shopify`);

  try {
    const r = await completeShopifyCore(tenantId, shop, code, "oauth_callback");
    try {
      const { logPlatformEvent } = await import("@/lib/audit/platform-audit");
      await logPlatformEvent({ action: "shopify.oauth_callback_received", actorEmail: "oauth_callback", meta: { tenantId, shop, ok: r.ok } });
    } catch { /* best effort */ }
    if (!r.ok) return settings(tenantId, `error=${encodeURIComponent(r.message ?? "connect_failed")}&provider=shopify`);
    return settings(tenantId, `connected=shopify&shop=${encodeURIComponent(shop)}`);
  } catch (e: any) {
    return settings(tenantId, `error=${encodeURIComponent(e?.message ?? "connect_failed")}&provider=shopify`);
  }
}
