Builder → Copilot. KYC: Ali approved building AFTER you and I agree on one plan. Here is my consolidated spec (synthesized from your earlier reply + the architect's D-068..D-073). Please reply APPROVE, or REJECT with specific deltas. Keep it tight — we build immediately on agreement.

PROVIDER: Stripe Identity primary (we already integrate Stripe verify-only; feeds future Stripe Connect payouts; fully hosted = no IDs touch our app). Persona fallback behind a small KycProvider interface. One active at a time.

HARD RULE (structural): app NEVER collects/stores gov IDs, SSN, passport, DOB, address, or document images. All PII stays in the provider's hosted flow. We store status + provider_session_id + a NON-PII decision summary (country, doc_type, risk=low) only. No documents table — enforces the rule by absence (architect D-069).

DATA MODEL — migration 0037_kyc_verification.sql, single table tenant_kyc:
  id, tenant_id, provider, status, provider_session_id, provider_decision jsonb (non-PII summary),
  provider_risk_level, provider_reason, platform_decision, platform_reason, platform_reviewer_id,
  platform_reviewed_at, last_sync_at, created_at, updated_at; UNIQUE(tenant_id, provider).
  Provider API + webhook secrets encrypted under SYSTEM_TENANT_ID as 'stripe_identity_platform_app'
  (reuses the platform-apps pattern). I am NOT adding your separate kyc_identity_refs table — the
  non-PII summary lives in provider_decision jsonb to keep the PII surface minimal. Flag if you disagree.

LIFECYCLE: pending_start → provider_initiated → provider_verified | provider_rejected →
  platform_approved | platform_rejected | platform_overridden.

GATING (reusable, lib/server/kyc.ts): getKycStatus(), kycRequired(), ensureKycApproved() — throws unless
  platform_approved. Wired to gate FUTURE Stripe Connect payouts + high-trust actions. Nothing destructive.

FLOW (mirrors verified Shopify/OAuth pattern): startKycVerification() creates a Stripe Identity session,
  stores session id, returns hosted URL → tenant verifies on Stripe's page → HMAC/signature-verified webhook
  /api/kyc/webhook/stripe → gate-free updateKycStatusCore() idempotent → admin review UI in Platform panel
  (approve/reject/override + reason, platform_audit_log). isPlatformAdmin gates the review action.

CHECKS KYC-V1..V17: no PII in our DB beyond status/refs (block check); webhook signature verified;
  admin-only review; secrets encrypted; idempotent status updates; audit on every transition; gating
  actually blocks.

COMPLIANCE now: data-retention policy on our refs; re-verification triggers; surface sanctions/PEP result
  from provider. DEFER: minor/age handling, full GDPR deletion workflow, deep jurisdictional logic.

SCOPE: this phase = verification + status + admin review + gating helpers. Does NOT enable payouts (needs
  Stripe Connect, deferred). ensureKycApproved wired and ready against the not-yet-built payout path.

Reply APPROVE or REJECT+deltas.
