import crypto from "node:crypto";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { encryptSecret, decryptSecret, encryptionReady } from "./encryption";
import { SYSTEM_TENANT_ID } from "@/lib/media/system";
import { getIntegrationSecret } from "./integrations";

/**
 * Server-only Shopify client (NOT "use server"). Multi-store: a tenant can connect several shops.
 * Offline OAuth tokens live encrypted in tenant_shopify_stores.encrypted_tokens, decrypted ONLY here
 * for server-side calls, NEVER returned to a client. Platform app creds: env SHOPIFY_API_KEY /
 * SHOPIFY_API_SECRET, else the encrypted platform secret (SYSTEM_TENANT_ID, 'shopify_platform_app'
 * {app_id, app_secret}). Graceful degradation when unconfigured.
 */

export const SHOPIFY_API_VERSION = "2024-01";
const SCOPES = ["read_products", "read_orders", "read_shop"]; // minimum for this phase

export function normalizeShopDomain(input: string): string | null {
  const s = (input || "").trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  const bare = s.endsWith(".myshopify.com") ? s : `${s.replace(/\.myshopify\.com$/, "")}.myshopify.com`;
  return /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(bare) ? bare : null;
}
export function isShopDomain(s: string): boolean {
  return /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test((s || "").trim().toLowerCase());
}

export async function shopifyAppCreds(): Promise<{ id: string; secret: string } | null> {
  const id = process.env.SHOPIFY_API_KEY;
  const secret = process.env.SHOPIFY_API_SECRET;
  if (id && secret) return { id, secret };
  try {
    const s = await getIntegrationSecret(SYSTEM_TENANT_ID, "shopify_platform_app");
    if (s?.app_id && s?.app_secret) return { id: String(s.app_id), secret: String(s.app_secret) };
  } catch { /* not configured */ }
  return null;
}
export async function shopifyReady(): Promise<boolean> { return !!(await shopifyAppCreds()); }

export function shopifyRedirectUri(): string {
  const base = (process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || "https://app.aibizconnect.app").replace(/\/+$/, "");
  return `${base}/api/shopify/callback`;
}

interface ShopifyState { tenantId: string; shop: string; nonce: string; ts: number }

export function makeShopifyState(tenantId: string, shop: string): string | null {
  if (!encryptionReady()) return null;
  const nonce = crypto.randomBytes(12).toString("hex");
  const payload: ShopifyState = { tenantId, shop, nonce, ts: Date.now() };
  return Buffer.from(encryptSecret(JSON.stringify(payload)), "utf8").toString("base64url");
}
export function readShopifyState(state: string): ShopifyState | null {
  try {
    const p = JSON.parse(decryptSecret(Buffer.from(state, "base64url").toString("utf8"))) as ShopifyState;
    if (!p?.tenantId || !p?.shop || !isShopDomain(p.shop) || !p?.nonce || !p?.ts) return null;
    if (Date.now() - p.ts > 15 * 60 * 1000) return null;
    return p;
  } catch { return null; }
}

/** Build the per-shop authorize URL (offline token → no grant_options[]=per-user). */
export async function buildShopifyAuthorizeUrl(shop: string, state: string): Promise<{ ok: boolean; url?: string; error?: string }> {
  const creds = await shopifyAppCreds();
  if (!creds) return { ok: false, error: "Shopify is not configured (missing platform app credentials)." };
  if (!isShopDomain(shop)) return { ok: false, error: "Invalid shop domain." };
  const params = new URLSearchParams({ client_id: creds.id, scope: SCOPES.join(","), redirect_uri: shopifyRedirectUri(), state });
  return { ok: true, url: `https://${shop}/admin/oauth/authorize?${params.toString()}` };
}

/**
 * Verify Shopify's HMAC on the callback query. HMAC-SHA256 over the sorted querystring (excluding
 * `hmac` and `signature`) using the app secret, hex, timing-safe compared. Returns false on any gap.
 */
export async function verifyShopifyHmac(params: URLSearchParams): Promise<boolean> {
  const creds = await shopifyAppCreds();
  if (!creds) return false;
  const hmac = params.get("hmac");
  if (!hmac) return false;
  const pairs: string[] = [];
  for (const [k, v] of params.entries()) { if (k === "hmac" || k === "signature") continue; pairs.push(`${k}=${v}`); }
  pairs.sort();
  const digest = crypto.createHmac("sha256", creds.secret).update(pairs.join("&")).digest("hex");
  try {
    const a = Buffer.from(digest, "utf8");
    const b = Buffer.from(hmac, "utf8");
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  } catch { return false; }
}

interface ShopifyTokenResponse { access_token: string; scope?: string }

/**
 * SERVER-ONLY gate-free core: exchange code → offline token, fetch shop metadata, store encrypted.
 * Caller MUST have validated HMAC + state already (the callback does).
 */
export async function completeShopifyCore(tenantId: string, shop: string, code: string, connectedBy: string): Promise<{ ok: boolean; message?: string }> {
  const creds = await shopifyAppCreds();
  if (!creds) return { ok: false, message: "Shopify is not configured." };
  if (!isShopDomain(shop)) return { ok: false, message: "Invalid shop domain." };
  try {
    const tokRes = await fetch(`https://${shop}/admin/oauth/access_token`, {
      method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ client_id: creds.id, client_secret: creds.secret, code }),
    });
    const tok: any = await tokRes.json().catch(() => ({}));
    if (!tokRes.ok || !tok?.access_token) return { ok: false, message: tok?.error_description || tok?.error || `Token exchange failed (${tokRes.status}).` };
    const tokens: ShopifyTokenResponse = tok;

    // Shop metadata (best-effort).
    let shop_name: string | undefined, email: string | undefined, plan_name: string | undefined;
    let config: Record<string, unknown> = {};
    try {
      const sRes = await fetch(`https://${shop}/admin/api/${SHOPIFY_API_VERSION}/shop.json`, { headers: { "X-Shopify-Access-Token": tokens.access_token } });
      const sJson: any = await sRes.json().catch(() => ({}));
      const sh = sJson?.shop;
      if (sh) { shop_name = sh.name; email = sh.email; plan_name = sh.plan_name; config = { currency: sh.currency, timezone: sh.iana_timezone, country: sh.country_code }; }
    } catch { /* metadata best-effort */ }

    const supabase = createSupabaseServiceClient();
    const { error } = await supabase.from("tenant_shopify_stores").upsert(
      {
        tenant_id: tenantId, shop_domain: shop, shop_name, email, plan_name,
        scopes: (tokens.scope || SCOPES.join(",")).split(","), status: "connected",
        encrypted_tokens: encryptSecret(JSON.stringify(tokens)), connected_by: connectedBy, config,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "tenant_id,shop_domain" }
    );
    if (error) return { ok: false, message: error.message };

    // Reflect a non-secret summary in tenant_integrations for the unified Integrations + Launchpad view.
    const { count } = await supabase.from("tenant_shopify_stores").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId);
    await supabase.from("tenant_integrations").upsert(
      { tenant_id: tenantId, provider: "shopify", status: "connected", config: { kind: "ecommerce", store_count: count ?? 1 }, updated_at: new Date().toISOString() },
      { onConflict: "tenant_id,provider" }
    );
    try {
      const { logPlatformEvent } = await import("@/lib/audit/platform-audit");
      await logPlatformEvent({ action: "shopify.oauth_complete", actorEmail: connectedBy, meta: { tenantId, shop } });
    } catch { /* best effort */ }
    return { ok: true };
  } catch (e: any) { return { ok: false, message: e?.message ?? "Shopify connection failed." }; }
}

/** SERVER-ONLY: decrypt a store's tokens (for API calls on the tenant's behalf). */
export async function getShopifyTokens(tenantId: string, storeId: string): Promise<ShopifyTokenResponse | null> {
  const supabase = createSupabaseServiceClient();
  const { data } = await supabase.from("tenant_shopify_stores").select("encrypted_tokens").eq("tenant_id", tenantId).eq("id", storeId).maybeSingle();
  if (!data?.encrypted_tokens) return null;
  try { return JSON.parse(decryptSecret(data.encrypted_tokens as string)) as ShopifyTokenResponse; } catch { return null; }
}
