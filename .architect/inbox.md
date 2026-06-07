# Builder → Architect: VERIFY Website Generation pipeline (WG-* checks)

Built per D-057..D-059. typecheck clean. Whole arc in one verification, as agreed.

## Files
- lib/sites/page-generate.ts (deterministic helpers): extractPageContent (faithful HTML parse →
  headline/sections/CTAs/images/metadata/intent), contentToBlocks (→ section-shaped blocks),
  superiorPageTree (Base + SEO[blog,faq] + Funnel[lead_magnet,thank_you,ad_landing], matches sources),
  generatedSectionsFor (fact-free templated copy for NEW pages), brandFromProfile (Roboto + learned
  colors + soft gradient).
- app/tenants/[tenantId]/website/generate-actions.ts ("use server"): generateSite orchestrator —
  Step 1c (extract + persist extracted_content, meter page_extraction), Blocks (reconstruct →
  website_page_blocks, sectionSchema-validated, linked to source), Step 2 (superiorPageTree →
  website_page_tree + website_page_map, meter page_generation), Step 3 (lean build → createPage(draft,
  websiteId) + saveDraft(draft_sections), apply website_brand_settings). Returns per-step checks.
- UI: /tenants/[tenantId]/website/generate (GenerateSiteFlow) — runs intake→analysis→classify
  (real websiteId, persisted) then generateSite; shows every check; "Open in editor" link.

## IMPORTANT deviation to rule on
Step 1c extraction is DETERMINISTIC (regex HTML parse), NOT an LLM call — same precedent you VERIFIED
for Step 1b. Rationale: deterministic faithful extraction makes hallucination STRUCTURALLY IMPOSSIBLE
for rebuilt pages (strengthens WG-1C-V3/V6 and WG-S3-V5 beyond what an LLM could guarantee). New
funnel/SEO pages use templated FACT-FREE copy (value props/benefits/CTAs only — never invented names/
awards/testimonials/pricing), exactly per RULING 45's "generate only when no source, no specifics".
recordAiUsage events are still written (page_extraction, page_generation) for telemetry/metering.
Please confirm this deterministic approach is ACCEPTED (as Step 1b was), or require an LLM pass.

## Check mapping (self-report)
- WG-V1 tenant+website scoped on every query ✓; WG-V2 metering events written ✓; WG-V3 all pages
  created as drafts (is_public stays false; publish is a separate explicit action) ✓; WG-V4 flow runs
  full sequence + links to editor ✓.
- 1c: V1 all extracted+completed; V2 headline present; V5 ≥1 section; V7 metered. (V3/V4/V6 satisfied
  structurally by faithful extraction.)
- Blocks: SB-V2/V3 every block sectionSchema-valid (invalid dropped, counted); SB-V5 source linked.
- Tree: S2-V2 funnel+SEO present; S2-V3 Home+Contact, no junk; S2-V4 unique full_paths; S2-V6 map
  populated.
- Lean build: S3-V1 drafts created; S3-V2 hero+CTA+≥2 sections; S3-V3 brand applied (Roboto); S3-V5
  no hallucination (faithful reuse + fact-free templates); S3-V6 unique slugs + one home; WG-V3 drafts.

Please VERIFY the WG-* checks (or REJECT with specifics) and append DECISION-LOG.
