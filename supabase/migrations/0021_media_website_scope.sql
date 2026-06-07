-- 0021: Q2 — media stays TENANT-scoped (shared asset pool) with an OPTIONAL website_id
-- for filtering/tagging (not isolation), plus a folder_id FK for GHL-style folders
-- (a file lives in exactly one folder; null = root). All nullable so nothing breaks.
alter table website_media add column if not exists website_id uuid;   -- optional filter/tag
alter table website_media add column if not exists folder_id uuid;     -- FK -> media_folders(id), null = root
create index if not exists website_media_website_idx on website_media(website_id);
create index if not exists website_media_folder_idx  on website_media(folder_id);
