-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  QUEUED — DO NOT APPLY until Ali confirms ("Done"/"Success").              ║
-- ║  Funnel Builder schema. Funnel steps are real pages (reuse website_pages). ║
-- ║  Idempotent. Interim-permissive RLS to match current model.               ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- 1) Funnels (belong to a tenant; optionally scoped to a website).
create table if not exists public.website_funnels (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  website_id uuid,
  name text not null,
  status text not null default 'draft' check (status in ('draft','live')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_funnels_tenant on public.website_funnels (tenant_id);

-- 2) A page can be a funnel step (same table, same editor as website pages).
alter table public.website_pages
  add column if not exists funnel_id uuid,
  add column if not exists funnel_step_type text
    check (funnel_step_type in ('landing','optin','sales','checkout','upsell','downsell','thankyou')),
  add column if not exists funnel_order integer;
create index if not exists idx_pages_funnel on public.website_pages (tenant_id, funnel_id);

-- 3) Canvas connections (transitions between steps).
create table if not exists public.website_funnel_edges (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  funnel_id uuid not null references public.website_funnels (id) on delete cascade,
  from_step uuid not null,
  to_step uuid not null,
  label text,
  created_at timestamptz not null default now()
);
create index if not exists idx_funnel_edges_funnel on public.website_funnel_edges (tenant_id, funnel_id);

alter table public.website_funnels enable row level security;
alter table public.website_funnel_edges enable row level security;
drop policy if exists funnels_interim_open on public.website_funnels;
drop policy if exists funnel_edges_interim_open on public.website_funnel_edges;
create policy funnels_interim_open on public.website_funnels for all using (true) with check (true);
create policy funnel_edges_interim_open on public.website_funnel_edges for all using (true) with check (true);

-- After applying: notify pgrst, 'reload schema';
