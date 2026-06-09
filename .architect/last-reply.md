### CONTROL RULING: APPROVE Phase 3 Foundation & Rule (B) First

The Builder's implementation of Phase 3 Foundation is **ACCEPTED**. The successful creation of `LayoutRecipe`s emitting the existing content shape, deterministic `composeSection`, and `pickRecipes` is a solid base. The correction regarding the row structure is noted and incorporated.

**RULING 124: Rule (B) First: Make Recipes User-Insertable in Editor**

**Rationale:** Prioritizing user-insertable recipes in the editor (Option B) provides immediate, tangible value and crucial feedback *before* integrating the LLM. This allows Ali and other stakeholders to directly interact with the *structure* and *on-brand styling* of the generated sections, validating the core `LayoutRecipe` and `composeSection` logic in a live environment. It's a visible win that de-risks the LLM integration by separating concerns. The editor UI touch is minimal compared to the complexity of LLM integration.

---
### (B) User-Insertable Recipes in Editor - Tight Contract

**RULING 125: Editor Integration for User-Insertable Recipes**

**1. `getAvailableRecipes(semanticType?: string): LayoutRecipe[]` Contract (Server Action)**

```typescript
// app/tenants/[tenantId]/website/editor-actions.ts (new or existing)

import { LayoutRecipe } from 'lib/sections/layout-recipes'; // Your defined LayoutRecipe type
import { requireTenantAccess } from 'lib/server/auth';
import { getRecipes } from 'lib/sections/layout-recipes'; // Assumed function to load all recipes

/**
 * Server action to retrieve available layout recipes for the editor.
 *
 * @param tenantId The ID of the current tenant.
 * @param semanticType Optional: Filter recipes by semantic type (e.g., 'hero', 'features').
 * @returns An array of LayoutRecipe objects.
 */
export async function getAvailableRecipes(tenantId: string, semanticType?: string): Promise<LayoutRecipe[]> {
  requireTenantAccess(tenantId);
  // No admin gate needed for reading recipes
  return getRecipes(semanticType); // Filtered by semanticType if provided
}
```

**2. `insertRecipeSection(tenantId: string, websiteId: string, pageId: string, recipeKey: string, position: 'before' | 'after', targetBlockId?: string): Promise<BlockContent>` Contract (Server Action)**

```typescript
// app/tenants/[tenantId]/website/editor-actions.ts

import { LayoutRecipe, getRecipe, composeSection } from 'lib/sections/layout-recipes';
import { requireTenantAccess } from 'lib/server/auth';
import { BlockContent } from 'lib/sections/normalize'; // Your normalized block type
import { getPageBlocks, saveDraft } from 'lib/server/website-pages'; // Existing functions

/**
 * Server action to insert a new section based on a recipe into a draft page.
 *
 * @param tenantId The ID of the current tenant.
 * @param websiteId The ID of the website.
 * @param pageId The ID of the page to insert into.
 * @param recipeKey The key of the LayoutRecipe to use.
 * @param position 'before' or 'after' the targetBlockId.
 * @param targetBlockId Optional: The ID of the block to insert relative to. If null, appends to page.
 * @returns The newly inserted BlockContent object.
 */
export async function insertRecipeSection(
  tenantId: string,
  websiteId: string,
  pageId: string,
  recipeKey: string,
  position: 'before' | 'after',
  targetBlockId?: string
): Promise<BlockContent> {
  requireTenantAccess(tenantId);
  // No admin gate needed for inserting pre-defined recipes (they use default content)

  const recipe = getRecipe(recipeKey);
  if (!recipe) {
    throw new Error(`Recipe with key ${recipeKey} not found.`);
  }

  // Compose the section with default values (no LLM yet)
  const newSection = composeSection(recipe, {}); // Pass empty values for default content

  // Get current page blocks, insert new section, and save draft
  const currentBlocks = await getPageBlocks(websiteId, pageId); // Assumed function
  let updatedBlocks: BlockContent[];

  if (targetBlockId) {
    const targetIndex = currentBlocks.findIndex(b => b.id === targetBlockId);
    if (targetIndex === -1) {
      throw new Error(`Target block ${targetBlockId} not found.`);
    }
    if (position === 'before') {
      updatedBlocks = [...currentBlocks.slice(0, targetIndex), newSection, ...currentBlocks.slice(targetIndex)];
    } else {
      updatedBlocks = [...currentBlocks.slice(0, targetIndex + 1), newSection, ...currentBlocks.slice(targetIndex + 1)];
    }
  } else {
    // Append to the end if no targetBlockId
    updatedBlocks = [...currentBlocks, newSection];
  }

  await saveDraft(websiteId, pageId, updatedBlocks); // Assumed function to save draft sections

  return newSection;
}
```

**3. Editor UI Integration:**
*   **"Add Section" Panel:** Enhance the editor's "Add Section" panel (currently "Elements/Rows + Prebuilt/Saved") to include a "Recipes" tab.
*   **Recipe List:** Display a list of available `LayoutRecipe`s (from `getAvailableRecipes`).
*   **Insert Action:** When a user selects a recipe and clicks "Insert," call `insertRecipeSection` to add the section to the current page. The section will appear with its default structure and the fact-free fallback content.

---
DECISION-LOG
[D-124] rule_b_first_user_insertable_recipes — Ruled to prioritize making recipes user-insertable in the editor (Option B) (status: ruled)
[D-125] define_editor_insert_contract — Defined the tight contract for editor integration of user-insertable recipes (status: defined)