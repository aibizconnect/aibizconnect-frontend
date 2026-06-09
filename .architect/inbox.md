ARCHITECT — PHASE 2 SAFE SLICE SHIPPED (commit 979705c, build green, pushed). Then proceed to Phase 3.

WHAT WE SHIPPED (additive only, no content restructure — your full per-type rewrite deferred as too risky for one pass against the live render path):
- lib/sections/normalize.ts:
  - normalizeBlock(raw): pure idempotent read-normalizer. Guarantees stable id on every block + nested row column/block; attaches canonical _meta view {name,kind,isGlobal,isEditable,styleToken} derived from existing underscore keys, WITHOUT restructuring content. No DB write.
  - resolveStyleToken(token): maps the Phase-1 vocabulary (color-*, font-*, font-size-*, space-*, radius-*, shadow-*) → --abc-* CSS vars.
- getPageBlocks now passes content through normalizeBlock. Verified safe: sectionSchema.safeParse STRIPS the added top-level id, underscore _meta is re-attached but unread → existing pages render identically.

CONTEXT for Phase 3: our section content model is {type, ...props, _style (ElementStyle), _anim, _kind, _name}. Rows = {type:"row", columns:[{width, blocks:[...]}]}. Existing block types incl. heading/text/button/image/number-counter/row + composite section types rendered by SectionView (registry.tsx). We have prebuilt hand-authored templates in lib/sections/prebuilt-templates.ts (Contemporary Luxury, Headers/Hero/Split/About/CTA/Footers) with applyTemplateImages. design-dna.ts has aesthetics (themeForAesthetic, applyDnaToSections). Image gen prefers free Gemini 2.5 Flash. Wizard analyzes existing site/socials → lean build (Home+Contact+Offer).

GIVE ME THE TIGHT, BUILD-READY PHASE-3 SPEC ONLY (generative section composition). Decisive, numbered, with exact JSON shapes. Must EMIT our existing content shape (so SectionView renders it with zero new renderer work) and reuse Phase-1 tokens + Phase-2 normalize:
1. The layout-recipe contract: a JSON shape for a reusable, responsive section recipe with named content slots, default _style/_anim, and token references. Give 3-4 concrete example recipes (hero, feature-trio, split, CTA band) in that shape.
2. The composition pipeline: recipe + business profile + aesthetic → concrete section content (our shape). Function contracts: pickRecipes(archetype,profile), fillSlots(recipe,profile) [LLM, anti-hallucination rules], applyAestheticTokens(section,aesthetic). State exactly what is deterministic vs LLM.
3. How recipes reference tokens (style_token) so output is auto-on-brand, and where literal _style still applies.
4. Where this plugs into the current generator (replace hand-authored prebuilt usage? augment?). Least-disruptive wiring.
5. The Supervisor GEN-V* checks to gate generated section quality + no-hallucination.
Phase 3 only. Must reuse existing renderer (emit current content shape).
