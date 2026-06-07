-- Website template system tables
-- These mirror the existing tenant tables (website_pages / website_sections /
-- website_brand_settings) but are tenant-agnostic "source" data that can be
-- cloned into a tenant instance via the useTemplate() server action.
--
-- NOTE: This migration must be applied manually (e.g. `supabase db push` or the
-- Supabase SQL editor). The app cannot run DDL at runtime.

-- A) Templates
create table if not exists public.website_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  industry text,
  created_at timestamptz not null default now()
);

-- B) Template pages
create table if not exists public.website_template_pages (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.website_templates (id) on delete cascade,
  title text not null,
  slug text not null,
  order_index integer not null default 0
);

-- C) Template sections
create table if not exists public.website_template_sections (
  id uuid primary key default gen_random_uuid(),
  template_page_id uuid not null references public.website_template_pages (id) on delete cascade,
  type text not null,
  content jsonb not null default '{}'::jsonb,
  order_index integer not null default 0
);

-- D) Template brand settings
create table if not exists public.website_template_brand_settings (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.website_templates (id) on delete cascade,
  primary_color text,
  secondary_color text,
  accent_color text,
  font_heading text,
  font_body text
);

create index if not exists idx_template_pages_template
  on public.website_template_pages (template_id);
create index if not exists idx_template_sections_page
  on public.website_template_sections (template_page_id);
create index if not exists idx_template_brand_template
  on public.website_template_brand_settings (template_id);

-- RLS: templates are shared, read-only catalog data. Enable RLS and allow
-- read access. Writes (AI-generated templates, seeding) should happen via a
-- privileged/service context, NOT the public anon key. Adjust to your needs.
alter table public.website_templates enable row level security;
alter table public.website_template_pages enable row level security;
alter table public.website_template_sections enable row level security;
alter table public.website_template_brand_settings enable row level security;

create policy "templates_read_all" on public.website_templates
  for select using (true);
create policy "template_pages_read_all" on public.website_template_pages
  for select using (true);
create policy "template_sections_read_all" on public.website_template_sections
  for select using (true);
create policy "template_brand_read_all" on public.website_template_brand_settings
  for select using (true);
