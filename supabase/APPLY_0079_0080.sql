-- ════════════════════════════════════════════════════════════════════════════
-- APPLY 0079 + 0080 — Subscriptions & platform billing (2026-06-19)
-- Paste this whole file into the Supabase SQL editor and Run. Idempotent &
-- additive (only `add column / create table if not exists` + safe backfills);
-- safe to re-run. Until this runs, the new tabs render empty and the edit
-- buttons report "apply migration".
-- ════════════════════════════════════════════════════════════════════════════

-- ── 0079: platform-level SUBSCRIBER billing on tenants ──────────────────────
alter table public.tenants
  add column if not exists billing_status text not null default 'trialing',  -- trialing|active|past_due|canceled|comp
  add column if not exists trial_ends_at timestamptz,
  add column if not exists current_period_end timestamptz,
  add column if not exists monthly_amount_cents integer;

update public.tenants
   set trial_ends_at = created_at + interval '14 days'
 where trial_ends_at is null
   and billing_status = 'trialing';

update public.tenants
   set billing_status = 'comp'
 where id = 'd723a086-eac0-4b61-8742-25313370d0b7';

create index if not exists tenants_billing_status_idx on public.tenants (billing_status);

-- ── 0080: general tenant SUBSCRIPTIONS (plans + subscriptions to contacts) ───
create table if not exists public.subscription_plans (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  name text not null,
  description text,
  amount_cents integer not null default 0,
  currency text not null default 'USD',
  interval text not null default 'month',    -- 'month' | 'year' | 'week'
  trial_days integer not null default 0,
  features jsonb not null default '[]'::jsonb,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists subscription_plans_tenant_idx on public.subscription_plans (tenant_id, sort_order, created_at);

create table if not exists public.tenant_subscriptions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  plan_id uuid references public.subscription_plans(id) on delete set null,
  contact_id uuid references public.tenant_contacts(id) on delete cascade,
  status text not null default 'trialing',   -- pending|trialing|active|past_due|comp|canceled
  amount_cents integer,
  started_at timestamptz not null default now(),
  trial_ends_at timestamptz,
  current_period_end timestamptz,
  canceled_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists tenant_subscriptions_tenant_idx on public.tenant_subscriptions (tenant_id, status, created_at desc);
create index if not exists tenant_subscriptions_contact_idx on public.tenant_subscriptions (tenant_id, contact_id);
create index if not exists tenant_subscriptions_plan_idx on public.tenant_subscriptions (plan_id);
