-- Step 26: per-page settings (visibility + redirects).
-- Apply manually (supabase db push / SQL editor). RLS unchanged (interim model).
--
-- NOTE: slug already exists on website_pages and already has a per-tenant unique
-- constraint (unique_slug_per_tenant, from migration 0002), so it is NOT
-- re-added here. This migration only adds the new settings columns.

ALTER TABLE website_pages
  ADD COLUMN IF NOT EXISTS is_hidden boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS redirect_url text;
