-- 0083: express the annual discount as a PERCENT or a $ AMOUNT (relative to the monthly price),
-- instead of typing an absolute annual price. annual_discount_kind ∈ 'percent' | 'amount' | 'none'
-- (null = auto 20% off). value = percent points (e.g. 20) or $/mo off (e.g. 10).
alter table public.subscription_plans
  add column if not exists annual_discount_kind text,
  add column if not exists annual_discount_value numeric(12,2);
