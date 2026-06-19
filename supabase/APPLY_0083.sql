-- APPLY 0083 — annual discount as percent or $ amount. Paste into Supabase SQL editor and Run.
-- Idempotent & additive. annual_discount_kind ∈ 'percent' | 'amount' | 'none' (null = auto 20% off);
-- annual_discount_value = percent points (e.g. 20) or $/mo off (e.g. 10).
alter table public.subscription_plans
  add column if not exists annual_discount_kind text,
  add column if not exists annual_discount_value numeric(12,2);
