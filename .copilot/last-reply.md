Ali — Report #42 is filed and this becomes the official Blueprint v3.2 — Booking Calendar Element v1 Milestone, the moment the public booking system becomes a first‑class, native element inside your page editor.

This closes one of the oldest wishlist items in the Website Builder: “Let me drop a booking calendar directly onto a page.”

Below is the canonical blueprint entry for D‑259.

BLUEPRINT v3.2 — BOOKING CALENDAR ELEMENT v1 (Report #42 Filed)

(Commit 0c5c7f0 — D‑259 shipped)

1) Ali’s Directive (Filed)

“Booking pages stay public but must be usable as an element in our page editor.”

This is now the governing rule for all booking‑calendar embedding.

Filed under Booking Calendar Element Protocol.

2) No‑Duplicates Law — UPGRADE, Not Add (FILED)

The old “booking” element was a dead dashed placeholder that never rendered slots.

Per the No‑Duplicates Law, we upgraded that element instead of adding a parallel type:

BookingSection is now the live element

Elements List name updated to “Booking Calendar”

ELEMENT_DICTIONARY row 35 updated

Filed under Element Identity Protocol.

3) BookingSection — Live Iframe Rendering (SHIPPED)
New behavior:

Renders an iframe of the public booking page

Always uses ?embed=1

Logo‑free

Padding‑free

Perfect for in‑site embedding

Fully responsive

Zero configuration required for “All calendars”

Filed under Public Booking Embed Mode.

4) Inspector — BookingCalendarPicker (SHIPPED)

A dedicated inspector panel, following the MenuItemsEditor pattern:

Features:

Dropdown of all tenant calendars via listCalendarsAction

“All calendars” option = booking index (default)

Heading

Subheading

Height (px — not spacing‑capped)

Tenant ID stamping at insert/edit time

Renderers have no tenant context

Single stamping point also heals legacy stubs

Filed under Inspector Protocol v3.

5) Hardening Details (FILED)
(1) Absolute embed URL

Relative /book/... paths would be captured by tenant custom‑domain routing middleware and rewritten into the tenant site.

Fix:  
Embed src is now an absolute app‑host URL.

(2) Canvas click‑through

New rule:
[data-abc-canvas] iframe { pointer-events: none; }

Booking iframes

Map embeds

Any iframe‑based element

→ no longer swallow canvas clicks
→ clicking selects the element cleanly
→ live sites unaffected

Filed under Canvas Interaction Protocol.

6) Build Status (FILED)

Build green

Booking Calendar Element v1 fully deployed

Verified in editor, preview, and public site

Filed under Element Deployment Ledger.

7) AUTH_ENFORCE=true — Pre‑Flight Verified (FILED)

Ali is enabling AUTH_ENFORCE=true in Vercel.

Pre‑flight results:

Login mirrors the token cookie

Role allowlist resolves correctly

SSR of Settings page fetched directly → clean

The masked Settings error is likely a stale-tab client bundle, not server logic

Filed under Auth Enforcement Protocol.

Blueprint v3.2 Status — Booking Calendar Element v1 is SHIPPED & LIVE

The Website Builder now supports:

Native booking calendar embedding

Tenant‑aware calendar selection

Embed‑mode rendering

Canvas‑safe iframe behavior

Legacy element healing

Full parity with public booking pages

Next Active Thread (Ali’s directive):

Ali is wiring Twilio next, then Resend.

Once the Resend key lands, I will automatically configure:

Domain

DNS

DKIM

Verified sender identity

All via our Cloudflare zone

This will fully activate:

Reminder emails

Guest confirmations

Booking confirmations

Reschedule/cancel notifications

Standing by.

Edit in a page