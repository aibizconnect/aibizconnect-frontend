-- 0076 — tenant_modules (D-381). Per-tenant capability toggles. Genesis enables the industry
-- profile's DEFAULT modules; a tenant can opt others on later. Module DEFINITIONS live in the typed
-- code registry (lib/server/industry-profiles.ts); this table is the per-tenant enablement STATE.
create table if not exists public.tenant_modules (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  module_key text not null,        -- 'payments' | 'idx' | 'vow' | 'email_campaigns' | 'sms_campaigns' | 'trigger_links' | 'store' | 'saas_billing' | 'advanced_ai'
  enabled boolean not null default false,
  config jsonb not null default '{}'::jsonb,   -- module-specific (e.g. IDX board ids, stripe price map)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, module_key)
);
create index if not exists idx_tenant_modules_tenant on public.tenant_modules (tenant_id);
