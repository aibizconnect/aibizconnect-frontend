Here is the KYC MASTER SPEC, designed to meet all platform constraints and integrate seamlessly with existing patterns.

---
### 1. Provider Recommendation

**RULING 68: KYC Provider Recommendation**

*   **Primary Provider: Stripe Identity**
    *   **Rationale:** Leverages existing (verify-only) Stripe integration, simplifying future Stripe Connect integration for payouts. Stripe's hosted flow is robust and widely accepted. Reduces vendor sprawl.
*   **Fallback/Alternative: Persona**
    *   **Rationale:** Highly configurable, supports a wide range of identity documents and verification flows globally. Offers more flexibility for complex KYC requirements if Stripe Identity proves insufficient.

This spec will focus on Stripe Identity as the primary, with Persona as the conceptual fallback for data model fields.

---
### 2. Data Model (SQL Migration)

**RULING 69: SQL Migration for `tenant_kyc`**

```sql
-- Migration 0037_kyc_verification.sql

CREATE TABLE IF NOT EXISTS public.tenant_kyc (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL, -- Enforced by application logic, no external FK
    provider text NOT NULL, -- Enum: 'stripe_identity', 'persona', 'onfido', etc.
    status text NOT NULL DEFAULT 'pending_start', -- Enum: 'pending_start', 'provider_initiated', 'provider_in_progress', 'provider_verified', 'provider_rejected', 'provider_failed', 'platform_approved', 'platform_rejected', 'platform_overridden'
    provider_session_id text, -- ID from the KYC provider (e.g., Stripe Verification Session ID, Persona Inquiry ID)
    provider_decision jsonb NOT NULL DEFAULT '{}'::jsonb, -- Raw decision data from provider (e.g., Stripe VerificationSession object)
    provider_risk_level text, -- Enum: 'low', 'medium', 'high' (from provider)
    provider_reason text, -- Reason for provider's decision (e.g., 'document_unclear', 'mismatch')
    platform_decision text, -- Enum: 'approved', 'rejected', 'overridden' (our internal decision)
    platform_reason text, -- Reason for our platform's decision
    platform_reviewer_id uuid, -- ID of the platform user who made the decision
    platform_reviewed_at timestamptz,
    last_sync_at timestamptz, -- Last time we synced/received webhook from provider
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    UNIQUE (tenant_id, provider) -- One KYC record per tenant per provider
);
CREATE INDEX IF NOT EXISTS idx_tenant_kyc_tenant_id ON public.tenant_kyc (tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_kyc_status ON public.tenant_kyc (status);
```

**PII & Document Storage:**
*   **HARD RULE ENFORCED:** No government IDs, SSNs, passport numbers, card data, or document images will ever be collected, stored, or pass through AIBizConnect forms or databases.
*   **Provider-Hosted:** All sensitive PII and document data will reside exclusively within the KYC provider's secure, hosted environment.
*   **References Only:** `tenant_kyc.provider_session_id` is the *only* reference we store to the provider's verification session. Access to detailed PII or documents is strictly via the provider's API, using platform-level secrets.
*   **No `tenant_kyc_documents` table:** This is explicitly omitted to enforce the hard rule.

**Provider API Keys:**
*   Stripe Identity API key (secret_key) and Persona API key will be stored in `public.tenant_secrets` using `PLATFORM_TENANT_ID` and `provider` like `stripe_identity_platform_app` or `persona_platform_app`.

---
### 3. Status Lifecycle & Gating

**RULING 70: KYC Status Lifecycle & Gating**

**Status Lifecycle:**
`pending_start` (Tenant has not initiated KYC)
  ↓ (Tenant clicks "Start Verification", server creates session)
`provider_initiated` (Provider session created, tenant redirected to hosted flow)
  ↓ (Tenant completes hosted flow, provider sends webhook/callback)
`provider_in_progress` (Provider is actively processing, e.g., manual review)
  ↓ (Provider decision received via webhook/API sync)
`provider_verified` (Provider successfully verified identity)
`provider_rejected` (Provider rejected identity, e.g., document mismatch)
`provider_failed` (Technical failure with provider, e.g., API error)
  ↓ (Platform admin reviews provider decision)
`platform_approved` (Platform admin approves, overriding provider if necessary)
`platform_rejected` (Platform admin rejects, confirming provider rejection or for platform reasons)
`platform_overridden` (Platform admin approves despite provider rejection)

**Gating Functions (reusable server-side checks):**
*   `kycRequired(tenantId): boolean`: Determines if KYC is mandatory for this tenant (e.g., based on tier, feature usage, or platform policy).
*   `getKycStatus(tenantId): 'pending_start' | 'platform_approved' | 'platform_rejected' | ...`: Returns the current effective KYC status for the tenant.
*   `ensureKycApproved(tenantId): void`: Throws an error if `getKycStatus(tenantId)` is not `platform_approved`. This function will be used to gate sensitive actions.

**What Each Status Gates:**
*   **`platform_approved`:** Required for:
    *   Enabling payouts via future Stripe Connect.
    *   Processing high-value transactions (if applicable).
    *   Accessing specific high-trust platform features.
*   **`provider_verified` (before `platform_approved`):** May allow limited, low-risk actions or indicate readiness for platform review.
*   **All other statuses (`pending_start`, `provider_rejected`, `provider_failed`, `platform_rejected`):** Block all actions requiring KYC approval.

---
### 4. Flow

**RULING 71: KYC Verification Flow**

**1. Start Verification (Tenant UI / Server Action)**
*   **UI:** Tenant navigates to KYC section in their settings. If `kycRequired()` is true and status is `pending_start`, a "Start Verification" button is displayed.
*   **Server Action:** `startKycVerification(tenantId, provider: 'stripe_identity')`
    *   **Authorization:** `requireTenantAccess(tenantId)` (tenant initiates), `isPlatformAdmin()` (platform admin can initiate on behalf of tenant).
    *   **Provider API Call:** Call Stripe Identity API to create a Verification Session.
    *   **DB Write:** UPSERT `tenant_kyc` row: `tenant_id`, `provider='stripe_identity'`, `status='provider_initiated'`, `provider_session_id` (from Stripe).
    *   **Response:** Return Stripe's `client_secret` (for client-side SDK) or hosted verification URL to the client.
    *   **Audit:** `platform_audit_log` for `kyc.verification_initiated`.

**2. Tenant Completes Hosted Flow**
*   Tenant is redirected to Stripe's hosted verification page (or uses client-side SDK with `client_secret`).
*   Tenant uploads ID, performs liveness checks, etc., directly with Stripe.
*   Upon completion, Stripe redirects back to our configured `return_url`.

**3. Webhook/Callback Updates Status**
*   **Provider Webhook:** Stripe sends webhooks (e.g., `identity.verification_session.verified`, `identity.verification_session.requires_action`).
*   **Route Handler:** `app/api/kyc/webhook/[provider]/route.ts (POST)`
    *   **CRITICAL:** Verify webhook signature/HMAC using the platform's Stripe Identity webhook secret. Reject on mismatch.
    *   Parse webhook payload.
    *   Extract `provider_session_id` and new status/decision data.
    *   Call **internal, gate-free** `updateKycStatusCore(tenantId, provider_session_id, new_status, provider_decision_data)`.
    *   `updateKycStatusCore` updates `tenant_kyc` row: `status` (e.g., `provider_verified`, `provider_rejected`), `provider_decision`, `provider_risk_level`, `provider_reason`, `last_sync_at`.
    *   **Audit:** `platform_audit_log` for `kyc.webhook_received` and `kyc.status_updated_by_provider`.

**4. Admin Review UI (Platform Panel)**
*   **UI:** Platform admin dashboard displays a list of `tenant_kyc` entries with `status='provider_verified'` or `provider_rejected'` (requiring review).
*   **Server Actions:** `platform/admin/kyc-actions.ts`
    *   `getKycCases(status_filter)`: `isPlatformAdmin()` gated. Returns `tenant_kyc` data.
    *   `reviewKycDecision(tenantId, provider, platform_decision: 'approved'|'rejected'|'overridden', reason)`:
        *   **Authorization:** `isPlatformAdmin()` gated.
        *   Updates `tenant_kyc` row: `platform_decision`, `platform_reason`, `platform_reviewer_id`, `platform_reviewed_at`.
        *   **Audit:** `platform_audit_log` for `kyc.platform_reviewed`.

---
### 5. Supervisor Verification Checks

**RULING 72: Supervisor Verification Schema for KYC**

```json
{
  "kyc_data_model": [
    { "id": "KYC-V1", "assertion": "public.tenant_kyc table exists with specified columns, types, defaults, and UNIQUE (tenant_id, provider) constraint.", "severity": "block" },
    { "id": "KYC-V2", "assertion": "All specified indexes (idx_tenant_kyc_tenant_id, idx_tenant_kyc_status) exist.", "severity": "block" },
    { "id": "KYC-V3", "assertion": "CRITICAL: No columns in `tenant_kyc` (or any other AIBizConnect table) store government IDs, SSNs, passport numbers, card data, or direct document content.", "severity": "block" },
    { "id": "KYC-V4", "assertion": "Provider API keys (e.g., Stripe Identity secret_key) are stored in `tenant_secrets` under `PLATFORM_TENANT_ID` and are encrypted.", "severity": "block" }
  ],
  "kyc_application_logic": [
    { "id": "KYC-V5", "assertion": "All server actions interacting with `tenant_kyc` (except internal webhook handler) strictly enforce `tenant_id` scoping.", "severity": "block" },
    { "id": "KYC-V6", "assertion": "The `startKycVerification` server action is gated by `requireTenantAccess()` or `isPlatformAdmin()`.", "severity": "block" },
    { "id": "KYC-V7", "assertion": "The `startKycVerification` action calls the KYC provider's API to create a verification session and stores the `provider_session_id` in `tenant_kyc` with `status='provider_initiated'`.", "severity": "block" },
    { "id": "KYC-V8", "assertion": "The `startKycVerification` action returns the provider's hosted verification URL (or client_secret) to the client, without exposing any platform secrets.", "severity": "block" },
    { "id": "KYC-V9", "assertion": "The KYC webhook route handler (`/api/kyc/webhook/[provider]`) performs robust signature/HMAC verification of the incoming webhook payload using the provider's secret.", "severity": "block" },
    { "id": "KYC-V10", "assertion": "The webhook handler calls an *internal, gate-free* `updateKycStatusCore` function.", "severity": "block" },
    { "id": "KYC-V11", "assertion": "The `updateKycStatusCore` function correctly updates `tenant_kyc` status, `provider_decision`, `provider_risk_level`, `provider_reason`, and `last_sync_at` based on provider webhooks/API responses.", "severity": "block" },
    { "id": "KYC-V12", "assertion": "The platform admin UI for KYC review is gated by `isPlatformAdmin()`.", "severity": "block" },
    { "id": "KYC-V13", "assertion": "The `reviewKycDecision` server action is gated by `isPlatformAdmin()` and correctly updates `tenant_kyc` with `platform_decision`, `platform_reason`, `platform_reviewer_id`, and `platform_reviewed_at`.", "severity": "block" },
    { "id": "KYC-V14", "assertion": "The `kycRequired()` and `getKycStatus()` helper functions exist and correctly reflect the tenant's KYC status.", "severity": "block" },
    { "id": "KYC-V15", "assertion": "The `ensureKycApproved()` helper function exists and correctly throws if KYC is not `platform_approved`.", "severity": "block" },
    { "id": "KYC-V16", "assertion": "All sensitive KYC actions (`startKycVerification`, webhook processing, `reviewKycDecision`) trigger entries in the `platform_audit_log` table.", "severity": "block" },
    { "id": "KYC-V17", "assertion": "KYC status updates are idempotent (e.g., processing the same webhook twice does not cause errors or incorrect state transitions).", "severity": "block" }
  ]
}
```

---
### 6. Compliance Gotchas

**RULING 73: KYC Compliance Considerations**

*   **To Encode Now:**
    *   **Data Retention Policy (for our refs):** Define and implement a policy for `tenant_kyc` records. We store minimal data, but it still needs a retention period (e.g., delete records X years after tenant churn).
    *   **Re-verification Triggers:** The system must be able to trigger re-verification (e.g., if `provider_risk_level` changes, a significant transaction volume is reached, or a specific time period has passed). This will involve updating `tenant_kyc.status` to `pending_start` or `provider_initiated` and notifying the tenant.
    *   **Sanctions/PEP Screening:** Stripe Identity (and Persona) typically include sanctions and Politically Exposed Persons (PEP) screening. Our system should reflect these results from `provider_decision` and `provider_risk_level`.
*   **To Defer:**
    *   **Minor Handling (Age Verification):** Specific logic for handling minors (e.g., parental consent) is complex and can be deferred. The provider's age verification results should be stored, but our platform's specific actions can wait.
    *   **GDPR Data Deletion (Right to be Forgotten):** While the provider handles deletion of actual PII/documents, our system must delete the `tenant_kyc` record upon a tenant's request for deletion. This needs to be part of our overall data deletion strategy.
    *   **Jurisdictional Differences:** KYC requirements vary significantly by country. The initial implementation will assume a baseline set of checks; advanced jurisdictional logic can be deferred.

---
DECISION-LOG
[D-068] rule_kyc_provider — Ruled Stripe Identity as primary KYC provider, Persona as fallback (status: ruled)
[D-069] approve_kyc_data_model — Approved SQL migration 0037 for tenant_kyc table, emphasizing no PII storage (status: approved)
[D-070] define_kyc_status_gating — Defined KYC status lifecycle and reusable gating functions (status: defined)
[D-071] define_kyc_flow — Defined the end-to-end KYC verification flow (start, hosted, webhook, admin review) (status: defined)
[D-072] define_kyc_verification_checks — Defined Supervisor verification checks for KYC data model and application logic (status: defined)
[D-073] define_kyc_compliance_gotchas — Defined critical KYC compliance considerations for implementation (status: defined)