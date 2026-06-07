-- 0020: G2/Q4 — host-based public routing. A domain maps a hostname to a website
-- (and its tenant). Verified custom domains + the default subdomain both live here.
create table if not exists domains (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  website_id uuid not null,
  host text not null unique,                 -- e.g. "acme.com" or "acme.aibizconnect.app"
  is_primary boolean not null default false,
  kind text not null default 'subdomain',    -- 'subdomain' | 'custom'
  verified boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists domains_website_idx on domains(website_id);
create index if not exists domains_tenant_idx on domains(tenant_id);
