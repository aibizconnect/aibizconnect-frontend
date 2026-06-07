-- Step 31: reusable Global Blocks + page references. Apply in SQL editor. Idempotent.
-- Interim-permissive RLS, matching the current model.

create table if not exists public.website_global_blocks (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  name text not null,
  type text not null,                 -- same section types; content validated app-side
  content jsonb not null default '{}'::jsonb,
  draft_content jsonb,                -- optional unpublished draft
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_global_blocks_tenant
  on public.website_global_blocks (tenant_id);

create table if not exists public.website_page_block_refs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  page_id uuid not null references public.website_pages (id) on delete cascade,
  block_id uuid not null references public.website_global_blocks (id) on delete cascade,
  order_index integer not null default 0
);
create index if not exists idx_page_block_refs_page
  on public.website_page_block_refs (tenant_id, page_id);

alter table public.website_global_blocks enable row level security;
alter table public.website_page_block_refs enable row level security;

drop policy if exists global_blocks_interim_open on public.website_global_blocks;
drop policy if exists page_block_refs_interim_open on public.website_page_block_refs;
create policy global_blocks_interim_open on public.website_global_blocks
  for all using (true) with check (true);
create policy page_block_refs_interim_open on public.website_page_block_refs
  for all using (true) with check (true);
