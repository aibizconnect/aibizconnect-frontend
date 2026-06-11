# DDL Queue

Pending database DDL (schema changes, RLS, constraints, indexes, RPCs) that has been
**generated but NOT yet applied** to the database.

## Protocol
- Any DDL I generate is **appended here** — never assumed to be live.
- After appending, I **wait** for you to say **"Check in"** (review) before doing anything further with it.
- I treat DDL as applied **only** when you explicitly say **"Done"**.
- On **"Done"**, I move the item from **Pending** to **Applied** below (with the date you confirmed).
- Until then, all status reporting assumes the DDL is **NOT** in the database.

## Status Legend
- ⏳ `PENDING` — generated, in queue, not reviewed
- 👀 `REVIEWED` — you said "Check in"; reviewed, still not applied
- ✅ `APPLIED` — you said "Done"; live in the database

---

## Pending

### ⏳ PENDING — Cycle 7: tenant-scoped RLS tightening
Generated: Cycle 7 (design in `docs/cycle7-rls-design.md`). **NOT applied.**
**Prerequisite (must exist first):** a verifiable `tenant_id` claim reaching Postgres
(JWT-through-PostgREST, path A) OR a service-role write path (path B). Applying the
DDL below WITHOUT the prerequisite will LOCK THE EDITOR OUT (claim_tenant() = NULL).
Do not apply until staging-verified. Switch one table at a time.

```sql
-- Helper: read the tenant claim from the verified JWT.
create or replace function claim_tenant() returns uuid
language sql stable as $$
  select nullif(((auth.jwt() -> 'app_metadata') ->> 'tenant_id'), '')::uuid
$$;

-- Per tenant table: replace interim-open with claim-scoped RW.
-- (Repeat the pattern for each table; website_pages shown as the template.)
drop policy if exists pages_interim_open on website_pages;
create policy tenant_rw_pages on website_pages
  for all
  using (claim_tenant() = tenant_id)
  with check (claim_tenant() = tenant_id);
-- public_read_pages stays as-is (is_public = true).

-- website_page_sections
drop policy if exists sections_interim_open on website_page_sections;
create policy tenant_rw_sections on website_page_sections
  for all
  using (claim_tenant() = tenant_id)
  with check (claim_tenant() = tenant_id);

-- website_brand_settings
drop policy if exists brand_interim_open on website_brand_settings;
create policy tenant_rw_brand on website_brand_settings
  for all
  using (claim_tenant() = tenant_id)
  with check (claim_tenant() = tenant_id);

-- website_navigation, website_global_blocks, website_page_block_refs,
-- website_section_templates, website_media: same tenant_rw pattern,
-- dropping each *_interim_open policy. Keep public_read_* where present.
```

_Status: ✅ APPLIED 2026-05-31 (Ali: "done"). Confirmed live — `tenant_rw_pages`
already existed (DDL re-run errored "already exists"). Cycle-7 RLS is in the DB.
Prerequisite hook assumed live since the editor is not locked out._

### ⏳ PENDING — Cycle 8: per-page version log
Generated: Cycle 8 (design in `docs/cycle8-publish-pipeline-versioning.md`). **NOT applied.**
Supports versioned publish + rollback. Append-only history table.

```sql
create table if not exists public.website_page_versions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  page_id uuid not null references public.website_pages (id) on delete cascade,
  version integer not null,
  published_at timestamptz not null default now(),
  published_by uuid,
  snapshot jsonb not null default '{}'::jsonb,
  diff_from_previous jsonb,
  rollback_of integer,
  unique (tenant_id, page_id, version)
);
create index if not exists idx_page_versions_page
  on public.website_page_versions (tenant_id, page_id, version desc);
-- enable RLS + interim-open until Cycle 7 RLS lands.
```

> ✅ VERIFIED APPLIED 2026-05-31 — all three version tables EXIST in the DB (0 rows).

Sibling version logs (per Copilot's Cycle-8 spec — blocks + nav versioning), same
shape, also NOT applied:

```sql
create table if not exists public.website_blocks_versions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  block_id uuid not null references public.website_global_blocks (id) on delete cascade,
  version integer not null,
  published_at timestamptz not null default now(),
  published_by uuid,
  snapshot jsonb not null default '{}'::jsonb,
  rollback_of integer,
  unique (tenant_id, block_id, version)
);
create table if not exists public.website_nav_versions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  menu_key text not null,
  version integer not null,
  published_at timestamptz not null default now(),
  published_by uuid,
  snapshot jsonb not null default '[]'::jsonb,
  rollback_of integer,
  unique (tenant_id, menu_key, version)
);
```

_Status: ⏳ PENDING — awaiting Ali "Check in" then "Done"._

---

### ⏳ PENDING — Billing posture (tenant_billing)
Generated from Ali's requirement: don't charge own/internal tenants now, but keep
the option. Design in `docs/tenant-model-and-billing.md`. **NOT applied.** Decision
still open: external-backend field vs this local table.

```sql
create table if not exists public.tenant_billing (
  tenant_id uuid primary key,
  is_internal boolean not null default false,
  billing_exempt boolean not null default false,
  plan text,
  stripe_customer_id text,
  updated_at timestamptz not null default now()
);
-- enable RLS + interim-open (NOT claim-based) to avoid the lockout pattern.
```
Internal tenants to seed once real tenant_ids exist (billing_exempt = true):
aibizconnect.ca (B2B consulting) and aibizconnect.app (platform site).

_Status: ✅ TABLE EXISTS (verified 2026-05-31, 0 rows). Still needs a SEED (DML) to
mark the two owner tenants billing_exempt — not DDL._

### ⏳ PENDING — Auth: custom access-token hook (tenant_id claim)
Copilot-recommended (Option 1). Injects `app_metadata.tenant_id` into the Supabase
JWT dynamically from `tenant_users` so claims always match DB reality → unblocks
Cycle-7 RLS. **NOT applied.** Apply + enable in dashboard (Auth → Hooks → Customize
Access Token) AFTER auth is live; this is the prerequisite for re-applying Cycle-7 RLS.

```sql
create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb language plpgsql stable as $$
declare
  claims jsonb := event->'claims';
  tid uuid;
begin
  select tenant_id into tid
    from public.tenant_users
   where user_id = (event->>'user_id')::uuid
     and status = 'active'
   limit 1;
  if tid is not null then
    claims := jsonb_set(claims, '{app_metadata,tenant_id}', to_jsonb(tid::text), true);
  end if;
  return jsonb_set(event, '{claims}', claims);
end;
$$;
grant execute on function public.custom_access_token_hook to supabase_auth_admin;
-- then: dashboard Auth -> Hooks -> Customize Access Token (JWT) -> select this function
```
Note: for multi-tenant users this sets the FIRST active tenant; refine to an array
or "active tenant" selection when multi-tenant switching is built.

_Status: ⏳ PENDING — awaiting Ali "Check in" then "Done"._

### ⏳ PENDING — FIX: public read for global blocks + block refs
After Cycle-7 RLS went live, `website_global_blocks` + `website_page_block_refs`
have NO public-read policy → footers/global blocks are hidden from anonymous
visitors. Verified via anon probe (0 rows). File: `supabase/fix-public-read-blocks.sql`.
**Apply to restore public footer rendering.**

```sql
drop policy if exists public_read_global_blocks on public.website_global_blocks;
create policy public_read_global_blocks on public.website_global_blocks for select using (true);
drop policy if exists public_read_block_refs on public.website_page_block_refs;
create policy public_read_block_refs on public.website_page_block_refs for select using (true);
```

_Status: ✅ APPLIED 2026-05-31 ("Success, no rows returned"). Re-verified via anon
probe: global_blocks (1) + block_refs (11) now visible. Footers restored._

### ⏳ PENDING — Supervision: agent_runs + supervisor_events
For the supervised execution choke-point (`lib/agent/supervisor.ts`). The code
writes to these but degrades gracefully (try/catch + console) until applied — so
the agent works now; persistence/audit turns on once these exist. **NOT applied.**

```sql
create table if not exists public.agent_runs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  user_id uuid,
  plan_hash text,
  action_count integer not null default 0,
  dry_run boolean not null default true,
  status text,
  reflection jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_agent_runs_tenant on public.agent_runs (tenant_id, created_at desc);

create table if not exists public.supervisor_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  user_id uuid,
  plan_hash text,
  stage text,            -- 'pre-commit' | 'post-run'
  breakpoint text,       -- A–G taxonomy
  reason text,
  details jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_supervisor_events_tenant on public.supervisor_events (tenant_id, created_at desc);
-- enable RLS + interim-open (NOT claim-based) to avoid the lockout pattern.
```

_Status: ✅ APPLIED 2026-05-31 (Ali: "Success, no rows returned")._

### ✅ APPLIED — Mesh P4: memory namespaces (domain + role columns)
Copilot-ratified (M-1). Adds per-agent namespacing to the supervision tables so
runs/events are queryable by domain and role ("all email.creator runs for tenant X").
Apply AFTER the agent_runs/supervisor_events tables above exist. **NOT applied.**

```sql
alter table public.agent_runs        add column if not exists domain text;
alter table public.agent_runs        add column if not exists role   text;
alter table public.supervisor_events add column if not exists domain text;
alter table public.supervisor_events add column if not exists role   text;
create index if not exists idx_agent_runs_domain_role
  on public.agent_runs (tenant_id, domain, role, created_at desc);
create index if not exists idx_supervisor_events_domain_role
  on public.supervisor_events (tenant_id, domain, role, created_at desc);
```

_Status: ✅ APPLIED 2026-05-31 (Ali: "Success, no rows returned")._

### ✅ APPLIED — Mesh DL-2/M-3: tenant brand/design memory
Backs the shared brand memory (`lib/design/brand-memory.ts`) that all roles read for
cohesion. Code degrades to house defaults until applied. **NOT applied.**

```sql
create table if not exists public.tenant_brand_memory (
  tenant_id  uuid primary key,
  tokens     jsonb not null default '{}'::jsonb,   -- BrandTokens (lib/design/tokens.ts)
  voice      jsonb not null default '{}'::jsonb,    -- BrandVoice
  ia         jsonb not null default '{}'::jsonb,    -- InformationArchitecture
  updated_at timestamptz not null default now()
);
-- enable RLS + interim-open (NOT claim-based) to avoid the lockout pattern.
-- writes are service-role (supervisor-gated); reads are tenant-scoped in app code.
```

_Status: ⏳ PENDING — awaiting Ali "Check in" then "Done"._

### ✅ APPLIED — FIX v2: recreate agent_runs/supervisor_events (legacy schema clash)
_Applied 2026-06-01 (Ali: "Success, no rows returned"). Verified via
scripts/verify-mesh-memory.mjs: both tables accept the exact supervisor insert shapes
(incl. domain/role); probe rows inserted + cleaned. Audit/memory persistence is LIVE._

The pre-existing tables carry legacy NOT-NULL columns the supervisor code never
populates (`agent_runs.plan_json`, `supervisor_events.payload`), so every audit
insert fails the not-null constraint (swallowed by try/catch). Both tables are
EMPTY (0 rows), so dropping + recreating to the canonical shape is safe and removes
the legacy cruft. This SUPERSEDES the "missing columns" ALTER block below.

```sql
drop table if exists public.agent_runs cascade;
drop table if exists public.supervisor_events cascade;

create table public.agent_runs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  user_id uuid,
  plan_hash text,
  action_count integer not null default 0,
  dry_run boolean not null default true,
  status text,
  reflection jsonb,
  domain text,
  role text,
  created_at timestamptz not null default now()
);
create index idx_agent_runs_tenant on public.agent_runs (tenant_id, created_at desc);
create index idx_agent_runs_domain_role on public.agent_runs (tenant_id, domain, role, created_at desc);

create table public.supervisor_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  user_id uuid,
  plan_hash text,
  stage text,
  breakpoint text,
  reason text,
  details jsonb,
  domain text,
  role text,
  created_at timestamptz not null default now()
);
create index idx_supervisor_events_tenant on public.supervisor_events (tenant_id, created_at desc);
create index idx_supervisor_events_domain_role on public.supervisor_events (tenant_id, domain, role, created_at desc);

alter table public.agent_runs        enable row level security;
alter table public.supervisor_events enable row level security;
create policy agent_runs_interim_open        on public.agent_runs        for all using (true) with check (true);
create policy supervisor_events_interim_open on public.supervisor_events for all using (true) with check (true);

NOTIFY pgrst, 'reload schema';
```

_Status: ⏳ PENDING — awaiting Ali "Check in" then "Done"._

### ⏳ SUPERSEDED — FIX: agent_runs/supervisor_events missing columns
The audit tables PRE-EXISTED (older partial versions), so the Cycle's
`create table if not exists` was a no-op and never added the newer columns. Probed
via `scripts/verify-mesh-memory.mjs`: agent_runs missing [action_count, status,
reflection]; supervisor_events missing [reason, details]. (domain/role DID get added
by the M-1 ALTER.) These additive ALTERs bring the live tables to the intended shape
so persistence inserts succeed. **NOT applied.**

```sql
alter table public.agent_runs        add column if not exists action_count integer not null default 0;
alter table public.agent_runs        add column if not exists status       text;
alter table public.agent_runs        add column if not exists reflection   jsonb;
alter table public.supervisor_events add column if not exists reason       text;
alter table public.supervisor_events add column if not exists details      jsonb;
-- then refresh PostgREST: NOTIFY pgrst, 'reload schema';
```

_Status: ⏳ PENDING — awaiting Ali "Check in" then "Done"._

### ✅ APPLIED 2026-06-01 — Per-tenant design-system toggle (Ali's direction)
Ali's decision: the new design-system renderer should be a PER-TENANT control (each
tenant flips their own site), not a global env flag. Adds a tenant-owned boolean the
public page reads instead of DESIGN_SYSTEM_RENDER. **NOT applied** — and not wired
yet ("keep it the way you did" for now); queued so it's ready when we pick it up.

```sql
alter table public.tenant_brand_memory add column if not exists design_system_enabled boolean not null default false;
```
Follow-up (code, when activated): public page reads tenant_brand_memory.design_system_enabled
instead of process.env.DESIGN_SYSTEM_RENDER; add a toggle in the tenant's settings/Agents panel.

_Status: ⏳ PENDING — awaiting Ali "Check in" then "Done"._

### ✅ APPLIED 2026-06-01 — Tenant domain model: subdomain-first, custom domain = paid (Ali)
Ali's product rule: every tenant gets a SUBDOMAIN of our domain by default (free) —
e.g. {subdomain}.aibizconnect.app — and may upgrade to a custom domain (point their
own, or buy one from us) as a PAID add-on. This table holds that mapping; custom-domain
activation ties to billing (tenant_billing). **NOT applied.**

```sql
create table if not exists public.tenant_domains (
  tenant_id            uuid primary key,
  subdomain            text unique not null,          -- {subdomain}.aibizconnect.app (free default)
  custom_domain        text unique,                   -- null until purchased/pointed
  custom_domain_status text not null default 'none',  -- none | pending_dns | active
  custom_domain_paid   boolean not null default false,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create index if not exists idx_tenant_domains_custom on public.tenant_domains (custom_domain) where custom_domain is not null;
-- enable RLS + interim-open (NOT claim-based) to avoid the lockout pattern.
```
Follow-up (code, when activated): host-based routing in middleware -> resolve
{subdomain}.aibizconnect.app or active custom_domain to a tenant; gate custom_domain
activation behind billing.

_Status: ⏳ PENDING — awaiting Ali "Check in" then "Done"._

### ✅ APPLIED 2026-06-01 — UI-2: in-app G-approval queue (agent_approvals)
Persists Human-Approval (G) breakpoints as actionable approval items so tenants can
approve/deny send/spend/call actions in-app. Supervisor writes a pending row on G;
the UI lists + decides. Code degrades gracefully until applied. **NOT applied.**

```sql
create table if not exists public.agent_approvals (
  id               uuid primary key default gen_random_uuid(),
  tenant_id        uuid not null,
  user_id          uuid,
  domain           text,
  role             text,
  plan             jsonb not null,
  gated_action_ids jsonb,
  reason           text,
  status           text not null default 'pending',  -- pending | approved | denied
  created_at       timestamptz not null default now(),
  decided_at       timestamptz,
  decided_by       uuid
);
create index if not exists idx_agent_approvals_tenant_status
  on public.agent_approvals (tenant_id, status, created_at desc);
alter table public.agent_approvals enable row level security;
drop policy if exists agent_approvals_interim_open on public.agent_approvals;
create policy agent_approvals_interim_open on public.agent_approvals for all using (true) with check (true);
```

_Status: ⏳ PENDING — awaiting Ali "Check in" then "Done"._

### ✅ APPLIED 2026-06-01 — FIX: tenant_domains → multi-row (Ali's multi-domain/agent/payer model)
The applied tenant_domains uses tenant_id as PRIMARY KEY = only ONE row per tenant.
Ali's rule needs MANY domains/websites per tenant, agent-owned domains, and a payer.
Recreate with id PK + ownership + payer. Empty (only a test seed) -> safe to recreate.
`tenants` and `users` tables exist, so the FKs are valid. **NOT applied.**

```sql
drop table if exists public.tenant_domains cascade;
create table public.tenant_domains (
  id                   uuid primary key default gen_random_uuid(),
  tenant_id            uuid not null references public.tenants(id) on delete cascade,
  owner_user_id        uuid references public.users(id) on delete set null,  -- agent/seat; null = tenant-level
  website_id           uuid,                                                 -- which site (tenant may have many)
  subdomain            text unique,                                          -- {subdomain}.aibizconnect.app (free)
  custom_domain        text unique,                                          -- paid
  custom_domain_status text not null default 'none',                         -- none | pending_dns | active
  payer                text not null default 'tenant' check (payer in ('tenant','user','parent_tenant')),
  paid_by_tenant_id    uuid references public.tenants(id) on delete set null,
  paid                 boolean not null default false,
  is_primary           boolean not null default true,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create index if not exists idx_tenant_domains_tenant on public.tenant_domains (tenant_id);
create index if not exists idx_tenant_domains_custom on public.tenant_domains (custom_domain) where custom_domain is not null;
alter table public.tenant_domains enable row level security;
create policy tenant_domains_interim_open on public.tenant_domains for all using (true) with check (true);
```

_Status: ⏳ PENDING — awaiting Ali "Check in" then "Done". Re-seed subdomains after apply._

### ✅ APPLIED 2026-06-01 — Entitlement engine (Copilot's 3 tables — schema-VALIDATED)
Copilot gave Ali SQL for tenant_feature_policies / user_feature_entitlements /
billing_responsibilities. Verified: `tenants(id)` and `users(id)` BOTH EXIST, so the
FKs are valid as written. Safe to apply as-is. (Mirrored here for queue tracking.)
Universal entitlement model: per-tenant feature policy + per-user override + payer.
_Status: ⏳ PENDING — Ali holds Copilot's SQL; apply when ready. No conflict with our schema._

### ✅ APPLIED 2026-06-01 — FIX: entitlement/domain user FK -> auth.users (not empty public.users)
_Verified: user_purchase override now resolves enabled with payerType=user, payerId=<auth user>._

The entitlement tables + tenant_domains FK user_id/owner_user_id to public.users(id),
but real identities live in auth.users (public.users has 0 rows) — so user-level
entitlements/overrides + agent-owned domains can never satisfy the FK. Repoint to
auth.users. Tables are empty -> safe. (tenants(id) FK is CORRECT — verified.)

```sql
alter table public.user_feature_entitlements drop constraint if exists user_feature_entitlements_user_id_fkey;
alter table public.user_feature_entitlements
  add constraint user_feature_entitlements_user_id_fkey foreign key (user_id) references auth.users (id) on delete cascade;

alter table public.tenant_domains drop constraint if exists tenant_domains_owner_user_id_fkey;
alter table public.tenant_domains
  add constraint tenant_domains_owner_user_id_fkey foreign key (owner_user_id) references auth.users (id) on delete set null;
```

_Status: ⏳ PENDING — awaiting Ali "Check in" then "Done"._

### ✅ APPLIED 2026-06-01 — Custom-domain DNS verification columns
Supports the verify flow: a TXT challenge token + verified timestamp on each custom
domain. Status uses 'pending_payment' | 'pending_dns' | 'active' (free text, no DDL
for the enum). **NOT applied.**

```sql
alter table public.tenant_domains add column if not exists verification_token text;
alter table public.tenant_domains add column if not exists verified_at timestamptz;
NOTIFY pgrst, 'reload schema';
```

_Status: ⏳ PENDING — awaiting Ali "Check in" then "Done"._

## Applied

- **2026-06-11 — Multi-account calendar connections (0048)** (Ali: "Success. No rows
  returned"): ✅ APPLIED. Connection key now includes account_email (+ feed URL for
  iCal) — several Google/Outlook accounts per booking calendar (D-251). Live-verified:
  second google account row inserts cleanly, exact duplicate still rejected
  (.stitch-out/test-multiaccount.ts ALL CHECKS PASS).
- **2026-06-11 — Drop v0 same-start unique index (0047)** (Ali: "Success. No rows
  returned"): ✅ APPLIED. tenant_appointments_slot_idx removed; conflict protection now
  fully in code (interval overlap + personal-calendar busy + staff override, D-241).
  Live-verified post-apply: test-conflicts.ts passes 8/8 incl. forced identical-start
  override ("4d. identical-start override OK (0047 applied)").
- **2026-06-11 — Contacts soft-delete (0046)** (Ali: "Success. No rows returned"):
  ✅ APPLIED. deleted_at + index. Verified live: delete → Restore tab → restore →
  visible again; purge = permanent. GHL parity sweep fully operational.
- **2026-06-11 — Calendar converge (0044) + Contacts parity (0045)** (Ali: "success",
  consolidated block): ✅ APPLIED. tenant_calendars converged to 0041 (buffer/timezone/
  assignee/updated_at), appointment status check widened to the v1 set, connections table
  ensured; tenant_contacts gained custom/company/owner_email/dnd/updated_at; notes, tasks
  and smart-lists tables created. BOTH round-trips pass live end-to-end (calendar: manual
  appt + blocked time + confirmed status + slot exclusion; contacts: extended fields,
  notes/tasks/smart lists, import dedupe).
- **2026-06-11 — Calendar GHL-parity columns (0043_calendar_parity.sql)** (Ali: "Success.
  No rows returned"): ✅ APPLIED. tenant_appointments gained external_event_id (live DB
  predated 0041's column), end_at, title, notes, kind, source, updated_at + the external-event
  unique index and the range index. Calendar v1 (grid/appointments/blocked time) fully live.
- **2026-05-31 — Supervision audit + Mesh memory namespaces** (Ali: "Success, no rows
  returned"): ✅ APPLIED. (1) `agent_runs` + `supervisor_events` tables + indexes +
  interim-open RLS; (2) M-1 `domain`/`role` columns + composite indexes on both;
  (3) `tenant_brand_memory` (tokens/voice/ia jsonb) + interim-open RLS. Persistent
  audit, per-agent namespacing, and shared brand memory are now LIVE (previously
  degrading-gracefully). No claim-based RLS used → no lockout risk.
- **2026-05-31 — Cycle 7 RLS (re-applied) + auth access-token hook**: ✅ APPLIED
  ("succeeded"). Verified: anon still reads pages/sections/brand/nav (public_read
  policies). Editor writes use the logged-in JWT claim. NOTE: surfaced a gap —
  global_blocks/block_refs need the public-read fix above.

- **2026-05-31 — Cycle 8 version tables** (`website_page_versions`,
  `website_blocks_versions`, `website_nav_versions`): ✅ APPLIED ("Success, no
  rows returned"). Additive/harmless. Verified safe.
- **2026-05-31 — Cycle 7 RLS**: APPLIED → **REVERTED** (`supabase/rollback-cycle7-rls.sql`).
  It LOCKED THE EDITOR OUT (anon writes denied, `claim_tenant()` = NULL). Ali ran the
  rollback; re-verified via anon-key probe: writes SUCCEED again. Editor restored.
  Do NOT re-apply Cycle 7 RLS until the JWT-claim (or service-role-write)
  prerequisite is built and staging-verified.
