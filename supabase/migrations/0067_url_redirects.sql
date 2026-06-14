-- 0067 — URL Redirects (D-347). GHL Sites → URL Redirects parity. Map an old/short path on the
-- tenant's site to any destination with a 301/302. Resolved by the public site catch-all when no
-- page matches the slug.
create table if not exists public.tenant_url_redirects (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null,
  from_path    text not null,                 -- normalized: no leading/trailing slash, lowercased
  to_url       text not null,
  code         int  not null default 301,     -- 301 (permanent) | 302 (temporary)
  hits         int  not null default 0,
  last_hit_at  timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create unique index if not exists tenant_url_redirects_path_uidx on public.tenant_url_redirects (tenant_id, from_path);
create index if not exists tenant_url_redirects_tenant_idx on public.tenant_url_redirects (tenant_id);

alter table public.tenant_url_redirects enable row level security;
do $$ begin
  create policy tenant_url_redirects_all on public.tenant_url_redirects for all using (true) with check (true);
exception when duplicate_object then null; end $$;
