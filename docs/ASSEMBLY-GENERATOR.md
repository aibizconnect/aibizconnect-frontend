# Direct-Assembly Website Generator (D-292..296)

**The Relume model, native to us.** Generates beautiful, fully-editable pages by
ASSEMBLING from our own prebuilt section library + writing real copy — straight into our
section JSON. NO HTML, NO render bridge, NO importer: **lossless by construction**.

ADDITIVE — does not touch the editor or importer (Ali's law). The Stitch/import path stays
as an alternative.

## Why it's reliable (vs. asking an LLM to emit raw section JSON)
The LLM only does two things it's good at: **pick** prebuilt sections (by id) and **write**
copy. Structure, validity, and styling come from our 60+ curated, schema-valid prebuilts.

## Flow (lib/sites/assembly-generator.ts)
1. `planSitemap(profile)` → pages + pageType (LLM, with deterministic fallback).
2. `assemblePage(profile, page)`:
   - LLM picks an ordered list of prebuilt ids per the page's category flow (Header → Hero
     → Content → Social Proof → Conversion → Footer), deterministic fallback if it strays.
   - Clone the prebuilts; extract every copy SLOT (text/label/heading/…) with its JSON path.
   - ONE whole-page copy pass (Relume Copywriting-1.5 coherence) — real, grounded, no lorem,
     no invented facts; testimonials/stats are clearly editable samples.
   - Apply copy by PATH (deterministic — structure never breaks).
   - `applyBrand` — solid buttons adopt the brand primary (white text); nothing else
     recolored (prebuilts are already contrast-correct).
   - `fixContrast` — deterministic self-heal: any text that would be invisible against its
     band background flips to white/ink (satisfies the Inspector contrast guard).
   - Validate every section with sectionSchema; drop any that fail (always shippable).
3. `generateWebsiteFromBrief(tenantId, websiteId, profile)` — orchestrator: sitemap → assemble
   each page → persist draft pages with generated SEO title + description.

## Proof (2026-06-13)
A 6-page AI Biz Connect site from a one-line brief: home/about/platform/services/pricing/
contact — every page **VALID, 0 fallbacks, Inspector 100** (only seo-og-missing, an info
note = optional social image).

## Entry points
`app/tenants/[tenantId]/website/assembly-actions.ts`:
generateAssembledSiteAction · assemblePageAction · planSitemapAction. No UI yet — a
"Generate with AI" button wires to these (next step, on Ali's go).

## Not built (deliberately, per Gemini ruling)
UI, wizard integration, AI image generation, multi-turn repair agent. Single LLM provider
chain (OpenAI→Gemini; Gemini carries it).
