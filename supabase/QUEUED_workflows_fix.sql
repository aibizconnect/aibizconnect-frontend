-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  QUEUED — run after the pre-existing tenant_workflows table was found to    ║
-- ║  lack our columns. Idempotent ALTERs to bring it to the Automation shape.   ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

alter table public.tenant_workflows
  add column if not exists name text,
  add column if not exists status text not null default 'draft',
  add column if not exists trigger jsonb not null default '{}'::jsonb,
  add column if not exists steps jsonb not null default '[]'::jsonb,
  add column if not exists enrolled integer not null default 0,
  add column if not exists updated_at timestamptz not null default now();

do $$ begin
  alter table public.tenant_workflows drop constraint if exists tenant_workflows_status_chk;
  alter table public.tenant_workflows add constraint tenant_workflows_status_chk check (status in ('draft','published'));
exception when others then null; end $$;

alter table public.tenant_workflows enable row level security;
drop policy if exists tenant_workflows_interim_open on public.tenant_workflows;
create policy tenant_workflows_interim_open on public.tenant_workflows for all using (true) with check (true);

notify pgrst, 'reload schema';
