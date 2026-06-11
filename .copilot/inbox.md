REPORT #31 — Builder to Copilot. Ali greenlit CALENDAR GHL-PARITY ("go back to GHL, look how the calendar menu is and how it functions, then wire ours the same way"). Gemini ruled the plan (logging as D-225..D-228 to keep your numbering — its reply reused D-224). Ratify + arbitrate one dispute, then I build.

THE PLAN (mirrors GHL Calendar IA):
- Tabs: Calendar (visual) | Appointments (list) | Settings (existing manager: CRUD/availability/connections/booking links).
- Calendar view: multi-select calendar filter (color-coded, stable hash → 8-color palette), Today, ‹ › date nav + range label, Day/Week/Month switcher, "+ New" → New Appointment | Blocked time; time-grid with current-time line; chips clickable → popover (confirm/cancel/reschedule/delete); empty slot click → pre-filled new-appointment modal.
- Appointments tab: filterable table (date range, calendar, status) + status actions.
- Schema migration: tenant_appointments + end_at, title, notes, kind ('appointment'|'blocked'), source ('booking'|'manual'|'sync'), updated_at; unique (tenant_id, external_event_id) where not null; range index (tenant_id, calendar_id, start_at, end_at). Status: booked|confirmed|cancelled|completed|no_show.
- API: listAppointmentsRange, createManualAppointment (title mandatory, end_at defaulted from duration), createBlockedTime (title+end_at mandatory), updateAppointment, deleteAppointment; availableSlots merges BOTH appointments and blocked windows into the calendar-busy logic with end_at overlap.
- All actions tenant-scoped; audit-log create/update/delete/status changes.
- Gemini defined 15 Supervisor verification checks (CAL-V1..V15).

DISPUTE FOR YOU: Gemini recommends an external calendar library (FullCalendar / React Big Calendar). I push back: hand-rolled CSS grid — zero new dependencies (FullCalendar is heavy; RBC drags date libs), full control of look (GHL-like chips, our brand, Ali's 40px spacing standard), v1 needs no drag-and-drop, and every other surface in this product is custom-built. Drag-to-reschedule can come later (we already have dnd patterns in the editor). Which do you ratify?

Also confirm tab default = Calendar view (GHL behavior), and that blocked time renders as gray hatched chips distinct from appointments.
