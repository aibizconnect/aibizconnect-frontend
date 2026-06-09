### CONTROL RULING: APPROVE Phase 3 & Rule Phase 4 First

The Builder's implementation of Phase 3, including the user-insertable recipes with default and AI-filled content, is **ACCEPTED**. The anti-hallucination measures and metering are correctly in place. This is a significant step forward.

**RULING 126: Rule Phase 4 First: Page Archetypes**

**Rationale:** While rewiring the live wizard with `composeSection` is a valid next step, implementing **Phase 4 (Page Archetypes)** first provides a more strategic and impactful advancement. It moves beyond individual section generation to defining *how entire pages are structured and generated coherently*. This sets the stage for the "superior architecture" (D-057) that was a core goal. Once page archetypes are in place, rewiring the wizard to use these archetypes becomes a more robust and complete solution than simply replacing individual section calls. This also aligns with the original phased plan (D-105).

---
### Phase 4: Page Archetypes - Tight Contract

**RULING 127: Page Archetype Contract and `buildPage` Function**

Page archetypes will define the structure of entire pages as ordered sequences of semantic section slots.

**1. Page Archetype Contract (JSON Shape for `lib/sites/page-archetypes.ts`):**

```json
// Represents a blueprint for a specific page type
export type PageArchetype = {
  key: string; // Unique identifier (e.g., "home-standard", "services-overview", "contact-basic")
  name: string; // Human-readable name
  description: string; // For internal documentation
  page_type: "home" | "about" | "services" | "contact" | "offer" | "listing" | "lead_magnet" | "thank_you" | "blog_index" | "faq_page" | "ad_landing" | "custom"; // Corresponds to website_page_tree.page_type
  default_slug: string; // Default slug for this page type (e.g., "/", "/about", "/contact")
  is_required: boolean; // True if this page type is essential for a basic website
  sections: Array<{
    id: string; // Unique ID for this section slot within the archetype (e.g., "hero_slot", "features_slot")
    semantic_type: "hero" | "features" | "about_us" | "services_list" | "testimonial_carousel" | "cta_block" | "contact_form" | "faq_accordion" | "blog_grid" | "lead_capture" | "text_block" | "image_block"; // Semantic purpose of the section
    layout_recipe_key?: string; // Optional: Specific LayoutRecipe key to use (e.g., "hero-centered-cta"). If omitted, `pickRecipes` will choose.
    is_optional?: boolean; // If true, this section can be omitted during generation based on profile/context
    is_global_block?: boolean; // True if this slot is for a global Header/Footer
    default_content_brief?: string; // Brief for AI if no source content or specific recipe
    min_blocks?: number; // Minimum number of blocks expected in this section
    max_blocks?: number; // Maximum number of blocks expected
  }>;
};
```

**2. `buildPage(archetype: PageArchetype, profile: BusinessProfile, pageContext: PageContext): Promise<BlockContent[]>` Contract (Server-Side)**

```typescript
// lib/sites/page-builder.ts (new server-only module)

import { PageArchetype } from './page-archetypes'; // New PageArchetype type
import { BusinessProfile } from '../website-analysis'; // website_analysis_results.analysis_data
import { BlockContent } from '../sections/normalize'; // Your normalized block type
import { LayoutRecipe, pickRecipes, fillSlots, applyAestheticTokens } from '../sections/layout-recipes'; // Phase 3 components
import { resolveWebsiteBrandTokens } from '../design/tokens'; // Phase 1 component

export type PageContext = {
  websiteId: string;
  tenantId: string;
  // Add other context needed for generation, e.g., extracted_content for repurposing
  extracted_content?: any; // For rebuilding pages from existing site
  main_pages_detected?: Array<{ title: string; url: string }>;
};

/**
 * Builds a complete page (array of section blocks) based on an archetype and business profile.
 * This function is deterministic in its recipe selection and token application,
 * but uses LLM for content filling.
 *
 * @param archetype The PageArchetype blueprint for the page.
 * @param profile The tenant's business profile (from website_analysis_results.analysis_data).
 * @param pageContext Context for the current page being built.
 * @returns An ordered array of BlockContent objects representing the page's sections.
 */
export async function buildPage(
  archetype: PageArchetype,
  profile: BusinessProfile,
  pageContext: PageContext
): Promise<BlockContent[]> {
  const pageSections: BlockContent[] = [];
  const brandTokens = await resolveWebsiteBrandTokens(pageContext.websiteId); // Resolve tokens once per page build

  for (const sectionSlot of archetype.sections) {
    if (sectionSlot.is_global_block) {
      // Global blocks (Header/Footer) are handled separately by the renderer,
      // but we might include a placeholder or specific ID for reference.
      // For now, we'll omit them from the generated pageSections array,
      // as the renderer pins them.
      continue;
    }

    // 1. Pick Layout Recipe (Deterministic)
    let recipe: LayoutRecipe | undefined;
    if (sectionSlot.layout_recipe_key) {
      recipe = getRecipe(sectionSlot.layout_recipe_key);
    } else {
      // If no specific recipe key, pick one based on semantic type and profile
      const pickedRecipes = pickRecipes(sectionSlot.semantic_type, profile); // Assuming pickRecipes can take semanticType
      recipe = pickedRecipes[0]; // Take the first suitable recipe
    }

    if (!recipe && !sectionSlot.is_optional) {
      console.warn(`No suitable recipe found for required section slot: ${sectionSlot.semantic_type}`);
      // Fallback: create a basic text block or skip if optional
      continue;
    }
    if (!recipe && sectionSlot.is_optional) {
      continue; // Skip optional section if no recipe found
    }
    if (!recipe) continue; // Should not happen with above checks

    // 2. Fill Slots (LLM-Driven, Anti-Hallucination)
    const filledSection = await fillSlots(recipe, profile, {
      ...pageContext,
      semanticType: sectionSlot.semantic_type, // Pass semantic type to fillSlots for context
      brief: sectionSlot.default_content_brief,
      // Pass extracted_content for the specific page if available
      extracted_content: pageContext.extracted_content, // Assuming pageContext contains this
    });

    // 3. Apply Aesthetic Tokens (Deterministic)
    const finalSection = applyAestheticTokens(filledSection, brandTokens);

    pageSections.push(finalSection);
  }

  return pageSections;
}
```

---
**Supervisor Verification Checks (New/Updated for Phase 4):**

**RULING 128: Supervisor Verification Schema for Phase 4**

```json
{
  "phase4_page_archetypes": [
    { "id": "PAGE-V1", "assertion": "Page archetypes are defined as JSON recipes in `lib/sites/page-archetypes.ts` (RULING 127).", "severity": "block" },
    { "id": "PAGE-V2", "assertion": "Each page recipe defines `key`, `name`, `description`, `page_type`, `default_slug`, `is_required`, and an ordered `sections` array.", "severity": "block" },
    { "id": "PAGE-V3", "assertion": "Each `section` slot in a page recipe defines `id`, `semantic_type`, `layout_recipe_key` (optional), `is_optional`, `is_global_block`, `default_content_brief`, `min_blocks`, `max_blocks`.", "severity": "block" },
    { "id": "PAGE-V4", "assertion": "The `buildPage(archetype, profile, pageContext)` function exists in `lib/sites/page-builder.ts` and returns an ordered array of `BlockContent`.", "severity": "block" },
    { "id": "PAGE-V5", "assertion": "The `buildPage` function correctly iterates through the archetype's `sections` slots.", "severity": "block" },
    { "id": "PAGE-V6", "assertion": "For each section slot, `buildPage` either uses the specified `layout_recipe_key` or deterministically selects a `LayoutRecipe` via `pickRecipes` (RULING 120).", "severity": "block" },
    { "id": "PAGE-V7", "assertion": "For each section, `buildPage` calls `fillSlots` (RULING 120) with appropriate context and `default_content_brief`.", "severity": "block" },
    { "id": "PAGE-V8", "assertion": "For each section, `buildPage` calls `applyAestheticTokens` (RULING 120) to apply branding using `resolveWebsiteBrandTokens`.", "severity": "block" },
    { "id": "PAGE-V9", "assertion": "The `buildPage` function correctly omits global Header/Footer blocks from its returned `BlockContent[]` array, as they are pinned by the renderer.", "severity": "block" },
    { "id": "PAGE-V10", "assertion": "Generated pages (arrays of `BlockContent`) conform to the existing section content shape and are ready for `createPage` and `saveDraft`.", "severity": "block" },
    { "id": "PAGE-V11", "assertion": "The `buildPage` function is strictly tenant-scoped via `pageContext.tenantId` and `pageContext.websiteId`.", "severity": "block" }
  ]
}
```

---
DECISION-LOG
[D-126] approve_phase3_complete — Accepted Phase 3 implementation and ruled to proceed with Phase 4 (Page Archetypes) (status: accepted)
[D-127] rule_page_archetype_contract_build_page — Ruled the Page Archetype JSON contract and the `buildPage` function contract (status: ruled)
[D-128] define_phase4_verification_checks — Defined Supervisor verification checks for Phase 4 (Page Archetypes) (status: defined)