-- 0023: Q1 — GHL-style media folders. Nested, renameable; a file references exactly
-- one folder via website_media.folder_id (added in 0021); the path is DERIVED from the
-- parent chain, never stored. Tenant-scoped (shared pool) with optional website filter.
create extension if not exists "pgcrypto";

create table if not exists media_folders (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  website_id uuid,                 -- optional: scope/tag a folder to a website
  name text not null,
  parent_id uuid references media_folders(id) on delete cascade,  -- null = top level
  created_at timestamptz not null default now()
);
create index if not exists media_folders_tenant_idx on media_folders(tenant_id);
create index if not exists media_folders_parent_idx on media_folders(parent_id);
