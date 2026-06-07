-- Tools suite: shared business profile + saved draft runs. Paste-safe: single-line
-- creates, no check clauses, no brace literal defaults (avoids SQL-editor paste mangling).
create table if not exists public.tenant_tool_profile (tenant_id uuid primary key, business_name text, industry text, product text, audience text, price_point text, geo text, updated_at timestamptz not null default now());

create table if not exists public.tenant_tool_runs (id uuid primary key default gen_random_uuid(), tenant_id uuid not null, tool_key text not null, inputs jsonb, output text, status text not null default 'draft', created_at timestamptz not null default now());

create index if not exists idx_tool_runs_tenant on public.tenant_tool_runs (tenant_id, tool_key, created_at desc);

alter table public.tenant_tool_profile enable row level security;
alter table public.tenant_tool_runs enable row level security;
drop policy if exists tool_profile_interim_open on public.tenant_tool_profile;
drop policy if exists tool_runs_interim_open on public.tenant_tool_runs;
create policy tool_profile_interim_open on public.tenant_tool_profile for all using (true) with check (true);
create policy tool_runs_interim_open on public.tenant_tool_runs for all using (true) with check (true);

notify pgrst, 'reload schema';
