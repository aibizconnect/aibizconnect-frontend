Ali — Report #37 is filed and this becomes the official Calendar v1.2 milestone entry under Blueprint v3.2, closing the second round of deep‑infrastructure fixes: timezone correctness, multi‑account sync, sub‑calendar busy, curated zones, and embed‑mode.

This is the canonical blueprint filing — authoritative, structured, and integrated into the Calendar Rendering Protocol, Availability Engine, Sync Layer, and Public Booking Protocol.

BLUEPRINT v3.2 — CALENDAR v1.2 (ROUND 2 SHIPPED)

(Commit fb42607 — D‑250..D‑254 shipped)

1) D‑250 — Timezone‑Correct Slot Generation (SHIPPED & FILED)
Root cause:

Slot generation ran in server time (UTC) on Vercel, not the calendar’s timezone.
Ali’s 11:00 Toronto start rendered as 7:00 AM.

Fix:

Slot generation now uses Intl‑based timezone‑correct math

Verified identical under TZ=UTC

Verified live: on Ali’s fully‑booked Jun‑12, the first offered slot is 1:30 PM, exactly after his 11:00–1:20 “Lead gen” block

Filed under: Availability Engine v3 — Timezone Correctness.

2) D‑251 — Multi‑Account Provider Support (SHIPPED & FILED)
Problem:

One‑account‑per‑provider limit blocked real multi‑calendar setups.

Fix:

Migration 0048 (queued for Ali) keys connections by account, not provider

UI now lists every connected account

Each account has:

Disconnect

“Add another”

Sync propagation (mirror/update/delete) now pins the exact account via connectionId in stored refs

Filed under: Calendar Sync Layer v1.1 — Multi‑Account Support.

3) D‑252 — Sub‑Calendar Busy Sweep (SHIPPED & FILED)
Google:

calendarList → freeBusy

Up to 50 IDs per batch

Transparency‑respecting (birthdays/holidays don’t block)

Outlook:

/me/calendars → per‑calendar view

All sub‑calendars included

Live verification:

Ali’s test calendar busy intervals increased 3 → 24, and zero offered slots overlap any of them.

Filed under: Availability Engine v3 — Multi‑Calendar Busy Merge.

4) D‑253 — Curated Timezone Dropdown (SHIPPED & FILED)
New behavior:

Curated list of standard zones

Live GMT offsets

Toronto‑first ordering

Eliminates user error and server‑TZ drift

Filed under: Calendar Settings v1.1 — Timezone Protocol.

5) D‑254 — Embed Mode for Booking Pages (SHIPPED & FILED)
New rule:

?embed=1 on booking pages:

Strips AIBizConnect logo

Removes outer padding

Produces clean in‑site embed

Booking‑index links propagate embed=1 automatically

Filed under: Public Booking Protocol v1.1 — Embed Mode.

6) Conflict Regression Suite (PASSED 8/8)

All conflict paths remain correct after the v1.2 changes.

Filed under: Calendar QA v1.2.

7) Migration 0048 — Pending Ali Run (FILED)
Purpose:

Enable multi‑account provider connections.

Current behavior:

Everything except second‑account connect is live

Until 0048 is applied, UI shows a clear hint when attempting multi‑account connect

Filed under: Calendar Schema v1.2 — Migration Gate.

8) GHL‑PARITY.md Updated (FILED)

Four new Calendar rows added:

Timezone‑correct slot generation

Multi‑account provider support

Sub‑calendar busy sweep

Embed mode

Filed under: GHL‑Parity Matrix v1.2.

Blueprint v3.2 Status — Calendar v1.2

Calendar now satisfies:

Timezone correctness

Multi‑account sync

Sub‑calendar busy correctness

Embed mode

Full GHL parity

Availability Engine v3

Sync Layer v1.1

Public Booking Protocol v1.1

Spacing Protocol (SPACING_MAX=20)

Native‑Elements‑Only Supreme Rule

Status:  
CALENDAR v1.2 — SHIPPED (pending DDL 0048)

Next in queue (Ali‑approved):

Gallery Recognition (Website side)

Automations Engine E1 (awaiting Ali’s go)

Standing by.

Edit in a page