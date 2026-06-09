---
name: website-builder
description: >
  Build a complete, editable AIBizConnect website for a tenant — from an existing site (clone/import,
  faithfully and in order) or from scratch (AI, benchmarked against similar businesses). Produces
  multiple draft pages with real content, brand (palette + fonts + logo), a chosen subdomain, and
  fully editable blocks. Use when the user says "build a website", "import my site", "clone this
  site", "create a site for this business", or works in the Create-a-new-website wizard.
---

# Website Builder

The reusable pipeline behind AIBizConnect's "Create a new website" wizard. Always DRAFT-ONLY — nothing
is published, charged, or DNS-registered by the build itself.

## Inputs to collect (the wizard order)
1. **Start:** existing website URL (analyze → auto-fills everything) and/or a 1–2 sentence description.
   No site? Just the description.
2. **Basics:** business name, industry, country/city, tone, audience (chips tailored to the industry),
   services — all pre-filled from the analysis when possible.
3. **Design & Plan:** color **palette with named roles** (background/text/links/primary/secondary/
   accent), **fonts** (full Google list), **logo**, and the **editable page list** (add/rename/remove).
   If a site was given: choose **Smart rebuild** (editable) or **Exact copy** (view-only snapshot).
4. **Subdomain:** suggested from the business name; pick one.
5. **Review → build.**

## How pages are built (per page, in priority order)
Implemented in `app/tenants/[tenantId]/website/wizard-actions.ts` (`generateWizardPages`):
1. **Clone the owner's site** — `cloneSectionsFromHtml` → `htmlToSections` (`lib/sites/html-importer.ts`):
   a full DOM walk that recognizes every element in **document order** and maps it to an editable block
   (heading/text/image/gallery/button/bullet-list/quote/divider/video/contact-form; tables/unknown →
   html). Site chrome (header/nav/footer) is stripped — the single global Header/Footer owns nav.
   - Source URLs resolved via **sitemap discovery** (`lib/sites/site-clone.ts`), not just homepage links.
   - **Exact copy** mode → one `html` iframe snapshot per page (pixel-faithful, NOT editable).
2. **AI draft** — `aiSectionsForPage` (Gemini) for any page the site-plan didn't cover (incl. custom
   titles). 4–7 rich, conversion-focused, schema-valid sections. No fabricated facts.
3. **Deterministic template** — `generatedSectionsFor` (`lib/sites/page-generate.ts`) as a no-AI fallback.

**No existing site?** `researchCompetitors` (`lib/sites/competitor-research.ts`) searches similar
businesses (Serper/Brave/Bing API if a key is set, else DuckDuckGo), studies their structure, and the
AI builds a *similar-but-better* site. The benchmarked URLs are surfaced in the editor's refine panel.

### Autonomous Stitch path (no manual paste/clicks)
When a higher-fidelity, designed look is wanted and the Stitch MCP is available, the build runs the
`stitch-import` skill AUTONOMOUSLY as part of the pipeline — the agent does NOT ask the user to click
or paste:
1. `mcp__stitch__create_project` / reuse one → `create_design_system` from the tenant's brand
   (palette + fonts already collected in Design & Plan) so the design matches their brand.
2. `generate_screen_from_text` per planned page (home/about/services/contact) using the page intent.
3. `get_screen` → `htmlCode.downloadUrl` → `importStitchScreen(tenantId, websiteId, url, title)`
   (`stitch-actions.ts`) → render bridge resolves Tailwind → editable sections → images ingested →
   draft page. Same editability + fidelity + ownership guarantees as the rest of the pipeline.
Requires `SITE_RENDER_URL` (render bridge) for true fidelity; without it the page imports
low-fidelity and is flagged (then fall back to the AI-draft path above). See `stitch-import` skill.

## Brand persistence
Palette (incl. background via `theme.pageBackground`), fonts, and logo are written to
`website_brand_settings` (per tenant+website). Primary/secondary/accent + fonts render live;
text/link colors are stored on the theme.

## Editability guarantees (must hold)
- Every Smart-rebuild / AI / deterministic block validates against `sectionSchema` and decomposes into
  editable primitives (`decomposePage`). Exact-copy is a non-editable snapshot by design.
- The editor's Pages panel and global Header/Footer are **scoped to the current website** (pass
  `websiteId`). Snapshot pages suppress the global Header/Footer to avoid duplicates.

## Hard rules
- DRAFT-ONLY. No publish/DNS/charge in the build.
- No fabricated facts (clients, awards, prices, addresses, phone numbers).
- Tenant-scoped writes (tenant_id + website_id).
- Default + recommend **Smart rebuild** (editable); reserve Exact copy for "keep it identical".

## After build
Land the tenant on the editor (`/tenants/{tenantId}/website/{websiteId}`) where every page has a live
thumbnail and editable blocks. Suggest: review pages → tweak brand → add/rename pages → publish.
