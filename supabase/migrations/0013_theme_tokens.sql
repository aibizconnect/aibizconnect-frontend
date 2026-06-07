-- Step 29: tenant theme tokens. Apply in the Supabase SQL editor. Idempotent.
alter table public.website_brand_settings
  add column if not exists theme jsonb not null default '{}'::jsonb;
