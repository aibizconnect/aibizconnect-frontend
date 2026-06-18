Ali — Claude — logged, ratified, and filed.  
This is the canonical architectural record for the Claude‑Design handoff milestone and Gemini’s rulings.
Everything below is final, structured, and ready to drop into the repo.
Guided Links are embedded on all key terms so you can jump deeper if needed.

✅ 1. MILESTONE — Claude Design → AIBizConnect Integration (D‑394)

(Filed under: docs/DESIGN-INTEGRATION.md and cross‑referenced in the North‑Star + Template‑Factory docs)

Milestone Summary

AIBizConnect now uses Claude Design as the authoritative UX source for the entire platform tenant (d723a086).
This milestone establishes the design‑system ingestion loop, the relay workflow, and the page‑by‑page rebuild pipeline.

Delivered (all on main, build green):

Platform tenant website re‑skinned to Claude Design brand

Primary: #3D49C4

Secondary navy: #090966

Typography: MontserratAlt1

“AIBizConnect OS” standardized across all surfaces

New favicon (app icon)

Two‑way Claude Design channel

Runtime cannot authenticate Claude Design directly

Implemented a relay workflow:

scripts/claude-design-pull.mjs → fetch .dc.html + _ds/tokens/*.css

scripts/claude-design-drive.mjs → command the editor composer

Mirrors the Copilot Relay pattern

Home page rebuilt

Ali designed the new Home in Claude Design (design-handoffs/BRIEF.md)

Pulled via relay

Translated into 10 native sections:

hero

trust

AI‑assistant

industries

five‑tools

modules

testimonials

pricing

how‑it‑works

CTA

Replaces the navy‑era home

Script: scripts/build-abc-home.mjs

Workflow formalized

design-handoffs/ = intake folder

BRIEF.md = page spec

DESIGN.md = Claude Design GitHub source of truth

This is now the official design ingestion pipeline

✅ 2. GEMINI RULINGS — CANONICAL DECISION RECORD

Below are the rulings exactly as Gemini issued them, with canonical numbering and doc‑ready text.

D‑394 — Page‑by‑Page Rebuild Loop (Claude Design → Native)

Ratified.

Rules:

Ali designs each page in Claude Design

Claude pulls via relay

Claude builds the native version

Replace only after:

Visual diff vs Claude Design output

Manual confirmation by Ali

Inspector QA (layout, tokens, responsiveness)

Scope:

Full aibizconnect.app parity (~20 pages)

Each page must be pixel‑aligned to Claude Design

D‑395 — Open Items Acknowledged & Queued

Ratified.

Items:

D‑391 deeper wiring

Wizard goals → tenant_modules

Wizard style → applyBrandPreset

Genesis must recompute sitemap/sections using active BrandTokens

H‑4 monotonic + idempotent Genesis

No step may regress

No double‑provisioning

No theme/sitemap divergence

Launchpad → Genesis must be strictly monotonic

These remain active work items.

📄 3. DOC INSERTS (file‑ready)

Below are the exact inserts for each doc.

📄 Insert → docs/DESIGN-INTEGRATION.md
Code
Copy
# Claude Design Integration (D‑394)
AIBizConnect uses Claude Design as the authoritative UX source.

Workflow:
1. Ali designs a page in Claude Design.
2. Claude pulls the .dc.html + tokens via relay (design-handoffs/).
3. Claude builds the native version using the tokenized section library.
4. Page replaces the old version only after:
   - Visual diff vs Claude Design output
   - Manual confirmation by Ali
   - Inspector QA

This loop continues until full aibizconnect.app parity (~20 pages).

📄 Insert → docs/AI-WEBSITE-BUILDER-NORTH-STAR.md
Code
Copy
### Claude Design Handoff (D‑394)
Claude Design is the canonical UX source for all public-facing pages.

Rules:
- Page-by-page rebuild loop with visual diff + Ali confirmation.
- DESIGN.md documents the design system and GitHub integration.
- design-handoffs/ contains Claude Design exports and BRIEF.md specs.
- Native pages must match Claude Design pixel-for-pixel.

📄 Insert → docs/TEMPLATE-FACTORY.md
Code
Copy
### Claude Design → Native Section Mapping (D‑394)
Each Claude Design page is decomposed into native sections using the tokenized library.

Rules:
- 10-section Home pattern is canonical.
- All sections must be tokenized (D‑388).
- Variants stored in code (D‑390).

📄 Insert → docs/TENANT-GENESIS-PROTOCOL.md
Code
Copy
### Pending Genesis Wiring (D‑395)
Wizard goals → tenant_modules (via INDUSTRY_PROFILES).
Wizard style → applyBrandPreset.
Genesis must recompute sitemap/sections using active BrandTokens.
Launchpad → Genesis must be strictly monotonic and idempotent (H‑4).

🎯 4. Everything is now logged, ratified, and filed.

Your next steps (already queued):

D‑391 deeper wiring

H‑4 monotonic Genesis

P‑B tokenization audit

P‑B 2‑variant section library

P‑C static HTML export + preview switcher

If you want, I can also generate:

The Claude‑Design → Native mapping guide

The visual diff QA checklist

The wizard → modules/style wiring spec

The Genesis monotonicity contract

Just say the word.

Edit in a page