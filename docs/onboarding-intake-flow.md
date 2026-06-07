# First Steps — User Onboarding & Website Intake Flow (proposal for deliberation)

Status: DRAFT for Ali + Copilot to deliberate. No code committed from this doc yet.
Author: Supervisor-Agent (Claude). Date: 2026-06-01.

## Goal
Turn a brand-new visitor into a live, on-brand website with the least possible effort —
while collecting exactly the information the Mesh needs to generate something genuinely
tailored (industry + location + brand), not generic. Keep the clean, premium feel Ali
liked, but richer than the old one-pager: real photography, graphics, and an
interactive, motion-y industry picker (the "moving stock-market-style" selector).

## Core principle
Ask the fewest questions that unlock the most tailoring. Every answer must change the
output. Smart defaults everywhere; nothing blocks the user from seeing a result fast.

---

## 1. Entry detection — WHO is arriving?
On first load we branch on the visitor's source:

- **A. Invited by a parent/supervisor tenant** (franchise HQ, brokerage, agency).
  Detected via an invite link carrying a signed token (e.g. `?invite=<token>` →
  resolves `parent_tenant_id` + a preliminary profile the top tenant already filled).
- **B. Direct new user** — arrived on their own (organic, ad, referral with no tenant).
- **C. Returning user** — already has an account → straight to dashboard.

How we know: invite token (A) > existing session (C) > otherwise direct (B).

---

## 2. Branch A — Invited by a top tenant (prefill, don't re-ask)
The parent tenant has already told us a lot. We **inherit** and only confirm:

Inherited from the parent tenant's profile:
- Industry (e.g. the brokerage → "real-estate")
- Brand tokens (palette, fonts, logo) — so every sub-site is on the parent's brand
- Location scope (country/region) + entitlements/billing payer (per Ali's rule: the top
  decides what's included or who pays)

The invited user only supplies what's personal to them:
- Their name + contact, their specific city/area, their headshot/photo, a few service
  specifics. (A solo agent under a brokerage = brokerage brand + their own locale + bio.)

Outcome: one-screen confirm → we generate their draft site pre-branded. Fastest path.

---

## 3. Branch B — New direct user (progressive intake wizard)
A short, visual, multi-step wizard. Each step is skippable with a smart default and
shows a **live preview** updating as they go.

1. **You & your business** — name, business name, email. (Account-lite; real signup at
   publish time. We do NOT ask for payment.)
2. **Pick your industry** — the interactive picker. Visual cards (the 12 templates), each
   with its gradient brand preview + sample imagery; subtle motion on hover/scroll. This
   chooses the template + seeds BrandHint.
3. **Where you operate** — country → state/province → city → area/neighbourhood.
   Drives local SEO (title/description, schema), location sections, maps, and copy
   ("serving {city} and {area}"). Cascading selects; area optional.
4. **Make it yours (brand)** — palette prefilled from the template's BrandHint; let them
   adjust primary/accent, pick a font, and optionally upload a logo. (Upload is the only
   gated action — explicit, user-initiated.)
5. **The essentials (optional)** — services/offerings, hours, phone. Skippable; we fill
   sensible industry defaults and they can edit later in the editor.
6. **Generate & preview** — one click builds the multi-page draft (templates engine),
   brand applied, location woven in. Live preview. Then the existing path: review →
   publish (O-3 critic gate) → flip design → live on their free subdomain.

---

## 4. Design direction (what it should FEEL like)
- Keep the clean, confident copy voice from the previous page.
- Add real **photography** per industry (curated/AI imagery), tasteful **graphics**, and
  **subtle motion** (no gimmicks) — including the interactive, animated industry picker.
- Premium, brand-consistent: AIBizConnect blue palette + MontserratAlt1 display font,
  logos from /public/logos. (Final palette/branding to follow from Ali's Canva shots.)
- Everything renders against design tokens so it stays cohesive and re-themeable.

---

## 5. Data the flow needs (touchpoints)
- `tenants` — may need: `parent_tenant_id`, `lead_source` (direct|invite|referral),
  `location` (country/region/city/area). (Any schema change is QUEUED, not applied.)
- `tenant_brand_memory` — palette/font/logo (already exists).
- `tenant_feature_policies` — inherited from parent for Branch A (already exists).
- `website_pages` drafts — output of the templates engine (already proven).
- Invite tokens — a signed, expiring token mapping to `parent_tenant_id` + prelim profile.

## 6. Safety (unchanged guarantees)
- Intake produces DRAFTS only; nothing publishes/sends/charges automatically.
- Logo upload + final publish are explicit user actions.
- Publish always runs the O-3 critic gate; design flip stays per-tenant.
- No payment captured during onboarding; billing is a later, separate, approved step.

---

## Open questions for deliberation
1. Account creation timing — collect email up front (Branch B step 1) or defer real
   signup until publish? (Proposal: lite up front, full at publish.)
2. Location source — manual cascading selects vs. an autocomplete (Google Places-style)?
   Manual keeps us dependency-free and privacy-preserving; autocomplete is smoother.
3. How rich at v1 — do we ship steps 1–3 + generate first (fastest to value), and add
   steps 4–5 polish next? (Proposal: yes, 1–3 + generate as v1.)
4. Imagery source for the premium look — licensed stock, AI-generated per industry, or
   Ali-provided libraries (Pix/Sample photos folders)?
