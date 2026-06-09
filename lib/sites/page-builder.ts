/**
 * Phase-4 page builder (architect D-127). Turn a PageArchetype + business profile into a full,
 * ordered array of our existing section contents — composing Phase-3 recipes. Deterministic in
 * recipe selection; LLM only fills slot copy (when ai:true), with the same anti-hallucination +
 * fact-free fallback as fillSlots.
 *
 * Pure of DB writes: returns section content the caller persists (drafts-only, scoped by the
 * caller via (tenant_id, website_id)). Sections already reference --abc-* tokens (Phase 1), so
 * the whole page is auto-on-brand and re-themes in one shot. Never throws.
 */

import { getRecipe, pickRecipes, composeSection } from "@/lib/sections/layout-recipes";
import { generateSection, type FillProfile } from "@/lib/sections/fill-slots";
import type { PageArchetype, ArchetypeSlot } from "./page-archetypes";

export interface BuildPageOptions {
  /** When true, fill copy via Gemini 2.5 Flash; otherwise use recipe fact-free defaults. */
  ai?: boolean;
  signal?: AbortSignal;
}

/** Resolve the recipe for a slot: explicit key wins, else first recipe of the semantic type. */
function recipeForSlot(slot: ArchetypeSlot) {
  return (slot.recipeKey ? getRecipe(slot.recipeKey) : undefined) ?? pickRecipes(slot.semanticType)[0];
}

/**
 * Build an ordered array of section contents (our shape) for a page archetype.
 * Returns one entry per non-skipped slot. Optional slots with no recipe are skipped.
 */
export async function buildPage(
  archetype: PageArchetype,
  profile: FillProfile,
  opts?: BuildPageOptions,
): Promise<Record<string, unknown>[]> {
  const out: Record<string, unknown>[] = [];
  for (const slot of archetype.sections) {
    const recipe = recipeForSlot(slot);
    if (!recipe) {
      if (slot.isOptional) continue;
      continue; // no recipe for a required slot → skip rather than emit broken content
    }
    if (opts?.ai) {
      // Thread the slot brief into the profile so the LLM has page-slot context.
      const slotProfile: FillProfile = slot.brief ? { ...profile, facts: [profile.facts, slot.brief].filter(Boolean).join("\n") } : profile;
      const { content } = await generateSection(recipe, slotProfile, { signal: opts.signal });
      out.push(content);
    } else {
      out.push(composeSection(recipe));
    }
  }
  return out;
}
