-- Step 28: draft/publish workflow.
-- Apply in the Supabase SQL editor. Idempotent.
-- The editor writes the in-progress state into these draft_* fields; publish
-- copies them into the live fields + website_page_sections.

alter table public.website_pages
  add column if not exists draft_title text,
  add column if not exists draft_slug text,
  add column if not exists draft_seo jsonb not null default '{}'::jsonb,
  add column if not exists draft_sections jsonb not null default '[]'::jsonb;
