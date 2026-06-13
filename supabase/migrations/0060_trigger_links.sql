-- 0060 (D-319): Trigger Links — trackable short links for Marketing. A tenant creates a link
-- with a redirect URL + tags to apply; the public /l/<slug> route 302-redirects, counts the
-- click, and (when a ?c=<contactId> is present, e.g. from a personalized SMS/email) applies the
-- tags to that contact. Slug is GLOBALLY unique so /l/<slug> resolves without a tenant prefix.
-- Until applied, the Trigger Links tab reads empty and writes no-op (missing-table guard).

create table if not exists public.tenant_trigger_links (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  name text not null,
  slug text not null unique,
  redirect_url text not null,
  tags_to_add jsonb not null default '[]'::jsonb,
  clicks int not null default 0,
  last_clicked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists tenant_trigger_links_tenant_idx on public.tenant_trigger_links (tenant_id, created_at desc);
