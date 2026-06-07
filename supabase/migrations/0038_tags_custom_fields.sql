-- 0038_tags_custom_fields.sql
-- Tenant-level CRM building blocks (GoHighLevel parity): Tags + Custom Fields. Tenant-scoped in code
-- (no external FKs, RLS deferred — consistent with the rest of the schema).

-- Tags: reusable labels applied to contacts/opportunities later. Unique per tenant (case-insensitive).
create table if not exists public.tenant_tags (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  name text not null,
  color text not null default '#1e3a8a',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists tenant_tags_unique_name
  on public.tenant_tags (tenant_id, lower(name));
create index if not exists tenant_tags_tenant_idx on public.tenant_tags (tenant_id);

-- Custom Fields: tenant-defined fields on CRM objects (contact / opportunity).
create table if not exists public.tenant_custom_fields (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  object_type text not null default 'contact',          -- contact | opportunity
  name text not null,                                    -- display label
  field_key text not null,                               -- machine key (slug), unique per object
  field_type text not null default 'text',               -- text | textarea | number | date | dropdown | checkbox | phone | email | url
  options jsonb not null default '[]'::jsonb,             -- for dropdown
  required boolean not null default false,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists tenant_custom_fields_unique_key
  on public.tenant_custom_fields (tenant_id, object_type, lower(field_key));
create index if not exists tenant_custom_fields_tenant_idx
  on public.tenant_custom_fields (tenant_id, object_type, position);
