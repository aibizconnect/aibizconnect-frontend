-- 0040_content_strategy.sql
-- Per-tenant Content Strategy (deterministic-first; architect RULING 77 / D-077). One row per tenant
-- (regeneration overwrites). Tenant-scoped in code (no external FK, RLS deferred). No PII; no
-- fabricated competitor/client data is ever stored (CS-V13).

create table if not exists public.tenant_content_strategy (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  niche text not null,
  profile_snapshot jsonb not null default '{}'::jsonb,   -- inputs used: business_name, city, country, seed keywords
  pillars jsonb not null default '[]'::jsonb,             -- [{ title, cluster:[{ title, articles:[{ title, intent, est_words }] }] }]
  queue jsonb not null default '[]'::jsonb,               -- [{ title, keyword, intent, priority, est_words }]
  calendar jsonb not null default '[]'::jsonb,            -- [{ week, items:[{ title, status }] }] — 12 weeks
  status text not null default 'draft',                   -- draft | active | regenerating | failed
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id)
);
create index if not exists idx_tenant_content_strategy_tenant on public.tenant_content_strategy (tenant_id);
