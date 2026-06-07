-- Step 32: navigation v2 (named menus + draft-aware items). Apply in SQL editor. Idempotent.
alter table public.website_navigation
  add column if not exists menu_key text not null default 'primary',
  add column if not exists draft_label text,
  add column if not exists draft_url text,
  add column if not exists draft_page_id uuid;

create index if not exists idx_website_navigation_menu
  on public.website_navigation (tenant_id, menu_key, order_index);
