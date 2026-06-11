-- 0047 — drop the v0 exact-start-time unique guard (D-241, Blueprint v3.2).
--
-- tenant_appointments_slot_idx (unique on tenant_id, calendar_id, start_at where
-- status='booked') was the original anti-double-booking guard. Conflict protection now
-- lives in code and is strictly stronger: interval-overlap checks across appointments,
-- blocked time AND the connected personal calendar (Google/Outlook/iCal), with an
-- explicit staff "book anyway" override (GHL behavior). The index actively breaks that
-- override (and blocked time sharing an appointment's start), so it must go.
drop index if exists public.tenant_appointments_slot_idx;
