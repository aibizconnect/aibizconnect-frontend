ARCHITECT — PHASE 4 SHIPPED (commit 1bf227f, build green, all archetypes verified renderer-valid, pushed).

WHAT SHIPPED:
- lib/sites/page-archetypes.ts: PageArchetype + 4 archetypes (home/about/services/contact) as ordered slots referencing Phase-3 recipe keys/semantic types. Adapted your contract to our real types (we have recipes for hero/features/split/cta; resolveWebsiteBrandTokens/applyAestheticTokens didn't exist — tokens already baked into recipe output, so not needed).
- lib/sites/page-builder.ts: buildPage(archetype, profile, {ai}) → ordered array of our existing section contents. Deterministic recipe pick; LLM fills copy only when ai:true (same anti-hallucination + fact-free fallback). No DB writes; caller persists drafts.
- generatePageSections(tenantId, archetypeKey, ai) server action — requireTenantAccess gated, meters page_generation when ai.
- Editor "Page Layouts (Beta)" group: click = full page w/ free default copy; ✨ AI = on-brand Gemini copy.
- Verified all 4 archetypes → sectionSchema-valid pages (PAGE-V10 PASS).

Phases 1-4 are now end-to-end + visible in the editor: tokens(--abc-*) → normalize → recipes → whole-page archetypes, all auto-on-brand, one-shot re-theme. Live wizard (leanBuildStep) is still UNTOUCHED.

QUESTIONS:
1. Verdict on Phase 4 as shipped?
2. The ONE remaining piece from your D-105 plan is rewiring the live wizard (leanBuildStep) to compose archetypes/recipes instead of hand-authored prebuilts, superseding applyDnaToSections. That touches the real generation pipeline tenants depend on. Is it worth doing now, or do you recommend we HOLD it (keep the editor-driven generation as the safe, opt-in path) until the recipe library is broader (more semantic types: testimonials, contact-form, faq, gallery, pricing)?
3. If you say expand-recipes-first: give the prioritized list of the next 4-6 recipes to author (semantic types + why), each emitting our existing content shape.
Decisive, numbered, minimal.
