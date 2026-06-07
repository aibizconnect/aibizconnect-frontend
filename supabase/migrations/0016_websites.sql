-- 0016_websites.sql
-- Make "website" a first-class entity (Copilot ruling): a tenant is a CONTAINER of
-- one or more websites; each website has its own pages, global header/footer, theme,
-- and SEO defaults. Pages/global blocks move from tenant-scoped to website-scoped.
--
-- Safe to run once; idempotent. Backfills a single primary "Main Website" per tenant
-- and assigns all existing pages + global blocks to it.

create extension if not exists "pgcrypto";

-- A pre-existing, unrelated `websites` table (id, name, domain, created_at, status —
-- no tenant_id) blocks CREATE TABLE IF NOT EXISTS. If present and lacking tenant_id,
-- preserve it under a backup name, then create our schema cleanly.
do $$
begin
  if exists (select 1 from information_schema.tables
             where table_schema = 'public' and table_name = 'websites')
     and not exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'websites' and column_name = 'tenant_id')
  then
    execute 'alter table public.websites rename to websites_legacy_backup';
  end if;
end $$;

create table if not exists websites (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  name text not null,
  slug text not null default 'main',
  primary_domain text,
  is_primary boolean not null default false,
  seo_defaults jsonb not null default '{}'::jsonb,  -- per-website SEO defaults (language, schema_type, author…)
  theme jsonb,                                       -- per-website theme override (null = inherit tenant)
  created_at timestamptz not null default now()
);
create index if not exists websites_tenant_idx on websites(tenant_id);

-- One default website per tenant that already has pages.
insert into websites (tenant_id, name, slug, is_primary)
select t.tenant_id, 'Main Website', 'main', true
from (select distinct tenant_id from website_pages) t
where not exists (select 1 from websites w where w.tenant_id = t.tenant_id);

-- Scope pages + global blocks to a website.
alter table website_pages         add column if not exists website_id uuid;
alter table website_global_blocks add column if not exists website_id uuid;

-- Backfill: assign existing pages + blocks to the tenant's primary website.
update website_pages p
   set website_id = w.id
  from websites w
 where w.tenant_id = p.tenant_id and w.is_primary and p.website_id is null;

update website_global_blocks b
   set website_id = w.id
  from websites w
 where w.tenant_id = b.tenant_id and w.is_primary and b.website_id is null;

create index if not exists website_pages_website_idx        on website_pages(website_id);
create index if not exists website_global_blocks_website_idx on website_global_blocks(website_id);

-- NOTE: this app uses a custom JWT + service-role server actions for tenant scoping
-- (not Supabase Auth), so RLS is enforced at the action layer. If you later enable
-- RLS on `websites`, gate by tenant_id like the other website_* tables.
