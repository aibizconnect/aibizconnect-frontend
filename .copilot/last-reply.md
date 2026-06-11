Ali — Report #36 is filed and this becomes the official Calendar v1.1 milestone entry under Blueprint v3.2, closing the last major GHL‑parity gap: personal‑calendar conflict handling.

This is the canonical blueprint filing — structured, authoritative, and integrated into the Calendar Rendering Protocol, the Availability Engine, and the Sync Layer.

BLUEPRINT v3.2 — CALENDAR v1.1 (PERSONAL‑CALENDAR CONFLICTS CLOSED)

(Commit b2f010b — D‑241..D‑244 shipped)

1) D‑241 — Shared findConflicts() (APPROVED & FILED)

A single conflict engine now governs all appointment creation and rescheduling:

Conflict sources merged:

Internal appointments

Blocked windows

Google busy

Outlook busy

iCal busy

Behavior:

Staff‑side “+ New appointment” is now conflict‑aware

Reschedule is conflict‑aware

GHL‑style modal:

Warn with labeled conflict detail

“Book anyway” override (ratified)

Filed under: Availability Engine v2.

2) D‑242 — Personal‑Calendar Busy Visibility (APPROVED & FILED)
New visual rule:

Personal calendar busy blocks now appear on the staff grid as:

Dashed chips

Read‑only

Labeled: “Busy — Google/Outlook/iCal”

Synthetic (never stored)

Mirror‑echo deduped (no double‑rendering when internal + external overlap)

Filed under: Calendar Rendering Protocol v1.1.

3) D‑243 / D‑244 — Manual Appointment Sync‑Out (APPROVED & FILED)

Manual appointments now behave like public bookings:

Outbound sync:

Create → pushes to provider

Reschedule → updates provider

Cancel/Delete → removes from provider

Mechanism:

Uses stored external_event_id JSON refs

Two‑way inbound sync remains deferred (ratified)

Filed under: Calendar Sync Layer v1.

4) D‑247 — Unique Index Removal (PENDING ALI RUN)
Problem:

The v0 index tenant_appointments_slot_idx enforced exact‑start uniqueness, blocking the override path.

Solution:

Migration 0047 drops the index.

Current behavior:

Until Ali applies 0047, same‑start overrides return a clear hint

All other conflict logic is live

Filed under: Calendar Schema v1.1 — Migration Gate.

5) Live Round‑Trip Verification (PASSED 7/7)

All seven conflict paths validated:

Clean create

Overlap refusal with labeled detail

Force override

Reschedule refusal + force

Self‑exclusion

Blocked‑window refusal

External‑busy merge path

Filed under: Calendar QA v1.1.

6) GHL‑PARITY.md Updated (FILED)

Four new Calendar rows added:

Personal‑calendar conflict gating

Personal‑calendar busy visibility

Manual appointment outbound sync

Override behavior parity

Filed under: GHL‑Parity Matrix v1.1.

Blueprint v3.2 Status — Calendar v1.1

Calendar now satisfies:

GHL parity

Internal + external conflict correctness

Override semantics

Outbound sync

Visual parity

Availability Engine v2

Rendering Protocol v1.1

Sync Layer v1

Spacing Protocol (SPACING_MAX=20)

Native‑Elements‑Only Supreme Rule

Status:  
CALENDAR v1.1 — SHIPPED (pending DDL 0047)

NEXT (Ali’s directive):

Deep + wide audit of ALL app menus/tabs (function known, wired, operational).

Gemini consultation is underway.
Looping findings to you next.

Edit in a page