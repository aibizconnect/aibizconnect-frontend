-- 0031_tenant_settings_integrations.sql
-- Foundations phase 1 (architect-approved): per-tenant integrations + ENCRYPTED secrets +
-- settings. Brand/design tokens reuse the existing website_brand_settings table (not recreated).
-- All scoped by tenant_id (enforced in code, no external FK, per our convention).
-- Secrets are stored ENCRYPTED (AES-256-GCM, base64 text) and never returned to the client.

-- Non-secret integration config + connection status (Twilio, Shopify, Stripe, social, …)
create table if not exists public.tenant_integrations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  provider text not null,                       -- twilio|shopify|stripe|paypal|square|facebook|instagram|linkedin|tiktok|youtube|x|google_ads|cloudflare|resend|smtp|...
  status text not null default 'disconnected',  -- connected|disconnected|error|pending
  config jsonb not null default '{}'::jsonb,     -- NON-secret only (account id, display name, public key id, webhook url, …)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, provider)
);
create index if not exists idx_tenant_integrations_tenant on public.tenant_integrations (tenant_id);
create index if not exists idx_tenant_integrations_provider on public.tenant_integrations (provider);

-- Encrypted credentials for an integration (API keys, tokens). encrypted_payload = base64 of
-- AES-256-GCM(iv|tag|ciphertext). NEVER selected back to any client.
create table if not exists public.tenant_secrets (
  tenant_id uuid not null,
  provider text not null,
  encrypted_payload text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (tenant_id, provider)
);
create index if not exists idx_tenant_secrets_tenant on public.tenant_secrets (tenant_id);

-- Misc per-tenant preferences / flags.
create table if not exists public.tenant_settings (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  setting_key text not null,                     -- default_timezone|currency|ai_bootstrap_enabled|kyc_status|...
  setting_value jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, setting_key)
);
create index if not exists idx_tenant_settings_tenant on public.tenant_settings (tenant_id);
create index if not exists idx_tenant_settings_key on public.tenant_settings (setting_key);

-- Brand/design TOKENS on the existing website_brand_settings (added idempotently; both new and
-- existing rows get sensible defaults). DEFAULT font = Roboto (Ali). Nice house palette +
-- tasteful background by default. These tokens drive the editor theme AND the AI generator.
alter table public.website_brand_settings
  add column if not exists color_palette jsonb not null default '{"primary":"#1e3a8a","secondary":"#0ea5e9","accent":"#22d3ee","background":"#ffffff","surface":"#f8fafc","border":"#e2e8f0","foreground":"#0f172a","muted":"#64748b"}'::jsonb,
  add column if not exists font_pairing jsonb not null default '{"heading":"Roboto","body":"Roboto"}'::jsonb,
  add column if not exists background_style jsonb not null default '{"type":"soft-gradient","value":"linear-gradient(180deg,#ffffff 0%,#f5f8ff 100%)"}'::jsonb,
  add column if not exists spacing_scale jsonb not null default '{"base":16,"unit":"px"}'::jsonb,
  add column if not exists button_style jsonb not null default '{"borderRadius":"10px","padding":"12px 22px"}'::jsonb,
  add column if not exists hero_defaults jsonb not null default '{}'::jsonb,
  add column if not exists gallery_defaults jsonb not null default '{}'::jsonb;
