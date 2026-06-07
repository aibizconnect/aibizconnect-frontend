-- 0029_ai_website_creation_pipeline.sql
-- AI-first, Supervisor-verified website-creation pipeline (architect spec, Copilot-approved).
-- Stores: AI business analysis, per-page extractions, atomic blocks, the improved page tree,
-- and old->new page mapping. Plus a pipeline-state column on websites.
--
-- Scoping: every row carries tenant_id + website_id (enforced IN CODE via the service-role
-- client, like the rest of the app). We deliberately DO NOT add foreign keys to tenants/websites
-- (tenant identity lives in the external backend; `tenants` is not in this Supabase DB) — this
-- keeps the migration robust. Internal FKs between the new tables ARE kept. RLS is deferred per
-- SECURITY-PLAN.md (service-role bypasses it anyway).

-- 1) AI business analysis (Step 1)
create table if not exists public.website_analysis_results (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  website_id uuid not null,
  source_url text,
  analysis_data jsonb not null default '{}'::jsonb,
  analysis_status text not null default 'pending', -- pending|completed|failed|re_analyzing
  supervisor_verification jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_war_tenant_website on public.website_analysis_results (tenant_id, website_id);

-- 2) Extracted content per real "main page"
create table if not exists public.website_page_extractions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  website_id uuid not null,
  original_url text not null,
  page_title text,
  page_intent text, -- informational|conversion|trust_building|seo|funnel_step
  extracted_content jsonb not null default '{}'::jsonb,
  extraction_status text not null default 'pending', -- pending|completed|failed|re_extracting
  supervisor_verification jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (website_id, original_url)
);
create index if not exists idx_wpe_tenant_website on public.website_page_extractions (tenant_id, website_id);
create index if not exists idx_wpe_url on public.website_page_extractions (original_url);

-- 3) Atomic, design-system blocks
create table if not exists public.website_page_blocks (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  website_id uuid not null,
  block_type text not null, -- hero_block|feature_block|service_block|testimonial_block|gallery_block|cta_block|faq_block|contact_block
  block_name text not null,
  content jsonb not null default '{}'::jsonb,
  is_global boolean not null default false,
  source_page_extraction_id uuid references public.website_page_extractions(id) on delete set null,
  block_status text not null default 'draft', -- draft|active|archived
  supervisor_verification jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_wpb_tenant_website on public.website_page_blocks (tenant_id, website_id);
create index if not exists idx_wpb_type on public.website_page_blocks (block_type);
create index if not exists idx_wpb_source on public.website_page_blocks (source_page_extraction_id);

-- 4) Improved page tree
create table if not exists public.website_page_tree (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  website_id uuid not null,
  parent_id uuid references public.website_page_tree(id) on delete set null,
  page_type text not null, -- home|about|services|service_detail|pricing|testimonials|portfolio|faq|blog_index|contact|lead_magnet|thank_you|ad_landing|custom
  title text not null,
  slug text not null,
  full_path text not null,
  order_index integer not null default 0,
  is_funnel_page boolean not null default false,
  is_seo_page boolean not null default false,
  is_published boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  page_content_blocks jsonb not null default '[]'::jsonb, -- [{ block_id, order, settings }]
  tree_status text not null default 'draft', -- draft|published|archived
  supervisor_verification jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (website_id, full_path)
);
create index if not exists idx_wpt_tenant_website on public.website_page_tree (tenant_id, website_id);
create index if not exists idx_wpt_parent on public.website_page_tree (parent_id);
create index if not exists idx_wpt_path on public.website_page_tree (full_path);

-- 5) Old extraction -> new tree node
create table if not exists public.website_page_map (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  website_id uuid not null,
  original_page_extraction_id uuid not null references public.website_page_extractions(id) on delete cascade,
  new_page_id uuid not null references public.website_page_tree(id) on delete cascade,
  mapping_type text not null, -- direct_reuse|content_merged|redirect_only|no_equivalent
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (original_page_extraction_id, new_page_id)
);
create index if not exists idx_wpm_tenant_website on public.website_page_map (tenant_id, website_id);
create index if not exists idx_wpm_original on public.website_page_map (original_page_extraction_id);
create index if not exists idx_wpm_new on public.website_page_map (new_page_id);

-- 6) Pipeline state on websites (keyed step0_intake..step7_publish; see .architect/DATA-MODEL.md)
alter table public.websites
  add column if not exists wizard_pipeline_state jsonb not null default '{}'::jsonb;
