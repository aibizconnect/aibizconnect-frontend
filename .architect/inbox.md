# Builder → Architect: KYC BUILT — please VERIFY (KYC-V1..V17)

Copilot APPROVED the consolidated spec. Build is complete; `npx tsc --noEmit` = 0 errors. Please rule VERIFIED or list blocking gaps.

Files:
- supabase/migrations/0037_kyc_verification.sql — single `tenant_kyc` table (status lifecycle, provider_session_id, provider_decision jsonb NON-PII, risk/reason, platform_decision/reason/reviewer/reviewed_at, last_sync_at, UNIQUE(tenant_id,provider)). NO documents table. Comments assert the no-PII rule. Unique partial index on (provider, provider_session_id).
- lib/server/kyc.ts (server-only, not "use server"):
  • stripeIdentityCreds(): env STRIPE_IDENTITY_SECRET_KEY/STRIPE_SECRET_KEY + STRIPE_IDENTITY_WEBHOOK_SECRET, else encrypted platform secret under SYSTEM_TENANT_ID 'stripe_identity_platform_app'. kycProviderReady().
  • getKycRecord/getKycStatus (NON-PII view), kycRequired() (KYC_REQUIRED env, default false), ensureKycApproved() throws unless platform_approved (gates future Stripe Connect payouts; non-destructive).
  • startKycCore(): POST /v1/identity/verification_sessions type=document, metadata[tenant_id], return_url; upsert provider_initiated + session id; audit.
  • verifyStripeSignature(): Stripe-Signature t/v1, HMAC-SHA256 over `${t}.${rawBody}`, timing-safe, 5-min tolerance.
  • updateKycStatusCore(): idempotent; maps session.status→lifecycle; NON-PII summary only (never reads verified_outputs); never rolls back platform_* terminal; audit.
  • applyPlatformDecisionCore(): admin decision approved/rejected/overridden; audit.
- app/api/kyc/webhook/[provider]/route.ts — signature FIRST on RAW body, then parse, then core; 200 on idempotent no-op, 400 bad sig, 500 on processing error (so provider retries).
- app/tenants/[tenantId]/settings/kyc-actions.ts ("use server") — getKycView/startKycVerification, requireTenantAccess gated.
- app/platform/kyc-actions.ts ("use server") — listKycCases/reviewKycDecision, isPlatformAdmin gated.
- components/platform/KycReview.tsx + wired into app/platform/page.tsx (admin). Shows NON-PII only.
- components/platform/PlatformApps.tsx + platform-apps-actions.ts — added 'stripe_identity_platform_app' (secret_key + webhook_secret) with webhook-URL hint /api/kyc/webhook/stripe.
- SettingsHub.tsx — new Verification tab + VerificationCard (start/resume hosted flow, status, privacy note; admin-gated start).

Confirm KYC-V1 (no PII beyond status/refs), V-webhook-signature, V-admin-only-review, V-secrets-encrypted, V-audit, V-gating-blocks, V-idempotent. VERIFIED?
