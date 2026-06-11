# GHL Parity Matrix — Calendars & Contacts (D-240, Blueprint v3.2)

Status as of 2026-06-11. Every GoHighLevel menu item in these two areas, what it does,
what ours is called, and where it lives. ✅ = operational & wired, 🟡 = covered differently,
⏳ = deliberate wishlist (reason given), 🚫 = excluded by standing rule.

## Calendars

| GHL item | Function | Ours | Status | Where |
|---|---|---|---|---|
| Calendar view (Day/Week/Month) | Visual time-grid of appointments | Calendar tab — custom CSS grid, current-time line, color per calendar | ✅ | /tenants/T/calendars → Calendar |
| Appointments list | Filterable table of bookings | Appointments tab — date range / calendar / status filters, inline status | ✅ | → Appointments |
| Calendar filter | Show only chosen calendars/users | Multi-select dropdown with color dots | ✅ | Calendar view top bar |
| Date nav + Today | Move through time | Today + ‹ › + range label | ✅ | Calendar view top bar |
| + New appointment | Staff-created booking | "+ New → New appointment" modal (also creates a CRM contact) | ✅ | Calendar view; empty-slot click pre-fills |
| Add Blocked-Off Time | Make a window unbookable | "+ New → Block time" — gray hatched chips; booking engine refuses overlaps | ✅ | Calendar view |
| Appointment statuses | confirmed/cancelled/showed etc. | booked / confirmed / completed / no-show / cancelled (chip popover + list) | ✅ | popover + Appointments tab |
| Reschedule / cancel | Move or kill a booking | Chip popover → Reschedule (datetime+duration) / status / Delete | ✅ | Calendar view |
| Calendar settings (CRUD) | Create calendars, duration, hours, buffer | Settings tab (name, slug link, duration, weekdays, hours, buffer, tz, assignee) | ✅ | → Settings |
| Connections (Google/Outlook/iCal) | Two-way busy sync | Per-calendar connect; busy times block slots; bookings mirror out | ✅ | Settings → calendar → Edit |
| Conflict check vs personal calendar | Warn before double-booking over synced events | findConflicts on staff create AND reschedule: internal + blocked + provider busy → warn + "Book anyway" override (D-241) | ✅ | + New modal / chip popover |
| Synced events visible on grid | See personal-calendar busy on the staff calendar | Synthetic read-only "Busy — Google/Outlook/iCal" chips, dashed gray (D-242) | ✅ | Calendar view |
| Outbound sync of staff bookings | Manual appts land on the synced calendar | Manual creates mirror out; reschedule/cancel/delete propagate via stored external_event_id (D-243/D-244) | ✅ | automatic |
| Inbound two-way sync (edit in Google → updates here) | Full bidirectional sync | Busy shown + conflicts checked; inbound edits don't rewrite our entries | ⏳ webhook/poll loop later (D-244 deferral) | — |
| Booking page | Public self-serve booking | /book/T/slug (brand-themed, creates appointment + contact) | ✅ | public |
| Calendar **Groups** | One link listing several calendars | Booking index page listing all calendars | 🟡 equivalent | /book/T |
| Date-specific hours / holidays | Override availability on a date | Covered by **Blocked time** (block the day/window) | 🟡 covered | Calendar view |
| Calendar types (round-robin/class/collective/service) | Multi-staff routing & group events | Single-host calendars only | ⏳ needs multi-staff routing model | — |
| Custom booking-form fields | Extra questions at booking | Fixed name/email/phone | ⏳ form-builder integration later | — |
| Notifications (confirm/reminder emails, SMS) | Auto-send messaging | — | 🚫 standing **no-auto-send** rule | — |

## Contacts

| GHL item | Function | Ours | Status | Where |
|---|---|---|---|---|
| Smart Lists | Saved filter views over contacts | "All" + saved chips; ＋ Smart list saves current filters | ✅ | /tenants/T/contacts |
| Search & filters | Find by anything | Server search (name/email/phone) + tag (any-of) / source / created-range filters | ✅ | toolbar |
| Sortable columns + pagination | Big-list ergonomics | Name/Score/Created sort, 50/page | ✅ | table |
| + Add contact | Manual create | Modal: name/email/phone/company/tags | ✅ | toolbar |
| Import CSV | Bulk load with mapping | Upload/paste → auto column mapping → email dedupe | ✅ | toolbar ⬆ Import |
| Export CSV | Get data out | Selected rows or all-filtered (cap 1000/pull) | ✅ | toolbar / bulk bar |
| Bulk: add/remove tag | Tag many at once | Bulk bar | ✅ | bulk bar |
| Bulk: update field | Set owner/source on many | Bulk bar → Set owner / Set source | ✅ | bulk bar |
| Bulk: delete | Remove many | Soft-delete → Restore tab | ✅ | bulk bar |
| **Merge duplicates** | Fold dupes into one | Bulk bar ⇄ Merge (2–5): pick primary; fields fill, tags union, notes/tasks/opportunities repoint | ✅ | bulk bar |
| Bulk Actions tab | History of bulk ops | Audit-log view (import/merge/bulk update/delete/restore/purge) | ✅ | → Bulk Actions |
| Restore tab | Trash + recover | Soft-deleted list → Restore / Delete forever | ✅ | → Restore |
| Tasks tab | Cross-contact to-dos | Rollup: add, due dates, overdue highlight, complete; also /tasks | ✅ | → Tasks |
| Companies tab | B2B grouping | Roll-up from contact.company → click = filtered list | 🟡 derived (no separate object) | → Companies |
| Contact detail: fields | Edit everything | Name/email/phone/company/owner/score/source/DND/tags | ✅ | /contacts/:id |
| Contact detail: custom fields | Tenant-defined fields | tenant_custom_fields defs rendered by type → contacts.custom | ✅ | detail left card |
| Contact detail: notes | Timeline notes | Notes tab (add/list/delete) | ✅ | detail |
| Contact detail: tasks | Per-contact to-dos | Tasks tab (same engine as rollup) | ✅ | detail |
| Contact detail: appointments | Their bookings | Matched by email from the calendar | ✅ | detail |
| Contact detail: opportunities | Their deals | tenant_opportunities by contact_id | ✅ | detail |
| Conversations (email/SMS thread) | Messaging hub | — | ⏳ inbound-email module is PLAN-ONLY (Ali) | — |
| Send email/SMS (incl. bulk) | Outbound messaging | — | 🚫 standing **no-auto-send** rule | — |
| Documents/files on contact | Attachments | — | ⏳ wire to Media Library later | — |

**DDL prerequisites:** 0043+0044+0045+0046+0047 all applied ✅ — conflict checks,
"book anyway" overrides (including identical start times), soft-delete/Restore and
outbound mirroring are fully live.
