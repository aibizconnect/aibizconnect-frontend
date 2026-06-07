-- Step 23: per-tenant section/page templates (presets a user can apply to a page).
-- Apply manually (supabase db push / SQL editor).
--
-- NAMING NOTE: Copilot's STEP 23 called this table "website_templates", but
-- STEP 18 already created a DIFFERENT website_templates (catalog with
-- website_template_pages/sections/brand_settings + the useTemplate clone flow).
-- To avoid a destructive CREATE TABLE collision, this new, simpler model lives
-- in website_section_templates. The two systems are distinct:
--   * website_templates (STEP 18)        -> full multi-page "starter kits"
--   * website_section_templates (STEP 23) -> per-page section presets
-- Recommend consolidating/retiring one of them in a future step.

create table if not exists public.website_section_templates (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  name text not null,
  description text,
  sections jsonb not null default '[]'::jsonb, -- array of SectionContent
  created_at timestamptz not null default now()
);

create index if not exists idx_website_section_templates_tenant
  on public.website_section_templates (tenant_id);

alter table public.website_section_templates enable row level security;

drop policy if exists section_templates_interim_open
  on public.website_section_templates;
create policy section_templates_interim_open
  on public.website_section_templates
  for all using (true) with check (true);
