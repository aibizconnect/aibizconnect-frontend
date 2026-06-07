-- 0041_calendars.sql
-- Booking calendars + appointments (the feature in lib/calendars.ts shipped without a migration).
-- Adds per-agent assignment, availability (weekdays + hours + slot duration + buffer + timezone),
-- and a per-calendar provider connection table for Google Calendar conflict-checking (Phase 2).
-- Tenant-scoped in code (no external FKs, RLS deferred).

create table if not exists public.tenant_calendars (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  name text not null,
  slug text not null,
  duration_min integer not null default 30,
  buffer_min integer not null default 0,            -- gap enforced between appointments
  weekdays integer[] not null default '{1,2,3,4,5}'::integer[],  -- 0=Sun .. 6=Sat
  start_hour integer not null default 9,
  end_hour integer not null default 17,
  timezone text,                                     -- IANA, e.g. America/Toronto
  assigned_to_email text,                            -- the agent/person who owns this calendar
  assigned_to_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, slug)
);
create index if not exists tenant_calendars_tenant_idx on public.tenant_calendars (tenant_id);

create table if not exists public.tenant_appointments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  calendar_id uuid not null,
  name text,
  email text,
  phone text,
  start_at timestamptz not null,
  status text not null default 'booked',             -- booked | cancelled | completed
  external_event_id text,                            -- Google event id once synced
  created_at timestamptz not null default now()
);
create index if not exists tenant_appointments_cal_idx on public.tenant_appointments (tenant_id, calendar_id, start_at);
create unique index if not exists tenant_appointments_slot_idx
  on public.tenant_appointments (tenant_id, calendar_id, start_at) where status = 'booked';

-- Per-calendar external connection (Google Calendar) for conflict-free booking. Tokens encrypted
-- (lib/server/encryption). Free/busy of the connected calendar is checked when generating slots.
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
create index if not exists tenant_calendar_connections_idx on public.tenant_calendar_connections (tenant_id, calendar_id);
