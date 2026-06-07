-- Run this in the Supabase SQL editor.
-- website_pages pre-existed (id, tenant_id, title, slug, created_at) so the base
-- CREATE in APPLY_ALL was a no-op and these two builder columns were missing.
-- The table is empty, so the defaults apply cleanly.

alter table public.website_pages
  add column if not exists order_index integer not null default 0,
  add column if not exists is_home boolean not null default false;
