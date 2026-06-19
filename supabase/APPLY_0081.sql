-- APPLY 0081 — plan ENTITLEMENTS (per-level limits). Paste into the Supabase SQL editor and Run.
-- Idempotent & additive. Enables saving each level's limits (contacts/seats/AI credits/websites/
-- custom: included qty, unit, overage $/unit, enforce off|warn|block).
alter table public.subscription_plans
  add column if not exists entitlements jsonb not null default '[]'::jsonb;
