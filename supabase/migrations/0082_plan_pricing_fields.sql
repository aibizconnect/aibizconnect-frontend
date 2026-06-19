-- 0082: per-plan pricing-page controls the tenant sets in the plan editor:
--   annual_amount_cents — the $/mo when billed yearly (drives the Monthly/Annual switch; null = derive 20% off)
--   cta_label / cta_href — the button text + link (e.g. "Start Free", "Start Now", "Contact sales")
--   inherit_lower       — show the "Everything in <lower tier>, plus" header
alter table public.subscription_plans
  add column if not exists annual_amount_cents integer,
  add column if not exists cta_label text,
  add column if not exists cta_href text,
  add column if not exists inherit_lower boolean not null default false;

-- Our own catalog polish: keep the "Everything in …, plus" headers on the non-entry tiers
-- (matches the original pricing design). Tenant-scoped to the platform workspace; harmless elsewhere.
update public.subscription_plans
   set inherit_lower = true
 where tenant_id = 'd723a086-eac0-4b61-8742-25313370d0b7'
   and name in ('Pro', 'Premium', 'Agency', 'Enterprise');
