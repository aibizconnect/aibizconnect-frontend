-- Step 25: per-page SEO / metadata fields.
-- Apply manually (supabase db push / SQL editor). RLS unchanged (interim model).

ALTER TABLE website_pages
  ADD COLUMN IF NOT EXISTS seo_title text,
  ADD COLUMN IF NOT EXISTS seo_description text,
  ADD COLUMN IF NOT EXISTS seo_image_url text,
  ADD COLUMN IF NOT EXISTS canonical_url text,
  ADD COLUMN IF NOT EXISTS noindex boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS nofollow boolean NOT NULL DEFAULT false;
