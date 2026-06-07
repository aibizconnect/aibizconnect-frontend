-- Step 22: tenant-scoped site navigation.
-- Apply manually (supabase db push / SQL editor).
-- A nav item links EITHER to a page_id OR an external url.
-- RLS posture matches the interim model (permissive; real tenant isolation is
-- enforced upstream by the external backend + custom JWT for now).

create table if not exists public.website_navigation (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  label text not null,
  page_id uuid references public.website_pages (id) on delete cascade,
  url text,
  order_index integer not null default 0
);

create index if not exists idx_website_navigation_tenant
  on public.website_navigation (tenant_id);

alter table public.website_navigation enable row level security;

drop policy if exists nav_interim_open on public.website_navigation;
drop policy if exists public_read_nav on public.website_navigation;

-- Interim permissive policy (keeps editor working; NOT real isolation).
create policy nav_interim_open on public.website_navigation
  for all using (true) with check (true);

-- Public read (navigation is non-sensitive site chrome).
create policy public_read_nav on public.website_navigation
  for select using (true);
