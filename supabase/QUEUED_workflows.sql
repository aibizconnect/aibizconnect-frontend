-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  QUEUED — DO NOT APPLY until Ali confirms ("Done"/"Success").              ║
-- ║  Automation / Workflows. The whole graph (trigger + steps) lives in JSONB  ║
-- ║  so one table covers it. Idempotent. Interim-permissive RLS.               ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

create table if not exists public.tenant_workflows (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  name text not null,
  status text not null default 'draft' check (status in ('draft','published')),
  trigger jsonb not null default '{}'::jsonb,     -- {type, label, config}
  steps jsonb not null default '[]'::jsonb,        -- [{id,type,label,config}]
  enrolled integer not null default 0,             -- display metric (no live enrollment yet)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_tenant_workflows_tenant on public.tenant_workflows (tenant_id);

alter table public.tenant_workflows enable row level security;
drop policy if exists tenant_workflows_interim_open on public.tenant_workflows;
create policy tenant_workflows_interim_open on public.tenant_workflows for all using (true) with check (true);

-- After applying: notify pgrst, 'reload schema';
