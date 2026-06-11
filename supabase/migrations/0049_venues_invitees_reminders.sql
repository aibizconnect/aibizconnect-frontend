-- 0049 — venues, invitees and transactional reminders (D-255..D-257, Blueprint v3.2).
--
-- venues: meeting options this calendar offers — [{kind: zoom|teams|meet|phone|in_person|custom,
--         label, detail}] where detail is the link / phone number / address.
-- reminders: per-calendar toggles for the transactional reminder engine (emails go out only
--         when the tenant's email identity is VERIFIED; SMS only when Twilio is connected).
-- venue/invitees/reminders_sent: what the visitor picked, who else to invite (native
--         Google/Outlook invites + reminder emails), and idempotency markers for the engine.
alter table public.tenant_calendars
  add column if not exists venues jsonb not null default '[]'::jsonb,
  add column if not exists reminders jsonb not null default '{"enabled":true,"dayBefore":true,"morningOf":true,"hourBeforeSms":true}'::jsonb;

alter table public.tenant_appointments
  add column if not exists venue jsonb,
  add column if not exists invitees jsonb not null default '[]'::jsonb,
  add column if not exists reminders_sent jsonb not null default '[]'::jsonb;

create index if not exists tenant_appointments_reminder_idx
  on public.tenant_appointments (start_at)
  where status in ('booked', 'confirmed');
