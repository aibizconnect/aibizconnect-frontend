# Occasions Service — Design Brief (for Claude Design)

**Status:** design spec only. NO code changes implied by this document.
**Tool:** Claude Design (per design-tool-preference — do NOT use Gemini/Stitch for this).
**Owner decision (2026-06-23):** Occasions becomes a **free perk for paid AIBizConnect
GHL customers** (agency users + sub-account holders), gated on **GHL's own billing**,
with **unlimited domains**. The **public lead-magnet stays** at **one domain per email**,
branded. See "Tiers" below.

---

## 0. GUARDRAILS — do not disturb what already exists

Claude Design works ONLY on the surfaces named in this brief. The following are
**off-limits / unchanged** (additive work only):

- The **on-site banners/animations** visitors actually see (santa, airplane, snow,
  vertical side banners) are rendered by the LOCKED occasions engine. Do **not** redesign
  the visitor-facing banner rendering. The dashboard may show *previews* of them, but the
  live rendering, timing, and animations stay exactly as they are.
- The **existing public funnel** (GHL form → webhook → register) and the GHL workflow +
  "occasions" tag pipeline stay as-is.
- The **existing welcome email pipeline** (fields, send logic, snippet delivery) stays — we
  are only restyling the template, same data in/out.
- Existing **keys, snippets, registered domains** keep working unchanged.

New things this brief introduces are **additive**: a multi-domain dashboard, an
occasion **category filter** (Global / Canada / US / Custom), a GHL sidebar entry,
restyled emails, and supporting modals.

---

## 1. Tiers (drives every screen state)

| | **Free (public)** | **Included (paid GHL customer)** |
|---|---|---|
| Who | Anyone who registers via the public funnel | Agency users + sub-account holders on an active GHL subscription |
| Domains | **1 per email** | **Unlimited** |
| "Powered by AIBizConnect" badge | On (locked) | Optional toggle (off allowed) |
| Where they open it | Emailed control-panel link (`/tools/occasions/manage?k=…`) | **Inside GHL** — "Occasions" item in the sub-account sidebar (SSO) |

Every screen must render correctly in BOTH states. Free state shows upgrade affordances
where paid features are gated.

---

## 2. The Dashboard (primary page)

Must work **embedded in a GHL iframe** (fluid, min width ~360px, no fixed wide layout)
AND standalone. **Light theme** (white/slate surfaces, navy accents) — it's a control
panel, not the dark marketing site.

### Global chrome
- Slim top bar: product mark "Occasions", account/location name (paid), and a **plan pill**
  ("Free — 1 site" or "Included with your plan").
- Primary navigation as **top tabs** (not a left rail — better in a narrow iframe):
  **My Sites · Occasions · Appearance · Install · Help**.

### Tab A — My Sites
- **Paid:** responsive grid of **site cards** + a prominent **"+ Add a site"** CTA.
- **Free:** a single site card; "+ Add a site" shown but **locked** → opens Upgrade modal.
- **Site card** contents: domain name, status pill (Live / Paused), "**N occasions live
  now**" with a tiny inline preview, and quick actions: Edit · Preview · Copy snippet ·
  Pause · Remove.
- **Empty state:** friendly "Add your first site" with one input + Add.

### Tab B — Occasions (the picker — where categorization lives)
- **Category filter chips** across the top: **Global · Canada · United States · My Custom**
  (multi-select allowed; a user can mix, e.g. Global + Canada).
- **Quick presets** (one tap, bulk-enable a set): "All Global", "Canadian holidays",
  "US holidays".
- **Occasion grid:** each occasion = a card with emoji/icon, name, the **next date** it
  occurs, an on/off toggle, and a hover/click **preview** of the banner.
- **My Custom** section: list of user-created occasions + **"+ Create custom occasion"**
  (opens the custom-occasion modal — includes the existing **Link URL** + **Open in
  same tab / new window** controls).
- Selecting occasions is **per-site**; paid users get an **"Apply to all my sites"** action.

### Tab C — Appearance
- Banner style: background color, text color, **position** (top/middle/bottom × left/center/
  right), pattern (solid/…), **dismissible** toggle.
- **Animation gallery**: santa, airplane, snow, etc. (these map to the existing locked
  animations — design picks/labels them, does not re-author them).
- **"Powered by AIBizConnect" badge toggle** — ON & locked for Free, free to toggle for Paid.

### Tab D — Install
- The embed snippet in a copy box, with "paste just before `</head>`".
- **Per-platform instructions** (WordPress / Shopify / Wix / Squarespace / raw HTML), each
  behind an **ⓘ InfoTip** (reuse the existing InfoTip pattern — every vague step gets one).
- **"Email me the snippet"** button.

### Tab E — Help
- Short FAQ + the InfoTip-style "where do I go / what do I do" guidance.

### States to design for every tab
Loading (skeletons), empty, error, Free-locked (with upgrade nudge), Paid-unlocked,
narrow-iframe (GHL) vs wide (standalone), and a mobile breakpoint.

---

## 3. Categorization model (Global / Canada / US / Custom)

A new **additive** attribute on each occasion: `region = "global" | "ca" | "us"`. It is a
**filter only** — it does not change rendering, dates, or behavior. Default/absent = treat
as Global, so existing widgets are unaffected. The user **chooses** which to enable; we do
NOT auto-restrict by their country.

Proposed taxonomy (final mapping at build keeps every existing occasion id + behavior):

**🌍 Global** (broadly observed / cross-cultural — expandable):
New Year's Day · Valentine's Day · St. Patrick's Day · Easter · Mother's Day · Father's Day ·
Halloween · Christmas · New Year's Eve · **Cultural New Years** group (Lunar/Chinese New
Year, Nowruz/Persian New Year, Rosh Hashanah, Vietnamese Tết, Diwali) · other cultural
celebrations we can keep adding (Eid al-Fitr, Eid al-Adha, Hanukkah, Holi, Vaisakhi…).

**🇨🇦 Canada only:**
Family Day · Victoria Day · **Canada Day** · Civic Holiday · National Day for Truth &
Reconciliation · **Canadian Thanksgiving** · Remembrance Day · Boxing Day.

**🇺🇸 United States only:**
MLK Day · Presidents' Day · Memorial Day · Juneteenth · **Independence Day (Jul 4)** ·
Columbus / Indigenous Peoples' Day · **US Thanksgiving** · Veterans Day.

**Overlaps to handle in design:** Labour/Labor Day (1st Mon Sep, both countries, different
spelling) and Nov 11 (Remembrance Day CA / Veterans Day US, same date) — show the
country-appropriate label under each filter.

**🎨 My Custom:** user-created occasions (already supported).

---

## 4. Emails (restyle + a couple new)

Brand-consistent, mobile-first, table-based HTML. Same data the current pipeline already
provides.

1. **Welcome email** (exists — restyle only): snippet box + "Open my control panel →" +
   the 🔖 bookmark callout (keep the bookmark behavior). Same fields as today.
2. **Perk-enabled email** (NEW, paid): "Occasions is now included with your plan — add as
   many sites as you like" + button into the GHL dashboard.
3. *(Optional, phase-later)* **Seasonal nudge**: "Canada Day is in 5 days — turn on your
   banner" (engagement driver).
4. *(Optional, phase-later)* **Free → upgrade**: shown when a free user hits the 1-site cap.

---

## 5. Popups / modals

- **Add a site** — domain input + validate + add.
- **Create / edit custom occasion** — name, start/end dates, message, colors, animation,
  **link URL + open-in** (reuse existing fields).
- **Install snippet** — per-site copy box + platform InfoTips.
- **Preview** — shows a sample of the chosen banner/animation (preview only; not the live
  renderer).
- **Upgrade** — Free users hitting the cap: "Unlimited sites are included with your
  AIBizConnect plan."
- **Confirm remove site** — destructive confirm.

> Note: "popups" here = dashboard modals. The visitor-facing on-site **banners/popups** are
> the LOCKED engine and are not redesigned.

---

## 6. Brand & system

- **Palette:** primary navy/royal `#1e3a8a`–`#2563eb`, accent cyan `#22d3ee`, light slate
  surfaces (`#f8fafc`/white) for the dashboard, `#0f172a` text. (House tokens from the
  marketing kit; dashboard is the **light** variant.)
- **Type:** MontserratAlt1 (display/headings) + Poppins/Inter (body).
- **Tone:** clean, friendly, fast — a control panel a non-technical small-business owner can
  use in 2 minutes.
- **Responsive:** must look right in the GHL sub-account iframe (narrow) and full-width;
  mobile breakpoint required.
- **Accessibility:** AA contrast, focus states, keyboard-operable toggles/modals.

---

## 7. What design should deliver

1. The **Dashboard** — all 5 tabs, in Free and Paid states, narrow (GHL) + wide + mobile.
2. The **Occasions picker** with the category filter + presets + occasion cards + custom.
3. The **4 modals** in §5 (+ confirm-remove).
4. The **emails** in §4 (welcome restyle + perk-enabled; optional two noted).
5. A small **component sheet**: site card, occasion card, category chips, plan pill,
   InfoTip, primary/secondary buttons, toggle, empty/loading/locked states.

---

## 8. Engineering note (NOT design's job — flagged for build)

- The `region` tag (§3) is the one piece that touches the LOCKED `lib/occasions.ts`
  catalog. It is **purely additive metadata + a UI filter, zero behavior change**, default =
  Global. Needs Ali's explicit lock re-open before we add it.
- Dashboard data model: add `owner_type` / `ghl_location_id` / `plan` to
  `occasion_widget_sites` (new migration, applied by Ali). Public path enforces 1-per-email;
  GHL path = unlimited + badge toggle.
- GHL surface: Custom Menu Link / Marketplace app passing location identity via SSO; paid
  signal via the existing GHL "paid" tag → our webhook.
