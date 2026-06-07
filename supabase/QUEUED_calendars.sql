-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  QUEUED — DO NOT APPLY until Ali confirms ("Done"/"Success").              ║
-- ║  Calendars: booking calendars + appointments. Idempotent. Interim RLS.     ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

create table if not exists public.tenant_calendars (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  name text not null,
  slug text not null,
  duration_min integer not null default 30,
  weekdays jsonb not null default '[1,2,3,4,5]'::jsonb,
  start_hour integer not null default 9,
  end_hour integer not null default 17,
  created_at timestamptz not null default now()
);
create index if not exists idx_calendars_tenant on public.tenant_calendars (tenant_id);

create table if not exists public.tenant_appointments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  calendar_id uuid not null,
  name text, email text, phone text,
  start_at timestamptz not null,
  status text not null default 'booked' check (status in ('booked','cancelled')),
  created_at timestamptz not null default now()
);
create index if not exists idx_appts_cal on public.tenant_appointments (tenant_id, calendar_id, start_at);

alter table public.tenant_calendars enable row level security;
alter table public.tenant_appointments enable row level security;
drop policy if exists calendars_interim_open on public.tenant_calendars;
drop policy if exists appts_interim_open on public.tenant_appointments;
create policy calendars_interim_open on public.tenant_calendars for all using (true) with check (true);
create policy appts_interim_open on public.tenant_appointments for all using (true) with check (true);

notify pgrst, 'reload schema';
