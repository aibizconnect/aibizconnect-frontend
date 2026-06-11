-- 0043 — Calendar GHL-parity (D-225, Blueprint v3.2 "Calendar Rendering Protocol v1")
-- Appointments become full calendar entries: real end times, manual + blocked kinds,
-- titles/notes for staff-created items, and provenance (booking page vs manual vs sync).

alter table public.tenant_appointments
  add column if not exists end_at timestamptz,                       -- null → start_at + calendar.duration_min
  add column if not exists title text,                               -- manual/blocked entries
  add column if not exists notes text,
  add column if not exists kind text not null default 'appointment', -- appointment | blocked
  add column if not exists source text not null default 'booking',   -- booking | manual | sync
  add column if not exists updated_at timestamptz not null default now();

-- One synced external event maps to exactly one appointment (CAL-V2).
create unique index if not exists tenant_appts_external_event_unique
  on public.tenant_appointments (tenant_id, external_event_id)
  where external_event_id is not null;

-- Range queries for the calendar grid + appointments table (CAL-V3).
create index if not exists tenant_appts_range
  on public.tenant_appointments (tenant_id, calendar_id, start_at, end_at);
