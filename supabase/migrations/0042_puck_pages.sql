-- Puck editor pages: stores the Puck Data JSON per tenant + slug.
create table if not exists public.website_puck_pages (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  slug text not null default 'home',
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (tenant_id, slug)
);

create index if not exists website_puck_pages_tenant_idx on public.website_puck_pages (tenant_id);
