-- 0032_domain_email.sql
-- Domain + Email phase (architect-approved, Cloudflare-based). Robust to tenant_domains
-- already existing in the live DB (middleware routes on its subdomain/custom_domain columns):
-- CREATE IF NOT EXISTS gives a base, then idempotent ALTERs add the management columns either
-- way. Scoped by tenant_id (no external FK). No DNS in draft — only on publish.

create table if not exists public.tenant_domains (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  created_at timestamptz not null default now()
);
alter table public.tenant_domains
  add column if not exists website_id uuid,
  add column if not exists domain_name text,            -- 'example.com' or 'name.aibizconnect.app'
  add column if not exists subdomain text,               -- kept for middleware host routing
  add column if not exists custom_domain text,           -- kept for middleware host routing
  add column if not exists type text,                    -- subdomain | custom
  add column if not exists status text default 'pending_verification', -- pending_verification|verified|pending_nameserver_update|active|failed|inactive|pending_publish
  add column if not exists verification_challenge_type text,  -- cname | txt | nameserver
  add column if not exists verification_challenge_name text,
  add column if not exists verification_challenge_value text,
  add column if not exists cloudflare_zone_id text,
  add column if not exists cloudflare_dns_records_created jsonb not null default '[]'::jsonb,
  add column if not exists is_primary boolean not null default false,
  add column if not exists updated_at timestamptz not null default now();
create index if not exists idx_tenant_domains_tenant_website on public.tenant_domains (tenant_id, website_id);
create index if not exists idx_tenant_domains_domain_name on public.tenant_domains (domain_name);

-- Per-tenant email sender identity + ESP (Resend) config + the DNS auth records to add/verify.
create table if not exists public.tenant_email_settings (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  sender_name text not null,
  sender_email text not null,
  esp_provider text not null default 'resend',  -- matches tenant_integrations.provider
  esp_config jsonb not null default '{}'::jsonb, -- non-secret (region, domain id, …)
  status text not null default 'pending_verification', -- pending_verification|verified|failed
  dns_records_required jsonb not null default '[]'::jsonb, -- [{type,name,value,status}] SPF/DKIM/DMARC
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, sender_email)
);
create index if not exists idx_tenant_email_settings_tenant on public.tenant_email_settings (tenant_id);
