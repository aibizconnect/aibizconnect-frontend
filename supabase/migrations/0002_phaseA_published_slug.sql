-- Phase A: published flag + unique slug per tenant
-- Apply manually (supabase db push / SQL editor). The app cannot run DDL.

ALTER TABLE website_pages
  ADD COLUMN IF NOT EXISTS is_public boolean DEFAULT false;

-- ADD CONSTRAINT has no IF NOT EXISTS; guard so the migration is re-runnable.
-- NOTE: this will FAIL if duplicate (tenant_id, slug) rows already exist.
-- De-duplicate first if so.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'unique_slug_per_tenant'
  ) THEN
    ALTER TABLE website_pages
      ADD CONSTRAINT unique_slug_per_tenant UNIQUE (tenant_id, slug);
  END IF;
END $$;
