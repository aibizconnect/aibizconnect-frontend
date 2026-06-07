# AIBizConnect — Shared Product & Editor Direction (CANONICAL)

Source: ratified by Ali + Copilot, handed to Claude (Supervisor-Agent) to align all
designs/flows/components. Date: 2026-06-01. This is the source of truth; other docs defer
to it.

## Positioning (non-negotiable)
- NOT a "website builder."
- A **supervised AI business-launch system**.
- AI generates a full **multipage site + funnels** from profile, industry, brand, location.
- Tenant **reviews, customizes, and publishes** — nothing auto-live.

## Onboarding / Intake
**Entry detection**
1. **Branch A — Invited user**: signed invite token → `parent_tenant_id` + preliminary
   profile. Inherit from parent: industry, brand tokens (palette/font/logo), location
   scope, entitlements + billing payer ("top decides who pays / what's included"). Invited
   user only confirms personal: name, contact, city/area, headshot, a few service
   specifics → one-screen confirm → AI generates a **pre-branded multipage draft** under
   the parent brand.
2. **Branch B — Direct new user (wizard + live preview)**, each step skippable w/ smart
   defaults:
   1. You & business: name, business name, email → lite account (full signup deferred to
      publish, no payment).
   2. Pick industry: 12-card animated picker (gradient brand previews, imagery, motion).
   3. Location: country → state/province → city → area (manual cascading selects; drives
      local SEO, schema, "serving {city}" copy, maps).
   4. Brand (v2): palette from template BrandHint; adjust primary/accent; font; optional
      logo upload (only explicit/gated action).
   5. Essentials (v2): services, hours, phone (industry defaults if skipped).
   6. Generate → live preview → review/publish: AI generates full multipage draft;
      O-3 critic gate before publish; tenant flips design toggle → live on free subdomain.

- **v1 scope:** ship Steps 1–3 + generate first; add 4–5 next.
- **Account timing:** lite email up front, full signup only at publish.
- **Location input:** manual cascading selects (no Places API; privacy-preserving).

## Safety Model (unchanged doctrine)
- Drafts only — no auto publish/send/charge.
- Logo upload + publish are explicit actions.
- Per-tenant publish control.
- O-3 critic required before any page publish.
- G-approval (human) for live actions.
- Ads/voice: stubbed, dry-run only, behind flags + financial boundary.
- Any schema change (`tenants.parent_tenant_id`, `lead_source`, `location`, etc.) is
  QUEUED, not applied directly.

## Site Architecture
- Real **multipage** websites, not one long page with #anchors.
- Each page = a real entity (URL, SEO, schema, critic score, publish state).
- AI generates a full **sitemap per industry** (e.g. Home, About, Services, Listings,
  Testimonials, Contact …).
- **Funnels are first-class**: visual funnel builder (GHL-style canvas).

## Editor & Funnel Builder
Goal: GHL-level **"structured freedom"** — not raw pixel/HTML editing.
- Component-based editor (design-system components, critic-safe).
- Tenants can: drag-drop sections/blocks; reorder/duplicate/delete; adjust
  spacing/padding/margins/alignment; change backgrounds/radius/shadows; swap images; edit
  text inline; change layout (columns/grids); add forms, CTAs, galleries, maps, etc.
- Brand tokens always applied (palette, typography, logo, spacing, radius, shadows).
- O-3 critic runs on publish (structure, accessibility, SEO, safety).
- Element inspector (per the GHL reference) = 3 tabs:
  - **General**: element name; Text + Sub Text; Typography (type → Headline/Content font,
    size px, weight).
  - **Styles**: appearance (full width, BG style, spacing), visual Margin & Padding box,
    Border (style/color/sides), radius, shadow.
  - **Animations**: Entrance (None, Fade In/Up/Down/Left/Right, Slide, Bounce…) + Hover
    (None, Elevate, Wobble), clearable.
- Graphical funnel builder: nodes, connections, triggers, actions, steps, thank-you,
  upsells — all AI-drafted and editable.

## Brand System
- Assets: logos (variants), special display font for the brand name, mascot (robot)
  renders/GIF, Canva brand kit (palette, typography, examples).
- Rule: whenever **"AI BIZ Connect"** appears → use the **special display font**;
  everything else → clean system font (Roboto / MontserratAlt1).
- Design tokens:
  - `font.displayBrand` — for the "AI BIZ Connect" name (MontserratAlt1).
  - `font.system` — all other text (Poppins/Roboto).
  - `brand.logo.*`, `brand.palette.*`, `brand.mascot`.

## Build status vs this spec (Claude's tracking)
- DONE: 12 industry templates, one-click apply→draft→critic→publish, public marketing
  site (multipage), GHL-style tenant dashboard shell, brand fonts (MontserratAlt1 +
  Poppins) + navy/cyan palette wired.
- NEXT (agreed): onboarding wizard v1 (steps 1–3 + generate).
- NEW subsystems from this spec: invited-user branch + invite tokens; multipage
  generation per industry sitemap; GHL editor inspector (3 tabs); funnel canvas builder;
  formal `font.displayBrand`/`font.system` tokens + mascot token.
