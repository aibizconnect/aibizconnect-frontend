-- 0037_kyc_verification.sql
-- KYC / identity verification (provider-hosted). HARD RULE: this app NEVER stores government IDs,
-- SSNs, passport numbers, DOB, addresses, or document images. All PII stays inside the provider's
-- hosted flow (Stripe Identity primary, Persona fallback). We persist ONLY: lifecycle status, the
-- provider's session reference, a NON-PII decision summary (country, doc_type, risk, decision code,
-- sanctions/PEP flags), and the platform's review decision. There is deliberately NO documents table.
--
-- Provider API + webhook secrets are stored ENCRYPTED in tenant_secrets under the system tenant
-- (provider 'stripe_identity_platform_app'), reusing the platform-apps pattern — not in this table.

create table if not exists public.tenant_kyc (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  provider text not null default 'stripe_identity',

  -- Lifecycle:
  --  pending_start        — record exists, no provider session yet
  --  provider_initiated   — hosted session created, tenant has not finished
  --  provider_in_progress — provider is processing the submission
  --  provider_verified    — provider says verified
  --  provider_rejected    — provider could not verify (requires_input / declined)
  --  provider_failed      — provider/system error
  --  platform_approved    — our team approved (the only state that satisfies ensureKycApproved)
  --  platform_rejected    — our team rejected
  --  platform_overridden  — our team manually overrode the provider outcome
  status text not null default 'pending_start',

  provider_session_id text,                 -- e.g. Stripe 'vs_...' (a reference, not PII)
  provider_decision jsonb not null default '{}'::jsonb,  -- NON-PII summary ONLY
  provider_risk_level text,                 -- low | medium | high | null
  provider_reason text,                     -- non-PII decision/reason code

  -- Platform (our team) review.
  platform_decision text,                   -- approved | rejected | overridden | null
  platform_reason text,
  platform_reviewer_id text,                -- reviewer email
  platform_reviewed_at timestamptz,

  last_sync_at timestamptz,                 -- last time a provider webhook/sync touched this row
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (tenant_id, provider)
);

create index if not exists tenant_kyc_tenant_idx on public.tenant_kyc (tenant_id);
create index if not exists tenant_kyc_status_idx on public.tenant_kyc (status);
create unique index if not exists tenant_kyc_session_idx
  on public.tenant_kyc (provider, provider_session_id) where provider_session_id is not null;

comment on table public.tenant_kyc is
  'KYC verification status + provider-session references ONLY. No PII / no documents are stored here — verification happens in the provider hosted flow.';
comment on column public.tenant_kyc.provider_decision is
  'NON-PII summary only (country, doc_type, risk, decision code, sanctions/PEP flags). Never DOB, address, or ID numbers.';
