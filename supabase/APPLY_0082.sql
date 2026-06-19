-- APPLY 0082 — per-plan pricing-page controls. Paste into the Supabase SQL editor and Run.
-- Idempotent & additive. Enables: annual price, custom CTA text/link, and the
-- "Everything in <lower tier>, plus" header — all set per plan in the plan editor.
alter table public.subscription_plans
  add column if not exists annual_amount_cents integer,
  add column if not exists cta_label text,
  add column if not exists cta_href text,
  add column if not exists inherit_lower boolean not null default false;

update public.subscription_plans
   set inherit_lower = true
 where tenant_id = 'd723a086-eac0-4b61-8742-25313370d0b7'
   and name in ('Pro', 'Premium', 'Agency', 'Enterprise');
