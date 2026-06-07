-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  QUEUED — DO NOT APPLY until Ali confirms ("Done"/"Success").              ║
-- ║  Saved Assets reuse tiers (Template / Global per-website / Universal       ║
-- ║  per-account). Extends the existing website_global_blocks model.           ║
-- ║  Idempotent. Interim-permissive RLS to match current model.               ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- 1) Tier + scoping on global blocks.
--    scope='account'  -> Universal (syncs across ALL the tenant's websites)
--    scope='website'  -> Global    (syncs within ONE website; website_id set)
alter table public.website_global_blocks
  add column if not exists scope text not null default 'account'
    check (scope in ('account','website')),
  add column if not exists website_id uuid,            -- set when scope='website'
  add column if not exists kind text not null default 'section'
    check (kind in ('section','element')),
  add column if not exists updated_at timestamptz not null default now();

create index if not exists idx_global_blocks_scope
  on public.website_global_blocks (tenant_id, scope, website_id);

-- 2) Copy-on-insert library (Template tier). Inserting a template COPIES its content
--    into the page's own section row — independent, no live sync.
create table if not exists public.website_saved_templates (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid,                          -- null = platform preset (is_platform=true)
  name text not null,
  kind text not null default 'section' check (kind in ('section','element')),
  content jsonb not null default '{}'::jsonb,
  is_platform boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists idx_saved_templates_tenant
  on public.website_saved_templates (tenant_id);

alter table public.website_saved_templates enable row level security;
drop policy if exists saved_templates_interim_open on public.website_saved_templates;
create policy saved_templates_interim_open on public.website_saved_templates
  for all using (true) with check (true);

-- After applying, reload PostgREST schema cache:
-- notify pgrst, 'reload schema';
