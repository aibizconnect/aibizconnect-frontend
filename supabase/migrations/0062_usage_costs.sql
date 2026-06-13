-- 0062 (D-334): per-usage cost metering. Adds provider_cost (what the channel costs us) +
-- billable_amount (what we charge the tenant = cost × markup) + currency to ai_usage_events.
-- Self-contained: creates ai_usage_events if it was never applied. Until applied, recordUsage
-- no-ops gracefully and the Usage view estimates cost from units.

create table if not exists public.ai_usage_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  kind text not null,
  units numeric(14,4) not null default 0,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.ai_usage_events
  add column if not exists provider_cost numeric(12,4) not null default 0,
  add column if not exists billable_amount numeric(12,4) not null default 0,
  add column if not exists currency text not null default 'USD';
create index if not exists ai_usage_events_tenant_idx on public.ai_usage_events (tenant_id, created_at desc);
create index if not exists ai_usage_events_kind_idx on public.ai_usage_events (tenant_id, kind);
