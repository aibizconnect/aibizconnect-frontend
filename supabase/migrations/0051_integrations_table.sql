-- 0051 — create the missing tenant_integrations table (0031 drift, sibling of 0050).
--
-- Found while sending Ali's Twilio test SMS: tenant_secrets exists (creds saved fine) but
-- tenant_integrations — the NON-secret config side (from_number, provider status, Google
-- Contacts sync state, Stripe/PayPal config) — was never created live. Every integration
-- card half-saves without it. Definition copied verbatim from 0031.
create table if not exists public.tenant_integrations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  provider text not null,
  status text not null default 'disconnected',
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, provider)
);
create index if not exists idx_tenant_integrations_tenant on public.tenant_integrations (tenant_id);
create index if not exists idx_tenant_integrations_provider on public.tenant_integrations (provider);
notify pgrst, 'reload schema';
