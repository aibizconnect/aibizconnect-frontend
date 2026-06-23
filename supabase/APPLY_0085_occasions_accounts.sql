-- ════════════════════════════════════════════════════════════════════════════
-- 0085 — Occasions Widget: paid GHL accounts + multi-domain ownership.
-- ADDITIVE & SAFE. Existing public registrations keep working unchanged
-- (owner_type defaults to 'public', plan defaults to 'free', badge defaults true).
-- Apply in Supabase SQL editor (service role). No data is moved or deleted.
-- ════════════════════════════════════════════════════════════════════════════

-- 1) Ownership + tier columns on the existing widget-sites table.
alter table public.occasion_widget_sites
  add column if not exists owner_type      text    not null default 'public',  -- 'public' | 'ghl'
  add column if not exists ghl_location_id text,                               -- GHL sub-account (location) id
  add column if not exists plan            text    not null default 'free',    -- 'free' | 'paid'
  add column if not exists badge           boolean not null default true,      -- show "Powered by AIBizConnect"
  add column if not exists created_at      timestamptz not null default now();

create index if not exists occasion_widget_sites_ghl_location_idx
  on public.occasion_widget_sites (ghl_location_id);

-- 2) One row per GHL location: its display name + paid status.
--    `plan` is driven by the GHL "paid" tag → register webhook (or set manually).
create table if not exists public.occasion_widget_accounts (
  ghl_location_id text primary key,
  ghl_company_id  text,
  account_name    text,
  plan            text        not null default 'free',  -- 'free' | 'paid'
  updated_at      timestamptz not null default now(),
  created_at      timestamptz not null default now()
);
