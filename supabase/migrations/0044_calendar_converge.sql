-- 0044 — Converge the LIVE calendar tables to 0041 (they were created from the older
-- QUEUED_calendars.sql): missing columns on tenant_calendars, the restrictive status
-- check on tenant_appointments (only booked|cancelled — blocks the v1 status set), and
-- the provider-connections table if it never landed. Idempotent.

alter table public.tenant_calendars
  add column if not exists buffer_min integer not null default 0,
  add column if not exists timezone text,
  add column if not exists assigned_to_email text,
  add column if not exists assigned_to_name text,
  add column if not exists updated_at timestamptz not null default now();

alter table public.tenant_appointments drop constraint if exists tenant_appointments_status_check;
alter table public.tenant_appointments
  add constraint tenant_appointments_status_check
  check (status in ('booked','confirmed','cancelled','completed','no_show'));

create table if not exists public.tenant_calendar_connections (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  calendar_id uuid not null,
  provider text not null default 'google',
  account_email text,
  external_calendar_id text default 'primary',
  encrypted_tokens text not null,
  status text not null default 'connected',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, calendar_id, provider)
);
alter table public.tenant_calendar_connections enable row level security;
drop policy if exists cal_conn_interim_open on public.tenant_calendar_connections;
create policy cal_conn_interim_open on public.tenant_calendar_connections for all using (true) with check (true);

notify pgrst, 'reload schema';
