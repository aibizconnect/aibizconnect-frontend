-- 0063 (D-337..341): per-SEAT personal connections. Each tenant user connects THEIR OWN
-- email / calendar / drive accounts here — distinct from the admin-only, tenant-shared
-- Settings → Integrations (tenant_integrations / tenant_social_accounts). A seat sees only
-- their own rows (filtered by user_id in code). Tokens/creds encrypted in encrypted_tokens.
-- user_id is TEXT (the custom-JWT `sub`, or email in dev) for resilience. Until applied, the
-- Connections hub reads empty and writes no-op (missing-table guard).

create table if not exists public.tenant_user_connections (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  user_id text not null,                 -- JWT sub (or email in dev) — the owning seat
  provider text not null,                -- 'imap_smtp' | 'google_calendar' | 'microsoft_calendar' | 'google_drive' | 'google_contacts' | 'onedrive' | 'dropbox' | 'gmail' | 'outlook'
  account_email text,                     -- the connected account's email/label
  status text not null default 'connected', -- 'connected' | 'error' | 'pending'
  scopes text[] not null default '{}',
  encrypted_tokens text,                  -- AES-256-GCM of {access_token,refresh_token,...} or IMAP creds
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, user_id, provider, account_email)
);
create index if not exists tuc_tenant_user_idx on public.tenant_user_connections (tenant_id, user_id);
create index if not exists tuc_user_provider_idx on public.tenant_user_connections (user_id, provider);
