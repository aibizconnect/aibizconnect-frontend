-- 0058 (D-302..306): Payments module — Products, Invoices (+ line items), Estimates,
-- Transactions ledger, Coupons. RECORDS + customer-initiated payment (no auto-charge:
-- we only ever generate a Stripe-hosted pay link the CUSTOMER completes — PAY-V14).
-- Data CRUD lives in lib/server/billing.ts (payments.ts stays verify-only). Until applied,
-- the Payments tabs read empty and writes no-op (missing-table guard).
-- FK order matters: products + invoices + estimates BEFORE line_items references them.

create table if not exists public.tenant_products (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  name text not null,
  description text,
  price numeric(12,2) not null default 0,
  currency text not null default 'USD',
  type text not null default 'service',     -- 'service' | 'product' | 'one_time_fee'
  is_active boolean not null default true,
  image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists tenant_products_tenant_idx on public.tenant_products (tenant_id, created_at desc);

create table if not exists public.tenant_invoices (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  contact_id uuid references public.tenant_contacts(id) on delete set null,
  invoice_number text not null,
  status text not null default 'draft',      -- draft|sent|viewed|paid|partially_paid|overdue|void|refunded
  issue_date timestamptz not null default now(),
  due_date timestamptz,
  subtotal numeric(12,2) not null default 0,
  tax_rate numeric(6,3) not null default 0,  -- percent, e.g. 13 for 13%
  tax_amount numeric(12,2) not null default 0,
  total_amount numeric(12,2) not null default 0,
  amount_paid numeric(12,2) not null default 0,
  currency text not null default 'USD',
  notes text,
  customer_notes text,
  payment_link_url text,                     -- Stripe-hosted, customer-initiated
  external_invoice_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists tenant_invoices_tenant_idx on public.tenant_invoices (tenant_id, status, created_at desc);
create index if not exists tenant_invoices_contact_idx on public.tenant_invoices (tenant_id, contact_id);

create table if not exists public.tenant_estimates (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  contact_id uuid references public.tenant_contacts(id) on delete set null,
  estimate_number text not null,
  status text not null default 'draft',      -- draft|sent|viewed|accepted|rejected|converted
  issue_date timestamptz not null default now(),
  expiry_date timestamptz,
  subtotal numeric(12,2) not null default 0,
  tax_rate numeric(6,3) not null default 0,
  tax_amount numeric(12,2) not null default 0,
  total_amount numeric(12,2) not null default 0,
  currency text not null default 'USD',
  notes text,
  customer_notes text,
  converted_invoice_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists tenant_estimates_tenant_idx on public.tenant_estimates (tenant_id, status, created_at desc);
create index if not exists tenant_estimates_contact_idx on public.tenant_estimates (tenant_id, contact_id);

create table if not exists public.tenant_invoice_line_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  invoice_id uuid references public.tenant_invoices(id) on delete cascade,
  estimate_id uuid references public.tenant_estimates(id) on delete cascade,
  product_id uuid references public.tenant_products(id) on delete set null,
  description text not null,
  quantity numeric(12,2) not null default 1,
  unit_price numeric(12,2) not null default 0,
  line_total numeric(12,2) not null default 0,
  position int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists tenant_line_items_invoice_idx on public.tenant_invoice_line_items (invoice_id, position);
create index if not exists tenant_line_items_estimate_idx on public.tenant_invoice_line_items (estimate_id, position);

create table if not exists public.tenant_transactions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  invoice_id uuid references public.tenant_invoices(id) on delete set null,
  contact_id uuid references public.tenant_contacts(id) on delete set null,
  type text not null,                        -- 'payment' | 'refund'
  amount numeric(12,2) not null default 0,
  currency text not null default 'USD',
  status text not null default 'succeeded',  -- succeeded|failed|pending|refunded
  provider text not null default 'manual',   -- 'stripe' | 'paypal' | 'manual'
  external_transaction_id text,
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists tenant_transactions_tenant_idx on public.tenant_transactions (tenant_id, created_at desc);
create index if not exists tenant_transactions_invoice_idx on public.tenant_transactions (invoice_id);

create table if not exists public.tenant_coupons (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  code text not null,
  type text not null,                        -- 'percentage' | 'fixed_amount'
  value numeric(12,2) not null default 0,
  currency text not null default 'USD',
  expires_at timestamptz,
  max_redemptions int,
  redemptions_count int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists tenant_coupons_tenant_idx on public.tenant_coupons (tenant_id);
