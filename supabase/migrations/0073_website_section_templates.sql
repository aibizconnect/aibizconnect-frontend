-- 0073 — Section Template Factory (D-363..367, Gemini+Copilot ratified).
-- Reusable SECTION templates (Header/Hero/About/Team/CTA/Form/Features/Testimonials/Footer)
-- produced by the Gemini→Stitch→render-bridge factory, plus the existing static prebuilts seeded in.
-- tenant_id NULL = system-owned (shared with every tenant); set = tenant-owned override.
create table if not exists public.website_section_templates (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid,                                   -- NULL = system/shared
  manifest    jsonb not null,                         -- {name,category,intent,variant,colorMode,blurb,thumbnailUrl,generatedBy,generatedAt}
  sections    jsonb not null,                         -- SectionContent[] (one section per template)
  content_hash text,                                  -- sha256 of `sections` (dedup)
  status      text not null default 'active',         -- pending_review | active | rejected
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists idx_wst_tenant   on public.website_section_templates (tenant_id);
create index if not exists idx_wst_category on public.website_section_templates ((manifest->>'category'));
create index if not exists idx_wst_status   on public.website_section_templates (status);
-- Dedup: the same section content can't be stored twice for the same owner (system or a tenant).
create unique index if not exists idx_wst_hash on public.website_section_templates (coalesce(tenant_id::text, 'system'), content_hash);
