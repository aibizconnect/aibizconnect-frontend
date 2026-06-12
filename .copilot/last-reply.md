Ali — Report #38 is filed and this becomes the official Blueprint v3.2 — Calendar v1.3 Milestone, the round that brings venues, guest invites, and the reminder engine into full production.
This is a major functional expansion — Calendar is now a true scheduling system, not just availability logic.

Everything below is the canonical blueprint entry for D‑255..D‑257.

BLUEPRINT v3.2 — CALENDAR v1.3 (ROUND 3 SHIPPED)

(Commit b1f8743 — D‑255..D‑257 shipped)

1) D‑255 — MEETING VENUES (SHIPPED & FILED)

Ali’s directive: “Calendars must support venues like GHL — Zoom, Teams, Meet, phone, in‑person, custom.”

What’s now live:

Per‑calendar venue list in Settings

Supported types:

Zoom

Teams

Google Meet

Phone

In‑person

Custom (link / phone / address)

Booking page asks: “How would you like to meet?”

Choice is:

Stored on the appointment

Server‑validated against the calendar’s venue list

Written into:

Mirrored Google event location

Mirrored Outlook event location

Confirmation emails

Filed under Calendar Venues Protocol.

2) D‑256 — GUEST INVITEES + NATIVE CALENDAR INVITES (SHIPPED & FILED)

Ali’s directive: “Guests must be invited properly — not just stored.”

What’s now live:

Booking form collects up to 5 guest emails

Mirrored Google events now use:

sendUpdates=all

Guests receive native Google Calendar invites

Reschedules + cancellations also notify

Outlook events:

Guests added as attendees

Native Outlook invites sent via Graph

Immediate confirmation email:

Sent to booker

Sent to all guests

Through tenant’s verified Resend identity

Fully compliant with the No‑Auto‑Send Protocol (transactional only)

Filed under Guest Invite Protocol.

3) D‑257 — REMINDER ENGINE (SHIPPED & FILED)

Ali’s directive: “Day‑before, morning‑of, and 1‑hour reminders — email + SMS — but transactional only.”

What’s now live:
Reminder schedule:

Day‑before email

Sent 22–26 hours before

Morning‑of email

After 7am (calendar timezone)

Only if >90 minutes before the appointment

SMS 1 hour before

Via connected Twilio

Architecture:

Per‑calendar toggles for each channel

Admin “Run now” button

Idempotent reminders_sent markers

Cron route: /api/cron/appointment-reminders

Protected by CRON_SECRET

Cloudflare Worker deployed (aibizconnect-cron)

Runs every 15 minutes

Also drives the previously unscheduled Launchpad followups

Compliance with No‑Auto‑Send:

Only owner‑directed transactional sends

Double‑gated:

Calendar toggle

Verified email identity / connected Twilio

Marketing sends remain forbidden

Email footer now has a transactional “appointment” variant

Filed under Reminder Engine v1.

4) Pre‑DDL Graceful Mode (FILED)

Until Ali applies DDL 0049, the system behaves as:

Bookings work normally

Venue + guests are dropped with a clear hint

Settings save shows “upgrade required”

No schema drift

No partial writes

Filed under Calendar Schema v1.3 — Migration Gate.

5) Pending Actions (Ali)
Two steps remain:

Apply DDL 0049

Enables venue + guest persistence

Finalizes reminder engine schema

Add CRON_SECRET to the prod Vercel environment

Worker already holds it

Enables production reminder runs

Filed under Deployment Checklist v1.3.

6) GHL‑PARITY.md Updated (FILED)

Three new Calendar rows added:

Venues

Guest invites

Reminder engine

And the Notifications exclusion is now correctly scoped to marketing only.

Filed under GHL‑Parity Matrix v1.3.

Blueprint v3.2 Status — Calendar v1.3

Calendar now satisfies:

Venues

Guest invites

Native Google + Outlook attendee notifications

Transactional reminder engine

Multi‑account sync

Sub‑calendar busy correctness

Timezone‑correct slot generation

Embed mode

Availability Engine v3

Sync Layer v1.2

Public Booking Protocol v1.2

Spacing Protocol (SPACING_MAX=20)

Native‑Elements‑Only Supreme Rule

Status:  
CALENDAR v1.3 — SHIPPED (pending DDL 0049 + CRON_SECRET)

Ali — Calendar is now a full scheduling platform.
Standing by for your next move: Gallery Recognition or Automations Engine E1.

Edit in a page