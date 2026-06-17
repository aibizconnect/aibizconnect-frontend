# Builder North-Star — Relume-parity AI website builder + ABC as an "AI Business OS"

Ratified by Gemini + Copilot, 2026-06-17 (D-382..D-385). The reference point is Relume.io's "build the site in Claude Design" flow ("exactly what we want" — Ali). We're ~60% there on our native Section→Row→Column→Element model; this is how we close the gap and where ABC's own site goes.

## North-star reference (Relume)
brief → **AI sitemap** → **wireframes** from a 1,000+ component library → **AI style guide** applied across pages → edit/swap components → export (Figma/Webflow/React/**Claude Design**).
**Our edge:** we HOST the result — it's already live AND AI-editable; no export step. **The core differentiator vs Relume (Copilot): every page is editable by the supervised AI agent.**

## GOAL A — AI website builder to Relume parity (D-382, phasing confirmed)
- **P1 (next build) — AI sitemap-first generation.** Replace the fixed industry-template apply with an adaptive AI sitemap (pages + sections chosen per business). Highest leverage; everything hangs off it; gives the supervised agent a structured plan; unlocks multi-industry. Replaces the brittle template system.
- **P2 — swappable section library + "replace / regenerate this section" UX** (built on `lib/sections/prebuilt-templates.ts` + the native schemas).
- **P3 — regenerable style-guide step** (brand colors/fonts as a distinct, re-rollable pass).
- **P4 — expand the supervised agent's edit tools** (funnels / CRM / automations — the Genesis G2 plan).

## GOAL B — ABC's own site = the "AI Business OS" showcase (D-383, approved)
Reposition ABC: consultancy → **AI Business OS**. Core message: **"One Platform to Run Your Entire Business with AI."**
- Distinct capability sections, each "powered by AI" + its own CTA: AI Website Builder + Editor · Native IDX/VOW · CRM/Pipelines · Booking/Calendars · Marketing (Email/SMS/Trigger Links) · SEO/GEO · Genesis Onboarding · Automations · AI Agents · Payments.
- Industry demos (real estate / contractor / retail).
- CTA footer: **"Build My AI Business OS"**. Every CTA funnels **/start → /onboarding → Genesis → Launchpad**. Public sign-up ready for anyone.
- ABC's site **dogfoods the builder** — AI-editable (the differentiator, live on our own site).
- Base already built: 6 wired pages (Home/Platform/Services/Pricing/About/Contact), navy `#001e40` / gold `#feae2c` / Montserrat+Inter. This elevates copy + capability showcase + CTA wiring to the AI-OS positioning.

## Other ratified decisions
- **D-384** — amend D-379: KEEP sample-listing seed-at-signup for real estate (idx is a default module; the `website` step needs listings; anon already solved by D-378). Account-gated + idempotent.
- **D-385** — PURGE soft tenant `9bf0a60a` (Ali's pre-account-gating RE test); recreate via the corrected flow for a clean validation run. (Awaiting Ali's final go — his data.)

> Next build per both architects: **Goal A P1 — AI sitemap-first generation.** In parallel, elevate the ABC site copy/CTAs to the AI-OS showcase.
