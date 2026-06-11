Ali — Report #37 is filed and this becomes the official Blueprint v3.2 — Calendar v1.2 (FULLY LIVE) entry.
This is the moment the entire Round‑2 stack — timezone correctness, multi‑account sync, sub‑calendar busy, curated zones, embed mode — moves from “pending DDL” to fully operational in production.

Below is the canonical blueprint filing.

BLUEPRINT v3.2 — CALENDAR v1.2 (FULLY LIVE)

(Migration 0048 applied — multi‑account support unlocked)

1) Migration 0048 — APPLIED (FILED)

Ali applied 0048 and verified live:

A second Google account inserts cleanly on the same calendar

Exact duplicates still rejected (correct)

test-multiaccount.ts ALL CHECKS PASS

Ledger updated

Commit: 71fa620

Filed under Calendar Schema v1.2 — Multi‑Account Support (Live).

2) Calendar v1.2 — All Round‑2 Features Now Fully Live
(D‑250) Timezone‑Correct Slot Generation

Slots now built with Intl‑correct TZ math

Verified under TZ=UTC

Verified live: Ali’s Jun‑12 busy day now correctly starts at 1:30 PM, not 7:00 AM

Filed under Timezone Correctness.

(D‑251) Multi‑Account Provider Connections

One‑account‑per‑provider limit removed

UI lists every connected account

Per‑account disconnect + “Add another”

Sync propagation pinned to connectionId

Filed under Multi‑Account Sync Layer.

(D‑252) All‑Sub‑Calendar Busy Sweep

Google: calendarList → freeBusy (≤50 IDs, transparency‑respecting)

Outlook: /me/calendars per‑calendar view

Ali’s test calendar: busy intervals 3 → 24

Zero slot overlaps remain

Filed under Multi‑Calendar Busy Merge.

(D‑253) Curated Timezone Dropdown

Standard zones

Live GMT offsets

Toronto‑first

Eliminates server‑TZ drift

Filed under Timezone Settings Protocol.

(D‑254) Embed Mode

?embed=1:

Removes AIBizConnect logo

Removes outer padding

Booking‑index links propagate embed=1

Filed under Public Booking Embed Mode.

3) Conflict Regression Suite — 8/8 PASS (FILED)

All conflict paths remain correct after 0048:

Clean create

Overlap refusal

Force override

Reschedule refusal + force

Self‑exclusion

Blocked‑window refusal

External‑busy merge

Same‑start override (now fully live)

Filed under Calendar QA v1.2.

4) Blueprint Status — Calendar v1.2 is NOW FULLY LIVE

Calendar now satisfies:

Timezone correctness

Multi‑account sync

Sub‑calendar busy correctness

Embed mode

Override semantics

Availability Engine v3

Sync Layer v1.1

Public Booking Protocol v1.1

Spacing Protocol (SPACING_MAX=20)

Native‑Elements‑Only Supreme Rule

Status:  
CALENDAR v1.2 — SHIPPED & LIVE

Next Step (Ali’s directive):

Connect his personal Google account via the calendar Edit panel so its busy times join the conflict sweep.

Once connected, the conflict engine will merge:

Internal appointments

Blocked windows

Business calendar

Ali’s personal Google calendar

All sub‑calendars across all accounts

Standing by for the next milestone — Gallery Recognition or Automations Engine E1, whichever you call next.

Edit in a page