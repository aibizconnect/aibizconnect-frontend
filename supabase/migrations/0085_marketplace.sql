-- 0085 — marketplace_purchases. Platform→tenant add-on purchases ("Path B": AIBizConnect
-- selling add-ons to a tenant, distinct from a tenant selling to their own customers).
-- One row per (tenant, add-on). Access to a purchased add-on = an 'active' row here
-- (row-existence grant, like tenant_course_enrollments). The marketplace code degrades
-- gracefully until this is applied (reads → empty, writes → no-op), per the DDL-queue rule.
create table if not exists public.marketplace_purchases (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  item_key text not null,                 -- marketplace catalog key, e.g. 'tools_pro'
  status text not null default 'active',  -- active | canceled | past_due | incomplete
  billing_interval text,                  -- 'month'
  amount_cents integer not null default 0,
  currency text not null default 'USD',
  stripe_customer_id text,
  stripe_subscription_id text,
  stripe_session_id text unique,          -- idempotency on checkout return
  current_period_end timestamptz,
  canceled_at timestamptz,
  config jsonb not null default '{}'::jsonb,   -- per-add-on settings the tenant manages
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, item_key)
);
create index if not exists idx_marketplace_purchases_tenant on public.marketplace_purchases (tenant_id);
create index if not exists idx_marketplace_purchases_sub on public.marketplace_purchases (stripe_subscription_id) where stripe_subscription_id is not null;
-- interim-open RLS (matches 0069_store.sql); tenant scoping is enforced in code via .eq("tenant_id", …).
alter table public.marketplace_purchases enable row level security;
create policy marketplace_purchases_interim_open on public.marketplace_purchases for all using (true) with check (true);
