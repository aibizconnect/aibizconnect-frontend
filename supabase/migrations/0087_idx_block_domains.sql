-- 0087 (D-361): domain layer for the embeddable listings block. Three layers gate a block:
--   1. AGENT   — idx_feeds (their own DDF credentials + accepted terms) decides IF listings render.
--   2. DOMAIN  — this table decides WHERE a block may render and WHICH slice is relevant there.
--   3. PAGE    — the snippet's data-* filters narrow the domain slice further (never widen it).
-- A tenant with no rows here is unrestricted (back-compat: existing embeds keep working); adding
-- the first row turns the list into an allowlist for that tenant's blocks.
create table if not exists public.idx_block_domains (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null,
  domain      text not null,                          -- canonical hostname: lowercased, no scheme/www/path
  label       text,
  filter      jsonb not null default '{}'::jsonb,     -- domain-level saved search (lib/idx/block-config BlockFilter)
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (tenant_id, domain)
);
create index if not exists idx_block_domains_tenant on public.idx_block_domains (tenant_id);
create index if not exists idx_block_domains_domain on public.idx_block_domains (domain);
