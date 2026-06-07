-- =====================================================================
-- AI Biz Connect — Website Builder schema (consolidated, idempotent)
-- Paste this whole file into the Supabase SQL editor and run it.
-- Safe to re-run (IF NOT EXISTS / DROP POLICY IF EXISTS / guards).
--
-- INCLUDED: foundation base tables + Steps 0002,0003,0005,0006,0007,0009,0010,0011.
-- EXCLUDED ON PURPOSE:
--   * 0001/0004 (Step 18 "Kits" tables + clone RPC) — that system was retired.
--   * 0008 (DROP of Step 18 tables) — review-only, not needed here.
--
-- AFTER RUNNING THIS, also (separately, in the dashboard):
--   * Create a public Storage bucket "website-media" + insert/delete policies
--     (required for the Media library uploads — Step 27).
--
-- SECURITY NOTE: RLS below is INTERIM-PERMISSIVE (USING(true)). It does NOT
-- isolate tenants. Real isolation is deferred until the custom-JWT/external
-- backend auth model is reconciled. Do not treat this as production-secure.
-- =====================================================================

-- ---------- Foundation base tables ----------
create table if not exists public.website_pages (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  title text not null,
  slug text not null,
  order_index integer not null default 0,
  is_home boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists idx_website_pages_tenant on public.website_pages (tenant_id);
-- website_pages may pre-exist (older schema) so CREATE above is a no-op there;
-- ensure the builder's base columns exist either way:
alter table public.website_pages
  add column if not exists order_index integer not null default 0,
  add column if not exists is_home boolean not null default false;

create table if not exists public.website_page_sections (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  page_id uuid not null references public.website_pages (id) on delete cascade,
  type text not null,
  content jsonb not null default '{}'::jsonb,
  order_index integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists idx_website_page_sections_page on public.website_page_sections (tenant_id, page_id);

create table if not exists public.website_brand_settings (
  tenant_id uuid primary key,
  primary_color text,
  secondary_color text,
  accent_color text,
  font_heading text,
  font_body text,
  tone text,
  logo_url text,
  created_at timestamptz not null default now()
);
-- 0013: theme tokens
alter table public.website_brand_settings
  add column if not exists theme jsonb not null default '{}'::jsonb;

-- ---------- 0014: global blocks RLS (interim permissive) ----------
alter table public.website_global_blocks enable row level security;
alter table public.website_page_block_refs enable row level security;
drop policy if exists global_blocks_interim_open on public.website_global_blocks;
drop policy if exists page_block_refs_interim_open on public.website_page_block_refs;
create policy global_blocks_interim_open on public.website_global_blocks for all using (true) with check (true);
create policy page_block_refs_interim_open on public.website_page_block_refs for all using (true) with check (true);

-- ---------- 0002: published flag + unique slug ----------
alter table public.website_pages add column if not exists is_public boolean default false;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'unique_slug_per_tenant') then
    alter table public.website_pages add constraint unique_slug_per_tenant unique (tenant_id, slug);
  end if;
end $$;

-- ---------- 0005: published_at ----------
alter table public.website_pages add column if not exists published_at timestamptz;

-- ---------- 0009: SEO fields ----------
alter table public.website_pages
  add column if not exists seo_title text,
  add column if not exists seo_description text,
  add column if not exists seo_image_url text,
  add column if not exists canonical_url text,
  add column if not exists noindex boolean not null default false,
  add column if not exists nofollow boolean not null default false;

-- ---------- 0010: page settings ----------
alter table public.website_pages
  add column if not exists is_hidden boolean not null default false,
  add column if not exists redirect_url text;

-- ---------- 0012: draft/publish workflow ----------
alter table public.website_pages
  add column if not exists draft_title text,
  add column if not exists draft_slug text,
  add column if not exists draft_seo jsonb not null default '{}'::jsonb,
  add column if not exists draft_sections jsonb not null default '[]'::jsonb;

-- ---------- 0006: navigation ----------
create table if not exists public.website_navigation (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  label text not null,
  page_id uuid references public.website_pages (id) on delete cascade,
  url text,
  order_index integer not null default 0
);
create index if not exists idx_website_navigation_tenant on public.website_navigation (tenant_id);
-- 0015: navigation v2 (named menus + draft-aware items)
alter table public.website_navigation
  add column if not exists menu_key text not null default 'primary',
  add column if not exists draft_label text,
  add column if not exists draft_url text,
  add column if not exists draft_page_id uuid;
create index if not exists idx_website_navigation_menu on public.website_navigation (tenant_id, menu_key, order_index);

-- ---------- 0007: section templates ----------
create table if not exists public.website_section_templates (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  name text not null,
  description text,
  sections jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_website_section_templates_tenant on public.website_section_templates (tenant_id);

-- ---------- 0011: media ----------
create table if not exists public.website_media (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  url text not null,
  storage_path text not null,
  filename text,
  mime_type text,
  size_bytes integer,
  created_at timestamptz not null default now()
);
create index if not exists idx_website_media_tenant on public.website_media (tenant_id);

-- ---------- 0014: global blocks ----------
create table if not exists public.website_global_blocks (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  name text not null,
  type text not null,
  content jsonb not null default '{}'::jsonb,
  draft_content jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_global_blocks_tenant on public.website_global_blocks (tenant_id);
create table if not exists public.website_page_block_refs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  page_id uuid not null references public.website_pages (id) on delete cascade,
  block_id uuid not null references public.website_global_blocks (id) on delete cascade,
  order_index integer not null default 0
);
create index if not exists idx_page_block_refs_page on public.website_page_block_refs (tenant_id, page_id);

-- ---------- 0003 + per-table: enable RLS (interim permissive) ----------
alter table public.website_pages enable row level security;
alter table public.website_page_sections enable row level security;
alter table public.website_brand_settings enable row level security;
alter table public.website_navigation enable row level security;
alter table public.website_section_templates enable row level security;
alter table public.website_media enable row level security;

drop policy if exists pages_interim_open on public.website_pages;
drop policy if exists sections_interim_open on public.website_page_sections;
drop policy if exists brand_interim_open on public.website_brand_settings;
drop policy if exists nav_interim_open on public.website_navigation;
drop policy if exists section_templates_interim_open on public.website_section_templates;
drop policy if exists media_interim_open on public.website_media;
drop policy if exists public_read_pages on public.website_pages;
drop policy if exists public_read_sections on public.website_page_sections;
drop policy if exists public_read_brand on public.website_brand_settings;
drop policy if exists public_read_nav on public.website_navigation;

create policy pages_interim_open on public.website_pages for all using (true) with check (true);
create policy sections_interim_open on public.website_page_sections for all using (true) with check (true);
create policy brand_interim_open on public.website_brand_settings for all using (true) with check (true);
create policy nav_interim_open on public.website_navigation for all using (true) with check (true);
create policy section_templates_interim_open on public.website_section_templates for all using (true) with check (true);
create policy media_interim_open on public.website_media for all using (true) with check (true);

create policy public_read_pages on public.website_pages for select using (is_public = true);
create policy public_read_sections on public.website_page_sections for select using (
  exists (select 1 from public.website_pages p where p.id = page_id and p.is_public = true)
);
create policy public_read_brand on public.website_brand_settings for select using (true);
create policy public_read_nav on public.website_navigation for select using (true);
