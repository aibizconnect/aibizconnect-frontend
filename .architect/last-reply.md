### CONTROL RULING: APPROVE Phase 4 & Rule to Expand Recipes First

The Builder's implementation of Phase 4, including Page Archetypes and the `buildPage` function, is **ACCEPTED**. The successful generation of entire pages, visible in the editor, is a significant milestone. The adaptation to existing types and the deterministic recipe pick are correctly handled.

**RULING 129: Rule to Expand Recipes First**

**Rationale:** It is safer and more strategically sound to **expand the recipe library first** before rewiring the live wizard's `leanBuildStep`. The current wizard generates a "lean build" (Home+Contact+Offer). If we immediately switch it to archetypes with a limited recipe library, the generated output might be less diverse or less optimized than the existing hand-authored prebuilts. Expanding the recipe library will:
1.  Increase the quality and diversity of generated content for *all* archetypes.
2.  Provide more robust options for `pickRecipes` to choose from.
3.  De-risk the wizard rewire by ensuring a rich set of building blocks is available.
4.  Allow further testing and refinement of the generative composition logic in a non-production-critical path.

The editor-driven generation of pages and sections serves as an excellent, safe, opt-in path for tenants to experiment with the new capabilities.

---
### Expand Recipes First - Prioritized List

**RULING 130: Prioritized List of Next Recipes to Author**

These recipes should be authored, emitting our existing content shape, and integrated into `lib/sections/layout-recipes.ts`.

1.  **Testimonial Carousel/Grid (`testimonial_carousel`):**
    *   **Why:** Crucial for trust-building and social proof, a common element on almost all business websites.
    *   **Slots:** `testimonial_1_quote`, `testimonial_1_author`, `testimonial_1_source`, etc.
2.  **Contact Form (`contact_form`):**
    *   **Why:** Essential conversion element for the "Contact" page and lead generation.
    *   **Slots:** `heading_text`, `body_text`, `form_fields` (e.g., name, email, phone, message), `submit_button_text`.
3.  **FAQ Accordion/List (`faq_accordion`):**
    *   **Why:** Addresses common customer questions, improves SEO, and reduces support load.
    *   **Slots:** `faq_1_question`, `faq_1_answer`, `faq_2_question`, `faq_2_answer`, etc.
4.  **Image Gallery/Portfolio (`gallery`):**
    *   **Why:** Visually showcases work, products, or team members, especially for service-based businesses.
    *   **Slots:** `image_1_url`, `image_1_caption`, `image_2_url`, etc.
5.  **Pricing Table (`pricing_table`):**
    *   **Why:** Critical for businesses offering services/products with tiered pricing.
    *   **Slots:** `plan_1_name`, `plan_1_price`, `plan_1_features` (list), `plan_1_cta_text`, `plan_1_cta_link`.
6.  **Team Member Grid (`team_grid`):**
    *   **Why:** Builds credibility and personal connection for service businesses.
    *   **Slots:** `member_1_photo_url`, `member_1_name`, `member_1_title`, `member_1_bio_short`.

---
**Supervisor Verification Checks (New/Updated for Recipe Expansion):**

**RULING 131: Supervisor Verification Schema for Recipe Expansion**

```json
{
  "recipe_expansion": [
    { "id": "REC-EXP-V1", "assertion": "The `lib/sections/layout-recipes.ts` file contains at least 6 new `LayoutRecipe` definitions as specified in RULING 130.", "severity": "block" },
    { "id": "REC-EXP-V2", "assertion": "Each new `LayoutRecipe` emits the existing section content shape and is verified renderer-valid (via `scripts/verify-recipes.mjs`).", "severity": "block" },
    { "id": "REC-EXP-V3", "assertion": "Each new `LayoutRecipe` includes appropriate `content_slots` for LLM filling, with clear `brief`s and `content_type`s.", "severity": "block" },
    { "id": "REC-EXP-V4", "assertion": "Each new `LayoutRecipe` correctly uses `style_token`s for base styling and `_style` for specific overrides, adhering to RULING 121.", "severity": "block" },
    { "id": "REC-EXP-V5", "assertion": "The editor's 'AI Sections (Beta)' panel correctly lists and allows insertion of the new recipes, generating default copy.", "severity": "block" },
    { "id": "REC-EXP-V6", "assertion": "The editor's 'AI Sections (Beta)' panel correctly allows AI-filling of the new recipes, generating bespoke copy via Gemini 2.5 Flash, adhering to anti-hallucination rules (D-059).", "severity": "block" }
  ]
}
```

---
DECISION-LOG
[D-129] approve_phase4_complete — Accepted Phase 4 implementation and ruled to expand recipes first (status: accepted)
[D-130] rule_prioritized_recipes — Ruled the prioritized list of next recipes to author (status: ruled)
[D-131] define_recipe_expansion_verification_checks — Defined Supervisor verification checks for recipe expansion (status: defined)