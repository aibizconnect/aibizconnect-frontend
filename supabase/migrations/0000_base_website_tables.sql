-- Foundation: base tables the website builder depends on.
-- These were ASSUMED to pre-exist from Step 8 but never created in this DB.
-- Apply this FIRST (before 0002+). Idempotent (IF NOT EXISTS).
--
-- NOTE: the builder's per-page sections table is named website_page_sections
-- (NOT website_sections) — an older, differently-shaped website_sections table
-- already exists in this database for the /api/websites/* system and is left
-- untouched.

-- Pages
create table if not exists public.website_pages (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  title text not null,
  slug text not null,
  order_index integer not null default 0,
  is_home boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists idx_website_pages_tenant
  on public.website_pages (tenant_id);

-- Per-page sections (builder)
create table if not exists public.website_page_sections (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  page_id uuid not null references public.website_pages (id) on delete cascade,
  type text not null,
  content jsonb not null default '{}'::jsonb,
  order_index integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists idx_website_page_sections_page
  on public.website_page_sections (tenant_id, page_id);

-- Brand settings (one row per tenant; tenant_id is the conflict target for upsert)
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
