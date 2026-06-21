-- 0084 (D-398): Occasions Widget lead-gen tool. External website owners register (via the GHL
-- funnel on aibizconnect.ca) their name/email/domain; they paste a <script> that injects active
-- festive occasions on their site, gated on a REGISTERED + active domain. NOT tenants.
create table if not exists public.occasion_widget_sites (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,                 -- public embed key (in the <script> src)
  name text,
  email text,
  domain text not null,                     -- canonical hostname, lowercased, no www/protocol/path
  occasions jsonb not null default '{}'::jsonb,  -- OccasionsConfig (lib/occasions.ts)
  active boolean not null default true,     -- master on/off
  verified boolean not null default false,  -- reserved: optional domain-ownership verification
  source text,                              -- 'ghl_funnel' | 'manual' | ...
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (domain)                           -- a domain registers once
);
create index if not exists idx_occasion_widget_sites_key on public.occasion_widget_sites (key);
create index if not exists idx_occasion_widget_sites_domain on public.occasion_widget_sites (domain);
