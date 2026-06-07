-- Step 21: track when a page was published.
-- Apply manually (supabase db push / SQL editor).
-- NOTE: publishPage() writes published_at; if this migration is not applied,
-- the publish update will fail. Apply 0005 before using the publish flow.

ALTER TABLE website_pages
  ADD COLUMN IF NOT EXISTS published_at timestamptz;
