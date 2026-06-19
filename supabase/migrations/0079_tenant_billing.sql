-- 0079: Platform-level SUBSCRIBER billing on tenants. We (AIBizConnect) are the SaaS;
-- each tenant is OUR subscriber. This is distinct from the tenant Payments module
-- (tenant_invoices/…), which is a tenant billing THEIR OWN customers.
--
-- `tenants.plan` (free|starter|pro|premium|agency|enterprise) already exists; this adds
-- the lifecycle fields a SaaS billing admin needs: status, trial end, next-due date, and
-- an optional per-tenant monthly-amount override (for custom/enterprise deals). The
-- platform Subscribers console (/platform/tenants) reads + edits these. Until applied,
-- that console falls back to deriving status from plan + created_at (read-only).

alter table public.tenants
  -- 'trialing' | 'active' | 'past_due' | 'canceled' | 'comp'  (comp = free-to-play)
  add column if not exists billing_status text not null default 'trialing',
  add column if not exists trial_ends_at timestamptz,
  -- next payment due / current period end (null while trialing or comped)
  add column if not exists current_period_end timestamptz,
  -- optional override of the plan's catalog price, in cents (custom/enterprise deals)
  add column if not exists monthly_amount_cents integer;

-- New paid tenants start with a 14-day trial from creation unless already set.
update public.tenants
   set trial_ends_at = created_at + interval '14 days'
 where trial_ends_at is null
   and billing_status = 'trialing';

-- The platform tenant itself is our own workspace — comp it so it never reads as "due".
update public.tenants
   set billing_status = 'comp'
 where id = 'd723a086-eac0-4b61-8742-25313370d0b7';

create index if not exists tenants_billing_status_idx on public.tenants (billing_status);
