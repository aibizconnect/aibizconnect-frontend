-- 0054 (D-280): email campaigns (the Marketing menu). One jsonb config per campaign
-- (name, subject, body, audience, status, stats, send log) — shape lives in
-- lib/server/email-campaigns.ts. Until applied, the store falls back to
-- tenant_settings rows keyed 'email_campaign:<id>'.
create table if not exists public.tenant_email_campaigns (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists tenant_email_campaigns_tenant_idx on public.tenant_email_campaigns (tenant_id);
