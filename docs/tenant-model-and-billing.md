# Tenant Model + Billing Exemption (registered design)

> Design/registration only. No DDL applied. The billing flag is parked as
> quarantined DDL in `supabase/DDL_QUEUE.md` (PENDING) until we build billing.

## ✅ Provisioned (live, 2026-05-31)

Created via `scripts/bootstrap-owner-tenants.mjs --commit` (real rows in `tenants` +
owner rows in `tenant_users`):

| Tenant | Domain | tenant_id |
|--------|--------|-----------|
| AIBizConnect Platform | aibizconnect.app | `d723a086-eac0-4b61-8742-25313370d0b7` |
| AIBizConnect Consulting | aibizconnect.ca | `214ca58a-c76f-48d6-97ec-3f040db3b81f` |

Admin `user_id` (represents `admin@aibizconnect.app`, owner of both):
`0fb27063-3a54-4aa0-9577-bde6182e1456`

> NOTE: `tenants` / `tenant_users` / `tenant_settings` tables ALREADY EXIST (managed
> by the backend) — the earlier Cycle-3 "create tenant_users" note was WRONG. The
> admin user_id is a placeholder identity until real auth (Supabase Auth) is built;
> it will be reconciled to the real `sub` then (see `docs/auth-foundation-design.md`).

## Owner tenants (internal, not charged — for now)

| Tenant | Domain | Purpose | Billing |
|--------|--------|---------|---------|
| **AIBizConnect Consulting** | `aibizconnect.ca` | B2B AI **Consultation, Implementation & Integration** services site | `billing_exempt = true` (internal) |
| **AIBizConnect Platform** | `aibizconnect.app` | The platform's **own** site; also the host of the multi-tenant platform. This tenant record covers `aibizconnect.app` **only** (it is NOT a catch-all for customer tenants). | `billing_exempt = true` (internal) |

Notes:
- Both are **owner-operated / internal** tenants → exempt from charges **now**, but
  the exemption is an explicit, toggleable flag — NOT hardcoded — so they can be
  switched to a paid plan later without code changes.
- Customer tenants (added later) default to **not** exempt.

## Billing-exemption requirement

- Register a per-tenant billing posture so "don't charge my own usage" is **data**,
  not a special case in code.
- Must be reversible: flipping `billing_exempt` to `false` (and assigning a plan)
  starts normal billing for that tenant.
- Integrates with the EXISTING billing surface (the repo already has a billing
  route + Stripe portal). This adds the *exemption/plan* state those consume.

## Proposed schema (DESIGN — quarantined, not applied)

Because tenant identity is external, this can live EITHER in the external backend's
tenant model OR as a local companion table. Local-companion option:

```sql
-- per-tenant billing posture (NOT APPLIED — see DDL queue)
create table if not exists public.tenant_billing (
  tenant_id uuid primary key,
  is_internal boolean not null default false,   -- owner/internal tenant
  billing_exempt boolean not null default false,-- do not charge while true
  plan text,                                    -- null while exempt; e.g. 'starter'
  stripe_customer_id text,
  updated_at timestamptz not null default now()
);
-- seed (also NOT applied; run only after the real tenant_ids exist):
-- insert into tenant_billing (tenant_id, is_internal, billing_exempt, plan)
-- values
--   ('<AIBIZCONNECT_CA_TENANT_UUID>',  true, true, null),
--   ('<AIBIZCONNECT_APP_TENANT_UUID>', true, true, null);
```

## Status

- Registered: ✅ this doc.
- DDL: ⏳ quarantined in `supabase/DDL_QUEUE.md` — NOT applied.
- Real tenant_ids: ❌ pending (created when Ali provisions the accounts).
- Decision deferred: external-backend field vs local `tenant_billing` table.
