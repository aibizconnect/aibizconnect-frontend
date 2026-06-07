# Builder → Architect: VERIFY Payments integration (PAY-V1..V16)

Built per D-052..D-054. No migration (reuses tenant_integrations + encrypted tenant_secrets).
typecheck clean. Files:

## lib/server/payments.ts (server-only, NOT "use server") — VERIFY-ONLY
- Stripe: getStripeCreds (decrypt {secret_key}), stripeReady, stripeIsLiveKey (sk_live_ prefix),
  testStripe → GET https://api.stripe.com/v1/account (Bearer) → {accountId, displayName,
  chargesEnabled}. NON-charging. → PAY-V1, PAY-V10, PAY-V16.
- PayPal: getPaypalCreds (decrypt {client_id, client_secret}), paypalReady, paypalEnvironment (from
  config), paypalBaseUrl (live vs sandbox), testPaypal → POST /v1/oauth2/token client_credentials
  (Basic) → access_token presence. NON-charging. → PAY-V3, PAY-V12, PAY-V16.
- CRITICAL: there are NO functions for charge/payout/refund/transfer/createOrder anywhere in this
  module or the actions — they are simply ABSENT. → PAY-V14.

## app/tenants/[tenantId]/settings/payments-actions.ts ("use server")
- getPaymentsSettings → per-provider {status, non-secret config, hasSecret}. NEVER secret_key /
  client_secret / client_id-as-secret. → PAY-V5.
- saveStripe → requireTenantAccess + requireAdminWrite; validate pk_/sk_/rk_ prefixes; encrypt
  {secret_key}; detect livemode from sk_live_; upsert tenant_integrations config {publishable_key,
  livemode, account_id, display_name, charges_enabled}; testStripe → status connected/error; audited.
  → PAY-V2, PAY-V6, PAY-V7, PAY-V8, PAY-V9, PAY-V15.
- savePaypal → admin-gated; encrypt {client_id, client_secret}; config {environment}; testPaypal →
  status; audited. → PAY-V4, PAY-V11, PAY-V15.
- testPayments(provider) / disconnectPayment(provider) → admin-gated; disconnect deletes secret +
  status disconnected; audited. → PAY-V13, PAY-V15.

## UI — SettingsHub PaymentsCards (Stripe + PayPal)
Guided forms with where-to-find LINKS (Stripe API keys dashboard, PayPal developer apps), restricted-
key recommendation, test/live badge (from livemode), PayPal Sandbox/Live selector, and a "we only
verify — no charges are ever made from this screen" note. No secret rendered (hasSecret/"stored ✓").
Stripe/PayPal cards moved out of the "soon" list into a dedicated Payments section.

Gotchas (D-054): livemode auto-detected from sk_live_; restricted-key UI hint; PayPal base URL by
environment; key rotation = UI hint only. Deferred: Stripe Connect OAuth, webhooks.

Please VERIFY PAY-V1..V16 — especially PAY-V14 (no charge/transfer code exists) — and append
DECISION-LOG. This completes the Core integrations phase (Twilio → Shopify → payments).
