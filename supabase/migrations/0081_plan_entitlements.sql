-- 0081: Plan ENTITLEMENTS — the limits each subscription level grants (e.g. 100 contacts,
-- 5 seats, 1000 AI credits, 1 website). Stored as structured data so we can measure usage
-- against them, enforce caps, bill overage, and sell add-ons. Each item:
--   { key, label, included, unit, overageCents, enforce }
--   enforce ∈ 'off' (track only) | 'warn' | 'block'   overageCents = price per extra unit (null = n/a)
alter table public.subscription_plans
  add column if not exists entitlements jsonb not null default '[]'::jsonb;
