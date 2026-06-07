-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  QUEUED — DO NOT APPLY until Ali confirms ("Done"/"Success").              ║
-- ║  CRM core: contacts, pipelines (stages in jsonb), opportunities.           ║
-- ║  Idempotent. Interim-permissive RLS.                                       ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

create table if not exists public.tenant_contacts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  name text, email text, phone text,
  tags jsonb not null default '[]'::jsonb,
  score integer not null default 0,
  source text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_contacts_tenant on public.tenant_contacts (tenant_id);

create table if not exists public.tenant_pipelines (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  name text not null,
  stages jsonb not null default '["New","Contacted","Qualified","Proposal","Won"]'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_pipelines_tenant on public.tenant_pipelines (tenant_id);

create table if not exists public.tenant_opportunities (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  pipeline_id uuid,
  contact_id uuid,
  name text not null,
  value numeric not null default 0,
  stage text not null default 'New',
  status text not null default 'open' check (status in ('open','won','lost')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_opps_tenant on public.tenant_opportunities (tenant_id, pipeline_id);

alter table public.tenant_contacts enable row level security;
alter table public.tenant_pipelines enable row level security;
alter table public.tenant_opportunities enable row level security;
drop policy if exists contacts_interim_open on public.tenant_contacts;
drop policy if exists pipelines_interim_open on public.tenant_pipelines;
drop policy if exists opps_interim_open on public.tenant_opportunities;
create policy contacts_interim_open on public.tenant_contacts for all using (true) with check (true);
create policy pipelines_interim_open on public.tenant_pipelines for all using (true) with check (true);
create policy opps_interim_open on public.tenant_opportunities for all using (true) with check (true);

notify pgrst, 'reload schema';
