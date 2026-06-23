# Occasions Service — reference

Built & shipped **2026-06-23** (D-406). The Occasions widget became a **service for paid
AIBizConnect / GHL customers**: a branded, multi-domain control panel offered inside GHL.

- **Design brief** → [DESIGN-BRIEF.md](./DESIGN-BRIEF.md) (the structure Claude Design built from)
- **GHL menu setup** → [GHL-MENU-SETUP.md](./GHL-MENU-SETUP.md) (how to add it as a GHL menu)

---

## What it is

| | Public (free) | Paid (AIBizConnect/GHL customer) |
|---|---|---|
| Who | Anyone via the GHL funnel (aibizconnect.ca/occasions) | Agency users + sub-account holders on a paid plan |
| Domains | **1 per email** | **Unlimited** |
| "Powered by AIBizConnect" badge | On (locked) | Optional (can turn off) |
| Where they manage it | Emailed control-panel link `/tools/occasions/manage?k=…` | **In GHL** → branded dashboard `/tools/occasions/app` |

Gate = **GHL's own billing** (a `paid` tag → our app), not our subscription engine.

---

## Live surfaces

- **Paid dashboard:** `app.aibizconnect.app/tools/occasions/app` (branded; My sites · Occasions ·
  Appearance · Install · Help; free/paid states; region-categorized picker; modals).
- **Public single-site editor:** `/tools/occasions/manage?k=<key>` (the old per-key control panel).
- **Public funnel:** `aibizconnect.ca/occasions` (GHL form → register → welcome email).
- **Embed:** `<script src="app.aibizconnect.app/api/occasions-widget/embed?k=<key>" async></script>`
- **Gated feed:** `/api/occasions-widget/active?k=&host=&d=` (returns banners only if registered +
  active + host matches; `d=` is the visitor's local date so single-day occasions span the full day).

---

## Files

| Area | Path |
|---|---|
| Locked engine (read-only) | `lib/occasions.ts` 🔒 |
| Region map (Global/Canada/US/Custom) | `lib/occasions-regions.ts` |
| Per-domain widget lib | `lib/server/occasion-widget.ts` |
| Paid-account layer | `lib/server/occasion-widget-accounts.ts` |
| Branded dashboard | `app/tools/occasions/app/{page.tsx,OccasionsDashboard.tsx,actions.ts}` |
| Public editor | `app/tools/occasions/manage/*` |
| Embed renderer | `app/api/occasions-widget/embed/route.ts` |
| Active feed | `app/api/occasions-widget/active/route.ts` |
| Register webhook | `app/api/occasions-widget/register/route.ts` |
| Migration (applied) | `supabase/APPLY_0085_occasions_accounts.sql` |
| Diagnostics (local-only, not committed) | `scripts/occasions-diag.mjs`, `scripts/occasions-fix-abc.mjs` |

---

## Data model

`occasion_widget_sites`: `key, domain (unique), name, email, occasions (jsonb), active, verified,
source, owner_type ('public'|'ghl'), ghl_location_id, plan ('free'|'paid'), badge (bool), created_at`.

`occasion_widget_accounts`: `ghl_location_id (pk), ghl_company_id, account_name, plan, timestamps`.

`occasions` jsonb (the LOCKED config shape): `settings` (size/speed/density/randomness/location) ·
`bannerStyle` (bg/textColor/position/pattern/width/dismissible/linkUrl/linkTarget) · `animations`
(snow/santa/fireworks/hearts/confetti/lanterns/leaves/…) · `banners` (per holiday id: enabled,
message, fly, startDate/endDate override) · `custom[]` (name, dates, message, fly, link).

---

## How it works (key behaviors)

- **Dashboard identity** (`page.tsx`): GHL SSO blob `?ssoData=` (dormant until the marketplace app +
  `GHL_SSO_KEY`) → signed token `?t=` → `?loc={{location.id}}` (Option A custom menu link; bootstraps
  the account on first open). Server actions carry an HMAC session token scoped to the location.
- **Appearance = control center:** colour, position, **movement (Banner / Airplane)**, animation,
  **Speed/Density/Size/Randomness sliders**, **Show-window (from/to)**, dismissible, badge. Movement
  + show-window are shared and applied to every enabled occasion (and inherited on enable).
- **Date gating:** holidays only render inside their window (e.g. Canada Day ≈ Jul 1). Off-season =
  hidden by design — set a Show-window that includes today to force one live now.
- **Badge:** the embed shows a "Powered by AIBizConnect" pill when a banner/animation is active;
  paid sites with `badge=false` hide it.
- **Vertical banners:** `middle-left` / `middle-right` positions render rotated 90° (embed + preview).

---

## Make a banner show right now (test)

1. Dashboard → **Occasions** → toggle one on (or create a custom one).
2. **Appearance** → set **Show from = today**, **Show to** = a few days out; pick Banner/Airplane.
3. **Install** → confirm that site's snippet is on the page (before `</head>`).
4. Refresh the page — appears within ~1 min (embed cache). Feed is no-store, so config changes are
   instant on next load.

**Gotchas that cause "nothing shows":** site **Paused** (active=false), nothing **enabled**, window
**already ended**, snippet **not installed**, or **host mismatch** (page host ≠ registered domain).
`scripts/occasions-diag.mjs` prints every site + what the live feed returns.

---

## Current registered sites (2026-06-23)

| Domain | Key | Owner |
|---|---|---|
| aibizconnect.ca | `ocw_4a1be2208ff14ca0bffb` | ghl (dashboard) |
| ali.realtor | `ocw_3eb5c0909e9c4297ba0c` | public |
| gtaluxuryhomes.ca | `ocw_bbd392b797314654b7ff` | public |
| the4sale.com | `ocw_2131e23ecae94f42890a` | public |

Verified live end-to-end on **aibizconnect.ca** (Santa + "Happy Pride" airplane + badge).

---

## This session's commits (main)

`6edfbfc` dashboard + accounts · `c9fc4b9` Option-A `?loc` bootstrap · `939b9ba` embed badge +
welcome-email rebrand · `be7083d` input-focus fix + airplane restore · `981980a` vertical preview ·
`df26d3e` Appearance (sliders + movement + show-window).

---

## Open / next steps (code ready; need GHL actions)

1. **Add the GHL Custom Menu Link** → see [GHL-MENU-SETUP.md](./GHL-MENU-SETUP.md).
2. **Attach public domains** (ali.realtor, gtaluxuryhomes.ca) to the GHL account so they appear in
   the dashboard (set their `ghl_location_id`).
3. **Wire the paid gate:** GHL `abc-paid` tag → `setAccountPlan(locationId, "paid")` (unlimited +
   optional perk email via `sendPerkEmail`).
4. **Option B (SSO):** register the GHL marketplace app, set `GHL_SSO_KEY`, finish `decodeGhlSso`.

## Guardrails

- `lib/occasions.ts` is **LOCKED** — the engine/renderer behavior wasn't changed; regions live in
  `lib/occasions-regions.ts`, all account work is additive.
- The public funnel + welcome-email pipeline + existing keys are untouched.
