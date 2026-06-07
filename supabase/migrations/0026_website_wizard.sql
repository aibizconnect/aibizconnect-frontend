-- 0026_website_wizard.sql
-- Multitenant onboarding wizard (Copilot ruling, Option A).
--   * websites.subdomain  — the reserved slug (e.g. "acme" → acme.aibizconnect.app).
--                           Reserved in the DB at creation; DNS is NOT registered here
--                           (Cloudflare CNAME is created on PUBLISH, production only).
--   * websites.status     — lifecycle state machine value (default 'draft').
--                           Already referenced by /api/websites/[id]/publish.
--   * websites.wizard     — the raw wizard payload (business name, industry, country,
--                           audience, services, tone, presence, template family, …).
-- Idempotent / safe to run once.

alter table websites add column if not exists subdomain text;
alter table websites add column if not exists status   text not null default 'draft';
alter table websites add column if not exists wizard   jsonb not null default '{}'::jsonb;

-- A subdomain is globally unique across all tenants (it's the public host label).
-- Partial unique index ignores rows that haven't reserved one yet.
create unique index if not exists websites_subdomain_uidx
  on websites (lower(subdomain))
  where subdomain is not null;

create index if not exists websites_status_idx on websites(status);

-- NOTE: tenant scoping is enforced at the server-action layer (custom JWT + service
-- role), not via Supabase Auth RLS — same pattern as the other website_* tables.
