-- Reputation reviews. CHECK constraints intentionally omitted (paste-safe); values are
-- enforced in app code (lib/reputation.ts clamps rating 1-5; status is controlled).
create table if not exists public.tenant_reviews (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  author text,
  rating integer not null default 5,
  body text,
  source text not null default 'website',
  status text not null default 'published',
  created_at timestamptz not null default now()
);
create index if not exists idx_reviews_tenant on public.tenant_reviews (tenant_id);
alter table public.tenant_reviews enable row level security;
drop policy if exists reviews_interim_open on public.tenant_reviews;
create policy reviews_interim_open on public.tenant_reviews for all using (true) with check (true);
notify pgrst, 'reload schema';
