-- 0024_page_background.sql
-- Per-page background (solid colour / gradient / image) shown behind all sections
-- of a single page. Stored as an ElementStyle jsonb. Read by the editor canvas,
-- the preview route, and the public site. Falls back to the site-wide default
-- (website_brand_settings.theme.pageBackground) when a page has none of its own.
--
-- Single column (no draft/published split): like draft_seo, this doubles as the
-- applied value so the public site reflects it immediately on publish.

ALTER TABLE website_pages
  ADD COLUMN IF NOT EXISTS page_background jsonb;

COMMENT ON COLUMN website_pages.page_background IS
  'Per-page background (ElementStyle: bg/bgImage/bgImageMode/bgFade/bgBlur/...). Null = inherit the site-wide default.';
