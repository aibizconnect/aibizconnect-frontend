-- 0039_custom_values_scoring.sql
-- Custom Values (reusable merge fields) + Lead Scoring rules (GoHighLevel parity). Tenant-scoped in
-- code (no external FKs, RLS deferred — consistent with the rest of the schema).

-- Custom Values: named reusable values referenced as {{custom_values.<key>}} in emails / pages.
create table if not exists public.tenant_custom_values (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  name text not null,                 -- display name
  value_key text not null,            -- machine slug used in merge tags
  value text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists tenant_custom_values_unique_key
  on public.tenant_custom_values (tenant_id, lower(value_key));
create index if not exists tenant_custom_values_tenant_idx on public.tenant_custom_values (tenant_id);

-- Lead Scoring rules: award points when a trigger matches. Evaluation engine is a later step; this
-- stores the rules + per-tenant "hot" threshold (the threshold lives in tenant_settings as
-- 'lead_score_hot_threshold' to keep single-row settings out of this table).
create table if not exists public.tenant_scoring_rules (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  name text not null,
  trigger_type text not null,          -- tag_added | field_equals | form_submitted | email_opened | link_clicked | page_visited
  trigger_config jsonb not null default '{}'::jsonb,   -- e.g. { tag: "...", field_key: "...", value: "...", url: "..." }
  points integer not null default 0,   -- may be negative (decay / disqualify)
  enabled boolean not null default true,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists tenant_scoring_rules_tenant_idx
  on public.tenant_scoring_rules (tenant_id, position);
