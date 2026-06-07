-- 0019: G3 — per-website brand/theme. Allow one brand row per (tenant_id, website_id)
-- so each website stores its own theme. Backfill already set website_id on the single
-- existing row (0017). This adds the composite unique that website-scoped upserts need.
create unique index if not exists website_brand_settings_tenant_website_uidx
  on website_brand_settings (tenant_id, website_id)
  where website_id is not null;
