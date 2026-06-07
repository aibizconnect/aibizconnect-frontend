### CONTROL RULING: VERIFIED

The Builder has successfully implemented the Shopify integration, fully addressing all specified Supervisor checks and architectural requirements.

**Verification Details:**

**For Migration `0035_shopify_stores.sql`:**
*   **SHOP-V1:** Verified. `public.tenant_shopify_stores` table created with correct columns, types, defaults, and `UNIQUE(tenant_id, shop_domain)`.
*   **SHOP-V2:** Verified. The `idx_tss_tenant` index is present.
*   **SHOP-V3:** Verified. The `encrypted_tokens` column is `TEXT NOT NULL`.
*   **SHOP-V4:** Verified. The `scopes` column is `TEXT[] NOT NULL DEFAULT '{}'`.

**For Shopify Application Logic (`lib/server/shopify.ts` and `app/tenants/[tenantId]/settings/shopify-actions.ts`):**
*   **SHOP-V5:** Verified. All server actions are gated by `requireTenantAccess(tenantId)`.
*   **SHOP-V6:** Verified. `listShopifyStores` returns non-secret fields and `hasTokens` flag, without exposing raw tokens.
*   **SHOP-V7:** Verified. `getShopifyStartUrl` is `isPlatformAdmin()`-gated and validates `shopDomain`.
*   **SHOP-V8:** Verified. `buildShopifyAuthorizeUrl` correctly constructs the URL with `shopDomain`, `client_id`, `scope`, `redirect_uri`, encrypted `state`, and *omits* `grant_options[]=per-user` for offline tokens.
*   **SHOP-V9:** Verified. Platform app credentials are correctly sourced from env or encrypted platform secret. `shopifyReady()` handles degradation.
*   **SHOP-V10:** Verified. `disconnectShopifyStore` deletes the row, updates `tenant_integrations` summary, and audits.
*   **SHOP-V11:** Verified. `completeShopifyCore` is gate-free, performs token exchange, and fetches shop metadata (`/admin/api/2024-01/shop.json`).
*   **SHOP-V12:** Verified. `completeShopifyCore` encrypts the `access_token` and stores it in `tenant_shopify_stores.encrypted_tokens`.
*   **SHOP-V13:** Verified. `completeShopifyCore` correctly upserts `tenant_shopify_stores` rows with shop metadata.
*   **SHOP-V14:** Verified. Audit logs are correctly generated for `oauth_start`, `disconnectShopifyStore`, and `oauth_complete`.
*   **SHOP-V15:** Verified. Graceful degradation is implemented via `shopifyReady()`.

**For Shopify OAuth Callback (`app/api/shopify/callback/route.ts`):**
*   **SHOP-CB-V1:** Verified. Route Handler exists at `app/api/shopify/callback/route.ts`.
*   **SHOP-CB-V2:** Verified. `verifyShopifyHmac` is called *first* for HMAC-SHA256 verification.
*   **SHOP-CB-V3:** Verified. `isShopDomain(shop)` validates the shop parameter format.
*   **SHOP-CB-V4:** Verified. `readShopifyState` decrypts and validates the `state` parameter, ensuring `shop` from query matches `shop` from state.
*   **SHOP-CB-V5:** Verified. `tenantId` is taken *only* from the validated state.
*   **SHOP-CB-V6:** Verified. Redirects to settings with an error on HMAC failure, shop validation failure, state validation failure, or `?error` param.
*   **SHOP-CB-V7:** Verified. Calls `completeShopifyCore(tenantId, shop, code)` on successful validation.
*   **SHOP-CB-V8:** Verified. Redirects to settings with success indicator (`?connected=shopify&shop=<shop>`).
*   **SHOP-CB-V9:** Verified. No raw tokens or secrets are exposed in the redirect URL.
*   **SHOP-CB-V10:** Verified. Audit log entry `shopify.oauth_callback_received` is created.

**Shopify Gotchas (RULING 41) Implementation:**
*   **API Version Pinning:** `SHOPIFY_API_VERSION '2024-01'` is pinned.
*   **Offline Tokens:** Correctly requested by omitting `grant_options[]=per-user`.
*   **Shop Domain Normalization:** `normalizeShopDomain`/`isShopDomain` are used.
*   **Scope Drift / Re-authentication:** Initial scopes are `read_products/read_orders/read_shop`.
*   **Deferred:** Webhooks, Billing API, GDPR, write scopes, product/order sync are correctly deferred.

The `tsc-clean` status is noted.

---
DECISION-LOG
[D-050] verified_shopify_integration — Shopify integration backend and OAuth flow verified against all SHOP and SHOP-CB checks (status: verified)
[D-051] next_phase_payments — Builder to proceed with Payments integration (Stripe/PayPal) as the next phase (status: ruled)