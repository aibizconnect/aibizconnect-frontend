-- 0033_social_accounts.sql
-- Social integrations phase (architect-approved, D-028). Tenant-scoped multi-account-per-provider
-- model: one OAuth grant can yield several connectable entities (FB Pages, IG business accounts,
-- LinkedIn org pages, YouTube channels), so accounts get their own table rather than overloading
-- tenant_integrations (which is UNIQUE per provider). OAuth tokens are encrypted at rest in
-- encrypted_tokens (base64 AES-256-GCM) and NEVER returned to a client. In-code tenant scoping,
-- no external FK — consistent with 0031/0032.

create table if not exists public.tenant_social_accounts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,                  -- in-code scoped, no external FK
  provider text not null,                   -- facebook | instagram | linkedin | tiktok | youtube | x
  external_id text not null,                -- page id / channel id / org urn / account id from provider
  account_name text,                        -- display name
  account_username text,                    -- handle
  avatar_url text,
  account_type text,                        -- page | profile | channel | business_account
  scopes text[] not null default '{}',
  status text not null default 'connected', -- connected | expired | revoked | error | pending_reconnect
  token_expires_at timestamptz,             -- access-token expiry (non-secret metadata)
  connected_by text,                        -- actor email
  config jsonb not null default '{}'::jsonb,-- non-secret provider metadata
  encrypted_tokens text not null,           -- base64 AES-256-GCM of {access_token, refresh_token, ...}
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, provider, external_id)
);
create index if not exists idx_tsa_tenant on public.tenant_social_accounts (tenant_id);
create index if not exists idx_tsa_tenant_provider on public.tenant_social_accounts (tenant_id, provider);
