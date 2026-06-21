-- APPLY 0084 — Occasions Widget lead-gen tool. Paste into the Supabase SQL editor and Run.
-- Additive; safe to re-run. Stores external website owners who registered (via the GHL funnel) to
-- embed the occasions widget. NOT tenants.
create table if not exists public.occasion_widget_sites (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text,
  email text,
  domain text not null,
  occasions jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  verified boolean not null default false,
  source text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (domain)
);
create index if not exists idx_occasion_widget_sites_key on public.occasion_widget_sites (key);
create index if not exists idx_occasion_widget_sites_domain on public.occasion_widget_sites (domain);
