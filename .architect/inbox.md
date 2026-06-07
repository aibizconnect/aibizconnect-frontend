# Builder → Architect: VERIFY Shopify integration (SHOP-V1..V15, SHOP-CB-V1..V10)

Built per D-047..D-049. typecheck clean. Files:

## migration 0035_shopify_stores.sql
public.tenant_shopify_stores (id, tenant_id, shop_domain, shop_name, email, plan_name, scopes text[]
NOT NULL DEFAULT '{}', status default 'connected', encrypted_tokens text NOT NULL, connected_by,
config jsonb, created_at, updated_at; UNIQUE(tenant_id, shop_domain)). Index idx_tss_tenant.
Idempotent. → SHOP-V1..V4.

## lib/server/shopify.ts (server-only)
- SHOPIFY_API_VERSION '2024-01' pinned; SCOPES read_products/read_orders/read_shop. → D-049.
- normalizeShopDomain/isShopDomain (canonical *.myshopify.com).
- shopifyAppCreds(): env SHOPIFY_API_KEY/SECRET else encrypted SYSTEM_TENANT_ID 'shopify_platform_app'.
  shopifyReady() graceful degrade. → SHOP-V9, SHOP-V15.
- makeShopifyState/readShopifyState: encrypted {tenantId, shop, nonce, ts}, 15-min TTL.
- buildShopifyAuthorizeUrl(shop, state): client_id, scope, redirect_uri, state; NO grant_options[]=
  per-user → OFFLINE token. → SHOP-V8.
- verifyShopifyHmac(params): HMAC-SHA256 over sorted querystring excluding hmac/signature, app secret,
  timing-safe compare. → SHOP-CB-V2.
- completeShopifyCore(tenantId, shop, code, connectedBy): GATE-FREE. POST /admin/oauth/access_token →
  offline token; fetch /admin/api/2024-01/shop.json metadata; encryptSecret(tokens) → encrypted_tokens;
  upsert tenant_shopify_stores (shop_domain/name/email/plan/scopes/status); upsert non-secret
  tenant_integrations 'shopify' summary; audit shopify.oauth_complete. → SHOP-V11/V12/V13, SHOP-V14.
- getShopifyTokens(): SERVER-ONLY decrypt.

## app/tenants/[tenantId]/settings/shopify-actions.ts ("use server")
- listShopifyStores: non-secret rows + hasTokens (never blob) + ready. → SHOP-V6.
- getShopifyStartUrl: requireTenantAccess + requireAdminWrite; validates shop; builds state+url; audit
  shopify.oauth_start. → SHOP-V5, SHOP-V7, SHOP-V8, SHOP-V14.
- disconnectShopifyStore: admin-gated; delete row; flip tenant_integrations summary; audit. → SHOP-V10/V14.

## app/api/shopify/callback/route.ts (GET) → SHOP-CB-V1
Order: (1) verifyShopifyHmac FIRST → fallback ?shopify_error=hmac_failed on fail. (2) isShopDomain(shop).
(3) readShopifyState; require parsed && parsed.shop===shop (tenantId ONLY from state). → SHOP-CB-V2/V3/
V4/V5. ?error / missing code → settings ?error=. completeShopifyCore(tenantId, shop, code). Audit
shopify.oauth_callback_received. Success → 302 settings?connected=shopify&shop=<shop>. No token in URL.
→ SHOP-CB-V6/V7/V8/V9/V10.

## UI
SettingsHub ShopifyCard: guided (shop-domain input, where-to-find link, "no auto-sync" tip), connect
opens OAuth in new tab, multi-store list with disconnect, status pill, hasTokens only. Result banner
reads ?connected=shopify&shop=. Other providers (Stripe/PayPal) stay "soon".

Deferred per D-049: webhooks, Billing API, GDPR mandatory webhooks, write scopes/re-auth, product/order
sync. Please VERIFY all SHOP + SHOP-CB checks and append DECISION-LOG. Next: payments.
