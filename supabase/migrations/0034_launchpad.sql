-- 0034_launchpad.sql
-- Launchpad onboarding sequence (architect-approved, D-038). Tracks per-tenant setup-step status
-- (auto-verified where a check exists) and DRAFT follow-up reminders. In-code tenant scoping, no
-- external FK. DRAFTS-ONLY: the app NEVER sends — it only schedules rows; a separate worker (later)
-- does any sending. SMS rows are created pending the Twilio backend.

create table if not exists public.tenant_onboarding (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  step_key text not null,                   -- account|brand|website|domain|email|social|ecommerce|idx_vow|...
  status text not null default 'pending',   -- pending|in_progress|complete|skipped|not_applicable
  verified_at timestamptz,                  -- last successful auto-verify
  last_checked_at timestamptz,
  meta jsonb not null default '{}'::jsonb,   -- evidence (websiteId, domain, account_count, …)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, step_key)
);
create index if not exists idx_tenant_onboarding_tenant on public.tenant_onboarding (tenant_id);
create index if not exists idx_tenant_onboarding_step_key on public.tenant_onboarding (step_key);

create table if not exists public.tenant_onboarding_followups (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  channel text not null,                    -- email|sms
  scheduled_for timestamptz not null,
  status text not null default 'draft',     -- draft|scheduled|sent|skipped|canceled
  template_key text not null,
  note text,                                -- e.g. 'twilio pending' for stubbed SMS
  payload jsonb not null default '{}'::jsonb,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, channel, template_key)
);
create index if not exists idx_onboarding_followups_tenant on public.tenant_onboarding_followups (tenant_id);
create index if not exists idx_onboarding_followups_status_scheduled on public.tenant_onboarding_followups (status, scheduled_for) where status = 'scheduled';
