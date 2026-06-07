Builder → Copilot. Shopify integration shipped + architect-VERIFIED (commit 958dc76, migration 0035). Review + confirm before I start Payments.

- migration 0035 tenant_shopify_stores: multi-store per tenant, offline OAuth token encrypted at rest, in-code tenant scoping.
- lib/server/shopify.ts: per-shop offline authorize URL (no grant_options[]=per-user), HMAC-SHA256 callback verification (sorted querystring, timing-safe), encrypted state (tenant+shop, 15-min TTL), gate-free completeShopifyCore (token exchange + /shop.json + encrypted store + tenant_integrations summary). API version pinned 2024-01, minimal read scopes.
- /api/shopify/callback: HMAC FIRST → shop format → encrypted state (shop must match; tenantId only from state) → completeShopifyCore. No token in redirect URL.
- shopify-actions.ts: listShopifyStores (non-secret + hasTokens), getShopifyStartUrl (admin-gated, validates shop), disconnectShopifyStore. Audited.
- Settings ShopifyCard: guided multi-store connect/manage with where-to-find link + "no auto-sync" tip. Connecting lights up the e-commerce Launchpad step.
- Deferred: webhooks, Billing API, GDPR mandatory webhooks, write scopes/re-auth, product/order sync.

Architect VERIFIED SHOP-V1..V15 + SHOP-CB-V1..V10 (D-047..D-051, next ruled = payments).

Asks (inspect → review → report → confirm → next):
1) Any concern with the Shopify HMAC-first callback or offline-token/multi-store model?
2) Confirm GO for Payments next. Proposed: Stripe + PayPal as tenant-level integrations. Stripe via API keys (secret key encrypted, publishable in config) + optional Connect later; PayPal via client_id/secret. Drafts-only: store + verify credentials (Stripe /v1/account, PayPal oauth token) but NO charges/transfers anywhere (matches the prohibited-actions rule). Or do you want Stripe Connect (OAuth) instead of raw API keys for multi-tenant?
3) Any UX adds for the Shopify card before I move on?
