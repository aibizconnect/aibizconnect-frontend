-- 0050 — converge the live DB with the Settings hub schema (drift fix, same disease as
-- the 0043/0044 calendar convergence: live tables predate the migration files).
--
-- Found while diagnosing Ali's Settings page crash (Server Components error):
--   (1) live tenant_settings has an OLD column shape — no setting_key/setting_value —
--       which breaks Business Profile, Tracking, Preferences, Lead-scoring threshold and
--       Launchpad settings. The live table is EMPTY, so recreate per 0031 is loss-free.
--   (2) tenant_shopify_stores never existed live (0035 unapplied) — the Shopify card's
--       load throws and takes the Integrations tab down with it.
drop table if exists public.tenant_settings;
create table public.tenant_settings (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  setting_key text not null,
  setting_value jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, setting_key)
);
create index if not exists idx_tenant_settings_tenant on public.tenant_settings (tenant_id);
create index if not exists idx_tenant_settings_key on public.tenant_settings (setting_key);

create table if not exists public.tenant_shopify_stores (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  shop_domain text not null,
  shop_name text,
  email text,
  plan_name text,
  scopes text[] not null default '{}',
  status text not null default 'connected',
  encrypted_tokens text not null,
  connected_by text,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, shop_domain)
);
create index if not exists idx_tss_tenant on public.tenant_shopify_stores (tenant_id);
