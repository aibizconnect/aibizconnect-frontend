-- 0027_ai_usage.sql
-- AI usage metering (Ali): record every AI action per tenant so we can meter + bill.
-- One row per generation event. `units` = how many billable units (e.g. images). `cost_cents`
-- is optional and filled at billing time. DRAFT-ONLY: this records usage; it does NOT charge.
create table if not exists ai_usage_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  kind text not null default 'image',      -- image | text | enrich | ...
  units integer not null default 1,
  cost_cents integer,                       -- nullable; computed/charged later
  meta jsonb not null default '{}'::jsonb,  -- prompt hash, model, aspect, etc.
  created_at timestamptz not null default now()
);
create index if not exists ai_usage_tenant_idx on ai_usage_events(tenant_id, created_at desc);
