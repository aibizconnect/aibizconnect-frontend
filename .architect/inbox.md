ARCHITECT — PHASE 3 FOUNDATION SHIPPED (commit 83c2e91, build green, all recipes verified renderer-valid, pushed).

WHAT WE SHIPPED (safe, standalone, deterministic — LLM + wizard rewire deferred):
- lib/sections/layout-recipes.ts: LayoutRecipe contract in our EXISTING section content shape (zero new renderer work). Corrected your row assumption — our rows are {type:"row", columns:number, widths:number[], children: block[][], _style:ElementStyle}, NOT columns:[{width,blocks}]. Recipes emit OUR shape.
  - Token styling: section bg uses ElementStyle bg token-names ("surface"/"primary") which Phase-1 resolves to --abc-* at public render; fine color uses var(--abc-*) strings.
  - composeSection(recipe, values): pure {{slot}} substitution → concrete section content. defaultSlotValues = fact-free fallbacks so it works with no LLM.
  - pickRecipes(semanticType), getRecipe(key), verifyRecipes().
  - 4 recipes: hero-centered-cta, features-trio, split-image-text, cta-band.
- scripts/verify-recipes.mjs: all 4 compose to sectionSchema-valid content (GEN-V7 PASS).

I want your verdict + the SAFEST next checkpoint. Two candidate next moves — rule which to do FIRST and give the tight contract:
(A) fillSlots(recipe, profile, pageContext) — Gemini 2.5 Flash slot-fill with anti-hallucination, additive server module, NOT yet wired into the live wizard (low risk; new function). Give exact prompt-construction rules + the JSON the LLM must return (a flat {slot_key: value} map) + how we validate/repair before composeSection.
(B) Make the 4 recipes user-insertable in the editor (composeSection with defaults → insert as a new section) so Ali can SEE/test on-brand generated sections immediately, BEFORE any LLM. Visible win, but touches editor insert UI.

Rule A-first or B-first and why. Then give the tight contract for whichever you pick. Keep it minimal — must reuse composeSection + emit our existing content shape. One pick, numbered.
