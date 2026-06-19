-- 0080: General tenant SUBSCRIPTIONS. Every tenant defines their own subscription LEVELS and
-- sells recurring subscriptions to their CONTACTS. Powers the Payments flow in order:
--   Subscriptions (define levels) → Orders (new orders/trials land here) → Recurring (converted,
--   paying clients) → Coupons (existing tenant_coupons from 0058).
-- Dogfood: AIBizConnect (tenant d723a086) is itself a tenant and uses this same feature.

-- The plan LEVELS a tenant offers (Subscriptions tab).
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

-- A subscriber (a contact) on a plan. status routes which tab it appears in:
--   pending|trialing → Orders ;  active|past_due|comp → Recurring ;  canceled → archived.
create table if not exists public.tenant_subscriptions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  plan_id uuid references public.subscription_plans(id) on delete set null,
  contact_id uuid references public.tenant_contacts(id) on delete cascade,
  status text not null default 'trialing',   -- pending|trialing|active|past_due|comp|canceled
  amount_cents integer,                       -- override of plan amount (custom/negotiated deal)
  started_at timestamptz not null default now(),
  trial_ends_at timestamptz,
  current_period_end timestamptz,             -- next renewal / due date
  canceled_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists tenant_subscriptions_tenant_idx on public.tenant_subscriptions (tenant_id, status, created_at desc);
create index if not exists tenant_subscriptions_contact_idx on public.tenant_subscriptions (tenant_id, contact_id);
create index if not exists tenant_subscriptions_plan_idx on public.tenant_subscriptions (plan_id);
