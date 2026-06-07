-- 0035_shopify_stores.sql
-- Shopify integration (architect-approved, D-047). Multi-store per tenant: one tenant can connect
-- several shops, each its own row keyed by the canonical *.myshopify.com domain. Offline OAuth token
-- encrypted at rest in encrypted_tokens (base64 AES-256-GCM), never returned to a client. In-code
-- tenant scoping, no external FK — consistent with 0031/0033.

create table if not exists public.tenant_shopify_stores (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  shop_domain text not null,                -- 'mystore.myshopify.com' (canonical id)
  shop_name text,
  email text,
  plan_name text,
  scopes text[] not null default '{}',
  status text not null default 'connected', -- connected | expired | revoked | error | pending_reconnect
  encrypted_tokens text not null,           -- base64 AES-256-GCM of {access_token, ...} (offline token)
  connected_by text,
  config jsonb not null default '{}'::jsonb, -- non-secret shop metadata (currency, timezone, …)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, shop_domain)
);
create index if not exists idx_tss_tenant on public.tenant_shopify_stores (tenant_id);
