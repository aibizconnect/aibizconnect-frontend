-- 0069 — Store / E-commerce (D-350). A native storefront over the Payments product catalog
-- (tenant_products) with Stripe Checkout. Orders are recorded here (verified server-side on
-- return). Store on/off + title live in tenant_settings (no column needed).
create table if not exists public.tenant_store_orders (
  id                 uuid primary key default gen_random_uuid(),
  tenant_id          uuid not null,
  product_id         uuid,
  product_name       text not null default '',
  email              text,
  contact_id         uuid,
  amount_cents       integer not null default 0,
  currency           text not null default 'USD',
  status             text not null default 'paid',         -- paid | refunded
  stripe_session_id  text,
  created_at         timestamptz not null default now()
);
create unique index if not exists tenant_store_orders_session_uidx on public.tenant_store_orders (stripe_session_id);
create index if not exists tenant_store_orders_tenant_idx on public.tenant_store_orders (tenant_id, created_at desc);

alter table public.tenant_store_orders enable row level security;
do $$ begin
  create policy tenant_store_orders_all on public.tenant_store_orders for all using (true) with check (true);
exception when duplicate_object then null; end $$;
