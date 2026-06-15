-- 0074 — Site-Template Applier (D-363..368, Gemini ruled + Copilot ratified Blueprint v3.9).
-- An industry "site template" = global header/footer chrome + central menu + brand defaults +
-- global social links + starter pages. applySiteTemplate() lays it onto a BLANK website (fresh mode).
create table if not exists public.website_site_templates (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  industry        text not null,                      -- real_estate | mortgage | legal | coaching | generic
  manifest        jsonb not null default '{}'::jsonb, -- { blurb, thumbnailUrl, version }
  header_sections jsonb not null default '[]'::jsonb, -- SectionContent[] for the global header block
  footer_sections jsonb not null default '[]'::jsonb, -- SectionContent[] for the global footer block
  menu            jsonb not null default '{}'::jsonb, -- central menu { items:[{label, link}] }
  pages           jsonb not null default '[]'::jsonb, -- [{ slug, seo_title, seo_description, isHome, sections:[] }]
  brand_defaults  jsonb not null default '{}'::jsonb, -- { primary_color, accent_color, font_heading, font_body }
  social_links    jsonb not null default '{}'::jsonb, -- { facebook, instagram, linkedin, youtube, ... }
  status          text not null default 'active',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (industry, name)
);
create index if not exists idx_site_templates_industry on public.website_site_templates (industry);

-- Central menu + global social links live at the brand level (D-365/D-366): edit once, reflected
-- everywhere — the header `menu` element and footer `social` element read from these.
alter table public.website_brand_settings
  add column if not exists menu         jsonb,
  add column if not exists social_links jsonb;
