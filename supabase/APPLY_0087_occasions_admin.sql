-- ════════════════════════════════════════════════════════════════════════════
-- 0087 — Occasions: staff admin controls + install telemetry.
--
-- ADDITIVE & SAFE. Every column has a default, so existing rows are unchanged:
--   • accounts stay `active = true`
--   • `site_cap` stays NULL  → keep using the PLAN default (free = 1, paid = 5;
--     the AI Biz Connect owner location is always unlimited). A number overrides it.
--   • sites get `last_seen_at`/`install_count` for "is the snippet actually live?"
--
-- Apply in the Supabase SQL editor (service role). No data is moved or deleted.
-- ════════════════════════════════════════════════════════════════════════════

-- 1) Account-level admin controls (staff manage existing GHL accounts).
alter table public.occasion_widget_accounts
  add column if not exists active   boolean not null default true,  -- suspend/enable the account's dashboard + onboarding
  add column if not exists site_cap integer;                        -- NULL = plan default; a number overrides the domain cap

-- 2) Install telemetry per site — stamped when the embedded widget's feed is
--    actually loaded on the live, host-matched domain, so staff (and the customer)
--    can tell which domains have really installed the snippet vs. only registered.
alter table public.occasion_widget_sites
  add column if not exists last_seen_at  timestamptz,
  add column if not exists install_count integer not null default 0;

create index if not exists occasion_widget_sites_last_seen_idx
  on public.occasion_widget_sites (last_seen_at);
