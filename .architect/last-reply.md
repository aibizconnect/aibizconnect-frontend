Here is the tight, build-ready Phase 3 spec for Generative Section Composition, designed to emit our existing content shape and reuse existing infrastructure.

---
**RULING 118: Acceptance of Phase 2 Safe Slice & Proceed to Phase 3**

The Builder's implementation of Phase 2 (normalizeBlock, canonical _meta view, resolveStyleToken) is **ACCEPTED**. The additive, read-normalizing approach successfully enhances the block model without disrupting the live render path.

---
### 1. Layout-Recipe Contract

**RULING 119: Layout-Recipe Contract for Generative Composition**

Layout recipes will be stored as data, defining the structure and default styling for reusable, responsive sections. They will emit our *existing* section content shape.

**Layout Recipe Contract (JSON Shape for `lib/sections/layout-recipes.ts`):**

```json
// Represents a single recipe for a section
export type LayoutRecipe = {
  key: string; // Unique identifier for the recipe (e.g., "hero-centered-cta", "features-3-column")
  name: string; // Human-readable name
  description: string; // For internal documentation
  semantic_type: "hero" | "features" | "about_us" | "cta" | "contact_form" | "faq" | "blog_grid" | "lead_capture" | "text_block" | "image_block"; // Semantic purpose
  min_slots: number; // Minimum number of content slots that must be filled
  max_slots: number; // Maximum number of content slots
  default_style_token?: string; // Optional: Default token for the overall section (e.g., "section-background-surface")
  default_element_style?: ElementStyle; // Optional: Default ElementStyle for the section container
  default_animation_style?: AnimationStyle; // Optional: Default animation for the section container

  // Defines the structure of the section, emitting existing block shape
  template_blocks: Array<{
    type: string; // Existing block type (e.g., "row", "heading", "text", "image", "button")
    _name?: string; // Default name for the block
    _style?: ElementStyle; // Default ElementStyle for this specific block
    _anim?: AnimationStyle; // Default animation for this specific block
    _kind?: string; // e.g., "header", "footer" (for global blocks)
    style_token?: string; // Token for this specific block (e.g., "text-heading-h1", "color-primary")

    // Content slots for AI filling
    content_slots?: Array<{
      slot_key: string; // Unique key within this block (e.g., "heading_text", "body_paragraph_1", "cta_button_text", "image_url")
      content_type: "text" | "image_url" | "link_url" | "link_text" | "list_item" | "html"; // Expected content type
      brief?: string; // Specific instruction for AI filling this slot
      max_length?: number; // Max length for text content
      default_value?: string; // Fallback if AI fails or slot is optional
      is_optional?: boolean; // If true, AI can leave empty
    }>;

    // For "row" type, define columns and nested blocks recursively
    columns?: Array<{
      width?: number; // 1-12 grid units
      _style?: ElementStyle; // Default ElementStyle for the column
      blocks?: Array<any>; // Nested blocks (recursive application of this template_blocks structure)
    }>;
    // ... other type-specific properties for existing blocks
  }>;
};
```

**Concrete Example Recipes (emitting existing shape):**

```json
// 1. Hero: Centered Heading, Subheading, CTA
{
  "key": "hero-centered-cta",
  "name": "Centered Hero with Call to Action",
  "semantic_type": "hero",
  "min_slots": 3, "max_slots": 4,
  "default_element_style": { "minHeight": "400px", "background": "var(--abc-color-background)" },
  "template_blocks": [
    {
      "type": "row",
      "_name": "Hero Content Row",
      "_style": { "justifyContent": "center", "alignItems": "center", "padding": "var(--abc-space-3xl)" },
      "columns": [
        {
          "width": 12,
          "blocks": [
            { "type": "heading", "_name": "Hero Heading", "style_token": "text-heading-h1", "_style": { "textAlign": "center" },
              "content_slots": [{ "slot_key": "heading_text", "content_type": "text", "brief": "Compelling main headline" }] },
            { "type": "text", "_name": "Hero Subheading", "style_token": "text-body-lg", "_style": { "textAlign": "center", "marginTop": "var(--abc-space-md)" },
              "content_slots": [{ "slot_key": "subheading_text", "content_type": "text", "brief": "Brief supporting text" }] },
            { "type": "button", "_name": "Hero CTA", "style_token": "button-primary", "_style": { "marginTop": "var(--abc-space-lg)" },
              "content_slots": [{ "slot_key": "cta_text", "content_type": "link_text", "brief": "Call to action text" }, { "slot_key": "cta_link", "content_type": "link_url", "brief": "Link for CTA" }] }
          ]
        }
      ]
    }
  ]
}

// 2. Features: Three-Column Grid
{
  "key": "features-3-column",
  "name": "Three Column Feature Grid",
  "semantic_type": "features",
  "min_slots": 3, "max_slots": 3,
  "default_element_style": { "padding": "var(--abc-space-3xl)", "background": "var(--abc-color-surface)" },
  "template_blocks": [
    {
      "type": "row",
      "_name": "Feature Grid Row",
      "_style": { "gap": "var(--abc-space-lg)" },
      "columns": [
        { "width": 4, "blocks": [
            { "type": "heading", "_name": "Feature 1 Title", "style_token": "text-heading-h3", "content_slots": [{ "slot_key": "feature_1_title", "content_type": "text" }] },
            { "type": "text", "_name": "Feature 1 Desc", "style_token": "text-body-md", "content_slots": [{ "slot_key": "feature_1_desc", "content_type": "text" }] }
          ]},
        { "width": 4, "blocks": [
            { "type": "heading", "_name": "Feature 2 Title", "style_token": "text-heading-h3", "content_slots": [{ "slot_key": "feature_2_title", "content_type": "text" }] },
            { "type": "text", "_name": "Feature 2 Desc", "style_token": "text-body-md", "content_slots": [{ "slot_key": "feature_2_desc", "content_type": "text" }] }
          ]},
        { "width": 4, "blocks": [
            { "type": "heading", "_name": "Feature 3 Title", "style_token": "text-heading-h3", "content_slots": [{ "slot_key": "feature_3_title", "content_type": "text" }] },
            { "type": "text", "_name": "Feature 3 Desc", "style_token": "text-body-md", "content_slots": [{ "slot_key": "feature_3_desc", "content_type": "text" }] }
          ]}
      ]
    }
  ]
}

// 3. Split: Image Left, Text Right
{
  "key": "split-image-left-text-right",
  "name": "Image Left, Text Right Split Section",
  "semantic_type": "about_us",
  "min_slots": 3, "max_slots": 4,
  "default_element_style": { "padding": "var(--abc-space-3xl)", "background": "var(--abc-color-background)" },
  "template_blocks": [
    {
      "type": "row",
      "_name": "Split Content Row",
      "_style": { "gap": "var(--abc-space-lg)", "alignItems": "center" },
      "columns": [
        { "width": 6, "blocks": [
            { "type": "image", "_name": "Split Image", "_style": { "borderRadius": "var(--abc-radius-md)" },
              "content_slots": [{ "slot_key": "image_url", "content_type": "image_url", "brief": "Relevant image for the section" }] }
          ]},
        { "width": 6, "blocks": [
            { "type": "heading", "_name": "Split Heading", "style_token": "text-heading-h2", "content_slots": [{ "slot_key": "heading_text", "content_type": "text" }] },
            { "type": "text", "_name": "Split Body", "style_token": "text-body-md", "_style": { "marginTop": "var(--abc-space-md)" },
              "content_slots": [{ "slot_key": "body_text", "content_type": "text", "brief": "Detailed description" }] },
            { "type": "button", "_name": "Split CTA", "style_token": "button-primary", "_style": { "marginTop": "var(--abc-space-lg)" }, "is_optional": true,
              "content_slots": [{ "slot_key": "cta_text", "content_type": "link_text" }, { "slot_key": "cta_link", "content_type": "link_url" }] }
          ]}
      ]
    }
  ]
}

// 4. CTA: Full-Width Band
{
  "key": "cta-full-width-band",
  "name": "Full Width Call to Action Band",
  "semantic_type": "cta",
  "min_slots": 2, "max_slots": 3,
  "default_element_style": { "padding": "var(--abc-space-2xl)", "background": "var(--abc-color-primary)", "color": "var(--abc-color-background)" },
  "template_blocks": [
    {
      "type": "row",
      "_name": "CTA Row",
      "_style": { "justifyContent": "center", "alignItems": "center", "gap": "var(--abc-space-lg)" },
      "columns": [
        { "width": 8, "blocks": [
            { "type": "heading", "_name": "CTA Heading", "style_token": "text-heading-h2", "_style": { "textAlign": "center", "color": "var(--abc-color-background)" },
              "content_slots": [{ "slot_key": "heading_text", "content_type": "text", "brief": "Action-oriented headline" }] }
          ]},
        { "width": 4, "blocks": [
            { "type": "button", "_name": "CTA Button", "style_token": "button-primary", "_style": { "background": "var(--abc-color-accent)", "color": "var(--abc-color-foreground)" },
              "content_slots": [{ "slot_key": "button_text", "content_type": "link_text" }, { "slot_key": "button_link", "content_type": "link_url" }] }
          ]}
      ]
    }
  ]
}
```

---
### 2. Composition Pipeline

**RULING 120: Generative Composition Pipeline**

The composition pipeline will integrate `layout_recipes` with AI content filling and aesthetic application.

**Function Contracts:**

1.  **`pickRecipes(archetype: PageArchetype, profile: BusinessProfile): LayoutRecipe[]` (Deterministic)**
    *   **Input:** Page archetype (e.g., `home`, `services`), `website_analysis_results` (business profile, growth intent).
    *   **Logic:** Deterministically selects an ordered list of `LayoutRecipe` keys based on the `archetype`, `semantic_type` requirements, and potentially `profile` (e.g., if `profile.industry` is 'real_estate', prioritize a 'property_listings' recipe).
    *   **Output:** An ordered array of `LayoutRecipe` objects.

2.  **`fillSlots(recipe: LayoutRecipe, profile: BusinessProfile, pageContext: PageContext): Promise<SectionContent>` (LLM-Driven, Anti-Hallucination)**
    *   **Input:** `LayoutRecipe`, `website_analysis_results` (business profile, tone, services), `pageContext` (e.g., current page's `page_intent`, `main_pages_detected`, `extracted_content` if repurposing).
    *   **Logic:**
        *   Iterates through `recipe.template_blocks` and their `content_slots`.
        *   For each slot, constructs a prompt for Gemini (2.5 Flash) using `slot.brief`, `slot.content_type`, `slot.max_length`, `profile` data, and `pageContext`.
        *   **Anti-Hallucination (D-059):**
            *   If `pageContext.extracted_content` exists (for rebuilt pages), LLM is *strictly constrained* to repurpose/rephrase from it.
            *   If no `extracted_content` (for new funnel/SEO pages), LLM generates *generic, fact-free* content (value props, benefits, CTAs) consistent with `profile.tone` and `profile.growth_intent`. *Never* invents names, awards, testimonials, pricing.
            *   For `image_url` slots, uses `website_analysis_results.images` or AI image generation (if enabled and within budget).
        *   Fills the content into the `template_blocks` structure.
        *   Records `recordAiUsage` (kind `section_generation`).
    *   **Output:** A complete section content object, conforming to our *existing* section shape (e.g., `{type: 'hero', heading: '...', _style: {...}}`).

3.  **`applyAestheticTokens(section: SectionContent, brandTokens: BrandTokens): SectionContent` (Deterministic)**
    *   **Input:** A filled `SectionContent` object, `BrandTokens` (from `resolveBrandTokens`).
    *   **Logic:**
        *   Iterates through the `section` and its nested blocks/elements.
        *   For any block/element with a `style_token` (RULING 119), it resolves the token to CSS variables (RULING 110 revised).
        *   Applies any `default_element_style` or `default_animation_style` from the `LayoutRecipe` if not already overridden.
        *   **Coexistence (RULING 115):** Ensures `style_token` provides base styles, which are then overridden by `_style` (ElementStyle) literals if present.
    *   **Output:** The `SectionContent` object with all tokens resolved and styles applied, ready for rendering.

---
### 3. Token Referencing and Literal `_style` Coexistence

**RULING 121: Token Referencing and Literal `_style` Coexistence**

*   **Token Referencing:** `LayoutRecipe`s (RULING 119) and generated blocks will primarily use `style_token` (e.g., `text-heading-h1`, `color-primary`) to reference design tokens. This ensures auto-on-brand output.
*   **Literal `_style` Application:** Literal `_style` (ElementStyle) will still apply for:
    *   **Specific Overrides:** When a recipe or AI needs to apply a precise, non-tokenized value (e.g., a specific `margin-left` for alignment, a unique `background-image` URL, or a custom `border-radius` not covered by tokens).
    *   **Computed Styles:** Styles captured during high-fidelity import (D-091) will populate `_style` directly.
*   **Resolution Order (RULING 115):** `style_token` provides the base, `_style` provides specific overrides. The renderer will apply `_style` properties as inline styles, taking precedence over CSS variables derived from `style_token` for overlapping properties.

---
### 4. Generator Wiring

**RULING 122: Generator Wiring (Least Disruptive)**

The new generative composition will augment and eventually replace existing section generation.

*   **Augment `leanBuildStep` (Step 3):**
    *   Modify `leanBuildStep` to use `pickRecipes` (RULING 120) to select `LayoutRecipe`s for each section slot defined in the `page_recipe` (D-103).
    *   For each selected `LayoutRecipe`, call `fillSlots` (RULING 120) to generate content.
    *   Then call `applyAestheticTokens` (RULING 120) to apply branding.
    *   The output will be the existing section content shape, which `createPage` and `saveDraft` already expect.
*   **Replace Hand-Authored Templates:** The `lib/sections/prebuilt-templates.ts` will become the source for `LayoutRecipe` definitions, rather than directly generating sections. `applyTemplateImages` will be integrated into `fillSlots` for image handling.
*   **Replace `applyDnaToSections`:** The `applyAestheticTokens` function will supersede `applyDnaToSections`, as it handles token application more comprehensively.
*   **Gemini 2.5 Flash:** Explicitly configure `fillSlots` to use Gemini 2.5 Flash for content generation.

---
### 5. Supervisor Checks

**RULING 123: Supervisor Verification Schema for Phase 3**

```json
{
  "phase3_generative_composition": [
    { "id": "GEN-V1", "assertion": "A library of `LayoutRecipe`s (RULING 119) exists, defining structured layout grammars for various semantic section types, emitting the existing section content shape.", "severity": "block" },
    { "id": "GEN-V2", "assertion": "The `pickRecipes` function (RULING 120) deterministically selects an ordered list of `LayoutRecipe`s based on page archetype and business profile.", "severity": "block" },
    { "id": "GEN-V3", "assertion": "The `fillSlots` function (RULING 120) correctly fills content slots within `LayoutRecipe`s using LLM-generated content.", "severity": "block" },
    { "id": "GEN-V4", "assertion": "CRITICAL: `fillSlots` strictly adheres to anti-hallucination rules (D-059): repurposes extracted facts or generates generic, fact-free content; never invents specifics (names, awards, testimonials, pricing).", "severity": "block" },
    { "id": "GEN-V5", "assertion": "The `applyAestheticTokens` function (RULING 120) correctly applies `BrandTokens` to generated sections, resolving `style_token`s and applying defaults.", "severity": "block" },
    { "id": "GEN-V6", "assertion": "The `leanBuildStep` (Step 3) is updated to use `pickRecipes`, `fillSlots`, and `applyAestheticTokens` for section generation.", "severity": "block" },
    { "id": "GEN-V7", "assertion": "Generated sections (after `applyAestheticTokens`) conform to the existing section content shape and are correctly rendered by `SectionView`.", "severity": "block" },
    { "id": "GEN-V8", "assertion": "Generated sections are visually high-quality, responsive, and on-brand, reflecting the chosen `LayoutRecipe` and `BrandTokens`.", "severity": "block" },
    { "id": "GEN-V9", "assertion": "All LLM calls within `fillSlots` are metered via `recordAiUsage` (kind `section_generation`).", "severity": "block" },
    { "id": "GEN-V10", "assertion": "Existing `lib/sections/prebuilt-templates.ts` are refactored into `LayoutRecipe` definitions.", "severity": "block" },
    { "id": "GEN-V11", "assertion": "The `applyAestheticTokens` function correctly supersedes `applyDnaToSections`.", "severity": "block" }
  ]
}
```

---
DECISION-LOG
[D-118] accept_phase2_safe_slice — Accepted Phase 2 safe slice implementation and proceed to Phase 3 (status: accepted)
[D-119] rule_layout_recipe_contract — Ruled the JSON shape for the Layout Recipe contract (status: ruled)
[D-120] rule_generative_composition_pipeline — Ruled the generative composition pipeline with function contracts (status: ruled)
[D-121] rule_token_literal_style_coexistence — Ruled token referencing and literal `_style` coexistence (status: ruled)
[D-122] rule_generator_wiring — Ruled the least disruptive wiring for the new generator (status: ruled)
[D-123] define_phase3_verification_checks — Defined Supervisor verification checks for Phase 3 (Generative Section Composition) (status: defined)