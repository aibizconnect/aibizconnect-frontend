Ali — Claude — I’ve got the full picture, and this is the moment to lock the architecture into the written record.
You’ve executed every ruling exactly, and the system is now aligned with the North‑Star builder, the Launchpad doctrine, and the Genesis governance model.

You asked for the docs — here they are, fully generated, clean, canonical, and ready to drop into the repo.

Below are all three documents, updated to reflect:

D‑382 → D‑390

The tokenized section library (D‑386 → D‑390)

The Launchpad governance doctrine

The Genesis acceptance model

The Template Factory integration

The North‑Star builder roadmap

The ABC “AI Business OS” showcase

The P‑A/P‑B/P‑C phasing

The hardcode-tokenization audit

The P2 swap engine

The sitemap-first builder (P1)

Everything is file‑ready.

📄 DOC 1 — docs/TEMPLATE-FACTORY.md (UPDATED)
Code
Copy
# Template Factory — System Templates, Tokens, and Section Library
Architect of Record: Copilot
Status: Updated through D‑390

## Overview
The Template Factory is the unified source of:
- System section templates (code-based)
- User-saved templates (DB-based)
- Tokenized styling (BrandTokens → CSS vars)
- P2 swap engine (replace/regenerate)
- P‑A/P‑B/P‑C tokenized section library

System templates live in code.  
User templates live in DB.  
Both appear in the same library UI.

---

## D‑386 — tokens.json = Serialized BrandTokens
BrandTokens fields:
- colors
- typography
- spacing
- radii
- shadows
- breakpoints

Presets:
`lib/design/token-presets/{realestate,neutral}.json`

Pipeline:
BrandTokens → tokensToCssVars → `--abc-*` CSS vars → SectionView.

No Tailwind fork.

---

## D‑387 — Presets as Files + applyBrandPreset()
Presets are JSON files, not DB rows.

Server action:
`applyBrandPreset(tenantId, presetKey)`

Writes to:
`website_brand_settings.theme`

Renderer consumes updated BrandTokens via existing CSS var pipeline.

---

## D‑388 — Hardcoded Value Audit (P‑B)
All native sections must be audited for:
- hardcoded px
- hardcoded hex
- hardcoded font names
- hardcoded spacing/radius/shadow

Replace with token references.

If a section requires a unique visual, add a semantic token (e.g., `--abc-card-bg`).

Audit precedes authoring the 2‑variant section set.

---

## D‑389 — Tokenized Section Library Phasing (P‑A → P‑B → P‑C)

### P‑A — Tokens + Presets + Apply
- Implement tokens.json + presets
- Implement applyBrandPreset
- Verify a preset swap re‑skins one section end‑to‑end

### P‑B — Author 2‑Variant Native Sections + Hardcode Audit
- Variant A (real estate)
- Variant B (neutral)
- Store in code (`prebuilt-templates.ts`)
- Tokenize all hardcoded values

### P‑C — Static HTML Export + /preview Switcher
- `renderSectionToHtml()`
- `/preview` with realestate ↔ neutral toggle
- README for integrators

---

## D‑390 — System Templates Live in Code
System templates:
`lib/sections/prebuilt-templates.ts`

User templates:
`website_section_templates` (DB)

Both appear in the same library UI.

---

## Integration with P2 Swap Engine
Swap engine uses:
- sectionAlternatives
- replaceSectionWithPrebuilt
- AI-regenerate (existing)

Editor button pending.

---

## Integration with P1 AI Sitemap-First
Sitemap defines:
- pages
- section outlines
- section types

Template Factory resolves section types → tokenized templates.


📄 DOC 2 — docs/AI-WEBSITE-BUILDER-NORTH-STAR.md (UPDATED)
Code
Copy
# AI Website Builder — North‑Star Specification
Architect of Record: Copilot
Status: Updated through D‑382, D‑386 → D‑390

## Vision
Achieve Relume-level AI website generation using ABC’s native Section→Row→Column→Element model and supervised agent.

Builder must:
- Generate sitemap from business context
- Generate pages/sections from tokenized library
- Apply global AI style guide
- Support replace/regenerate at any level
- Be fully agent-editable
- Export static HTML
- Support realestate ↔ neutral preview

---

## D‑382 — Builder Phasing (Canonical)

### P1 — AI Sitemap-First Generation
- Input: business profile, industry, goals
- Output: sitemap (pages + section outlines)
- Replaces fixed industry templates
- Foundation for P2/P3/P4

### P2 — Swappable Section Library
- Replace section
- Regenerate section
- 2 polished variants per section
- Tokenized styling

### P3 — AI Style-Guide Generation
- Colors
- Typography
- Spacing
- Radii
- Shadows
- Breakpoints

### P4 — Expanded Supervised Agent Tools (Genesis G2)
- Funnels
- CRM edits
- Automation creation
- Multi-page consistency
- Cross-page refactoring

---

## Tokenized Section Library (D‑386 → D‑390)
- BrandTokens serialized to tokens.json
- Presets in `lib/design/token-presets`
- applyBrandPreset writes to website_brand_settings
- Hardcoded audit required
- 2 variants per section (realestate/neutral)
- Static HTML export
- /preview switcher

---

## Integration with Launchpad
Builder runs in the `website` Launchpad step.

Genesis reads:
- sitemap
- style guide
- section templates

---

## ABC as Showcase (D‑383)
ABC’s site must be:
- Fully AI-editable
- Tokenized
- Built with the same builder
- The public demonstration of the AI Business OS


📄 DOC 3 — docs/TENANT-GENESIS-PROTOCOL.md (UPDATED)
Code
Copy
# Tenant Genesis Protocol
Architect of Record: Copilot
Status: Updated through D‑395

## Doctrine
Launchpad = onboarding spine  
Genesis = Launchpad completion engine  
No anonymous provisioning  
No resource creation for non-accounts

---

## D‑391 — Tenant Creation Requires Authenticated userId
`provisionTenant()` requires userId.  
`/start` becomes a marketing teaser only.

---

## D‑392 — Launchpad is the Authoritative Onboarding Spine
Structural provisioning at signup.  
Contextual provisioning maps to Launchpad steps:
account → brand → website → idx_vow → domain → email → social → ecommerce

Genesis may read Launchpad state but must not write outside its step.

---

## D‑393 — No Resource Creation for Non-Accounts
No subdomains, listings, CRM contacts, or DB rows until a real user exists.

---

## D‑394 — Purge Anonymous Soft Tenants
Purge all pre-account-gating tenants with full cleanup + audit.

---

## D‑395 — Launchpad State Must Be Idempotent + Resumable
Launchpad must resume cleanly after refresh/close.  
Genesis must not double-seed or double-provision.

---

## D‑384 — Sample-Listing Seed at Signup (Real Estate Only)
18 sample listings with:
- source="sample"
- seed_version=1

---

## G1 Acceptance (Real Estate Tenant)
1. genesis_runs row exists  
2. tenant_modules correct  
3. 18 sample listings  
4. CRM mirror contact  
5. Homepage IDX in sample mode only  
6. Genesis Report banner  
7. Header/Footer applied

G1 = PASS when all seven checks pass.


🎯 Everything is now filed, canonical, and ready to merge.

If you want, I can also generate:

The hardcode-tokenization audit checklist

The section variant authoring guide

The AI sitemap-first prompt spec

The static HTML export contract

Just say the word.

Edit in a page