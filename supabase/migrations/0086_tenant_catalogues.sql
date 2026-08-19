-- 0086 — Knowledge Catalogue (A2A). One versioned, machine-readable business profile
-- per tenant that AI agents READ (to cite) and CALL (to query). The whole document
-- lives in a jsonb column (`doc`) and is validated in code by lib/catalogue/schema.ts —
-- schema-light on purpose, mirroring tenant_ai_agents (0053). `vertical` is denormalized
-- from tenants.industry_key (0077) at write time.
--
-- Lifecycle: status 'draft' | 'published'. Passive routes read the latest 'published'
-- row. Verification/freshness of REGULATED fields (license #, ratings) is governed inside
-- the doc (verification.*), not by this row's status — see schema.isVerificationFresh.
create table if not exists public.tenant_catalogues (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  version integer not null default 1,
  status text not null default 'draft',   -- draft | published
  doc jsonb not null default '{}'::jsonb,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, version)
);
create index if not exists idx_tenant_catalogues_tenant on public.tenant_catalogues (tenant_id);
-- Fast "latest published for this tenant" lookup used by the llms.txt / .well-known routes.
create index if not exists idx_tenant_catalogues_published
  on public.tenant_catalogues (tenant_id, version desc)
  where status = 'published';

-- interim-open RLS (matches 0085_marketplace.sql / 0069_store.sql); tenant scoping is
-- enforced in code via .eq("tenant_id", …). Public read is intentional: the published
-- catalogue is meant to be fetched by external AI agents.
alter table public.tenant_catalogues enable row level security;
create policy tenant_catalogues_interim_open on public.tenant_catalogues for all using (true) with check (true);
