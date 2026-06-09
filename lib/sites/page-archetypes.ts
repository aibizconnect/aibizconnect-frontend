/**
 * Phase-4 page archetypes (architect D-127). An archetype is an ordered list of section slots
 * for one page type; each slot references a Phase-3 recipe (by key) or a semantic type that
 * pickRecipes resolves. buildPage (page-builder.ts) turns an archetype + profile into a full
 * ordered array of our existing section contents.
 *
 * We only reference semantic types we actually have recipes for (hero/features/split/cta), so
 * buildPage always resolves a recipe and emits coherent, renderer-valid pages.
 */

import type { SemanticType } from "@/lib/sections/layout-recipes";

export type PageType = "home" | "about" | "services" | "contact";

export interface ArchetypeSlot {
  id: string;
  semanticType: SemanticType;
  /** Optional explicit recipe; else pickRecipes(semanticType)[0]. */
  recipeKey?: string;
  isOptional?: boolean;
  /** Extra instruction passed to the LLM filler for this slot. */
  brief?: string;
}

export interface PageArchetype {
  key: string;
  name: string;
  pageType: PageType;
  defaultSlug: string;
  isRequired: boolean;
  sections: ArchetypeSlot[];
}

export const PAGE_ARCHETYPES: PageArchetype[] = [
  {
    key: "home-standard",
    name: "Home — standard",
    pageType: "home",
    defaultSlug: "/",
    isRequired: true,
    sections: [
      { id: "hero", semanticType: "hero", recipeKey: "hero-centered-cta" },
      { id: "features", semanticType: "features", recipeKey: "features-trio" },
      { id: "about", semanticType: "split", recipeKey: "split-image-text", brief: "Introduce the business and its approach." },
      { id: "cta", semanticType: "cta", recipeKey: "cta-band" },
    ],
  },
  {
    key: "about-standard",
    name: "About — standard",
    pageType: "about",
    defaultSlug: "/about",
    isRequired: false,
    sections: [
      { id: "hero", semanticType: "hero", recipeKey: "hero-centered-cta", brief: "About-page intro; the story/mission, not a sales pitch." },
      { id: "story", semanticType: "split", recipeKey: "split-image-text", brief: "The origin story and what makes the approach distinct." },
      { id: "cta", semanticType: "cta", recipeKey: "cta-band" },
    ],
  },
  {
    key: "services-standard",
    name: "Services — standard",
    pageType: "services",
    defaultSlug: "/services",
    isRequired: false,
    sections: [
      { id: "hero", semanticType: "hero", recipeKey: "hero-centered-cta", brief: "Lead with the outcome the services deliver." },
      { id: "list", semanticType: "features", recipeKey: "features-trio", brief: "Three core services or capabilities." },
      { id: "proof", semanticType: "split", recipeKey: "split-image-text", isOptional: true },
      { id: "cta", semanticType: "cta", recipeKey: "cta-band" },
    ],
  },
  {
    key: "contact-basic",
    name: "Contact — basic",
    pageType: "contact",
    defaultSlug: "/contact",
    isRequired: false,
    sections: [
      { id: "hero", semanticType: "hero", recipeKey: "hero-centered-cta", brief: "Warm invitation to get in touch; no invented details." },
      { id: "cta", semanticType: "cta", recipeKey: "cta-band" },
    ],
  },
];

export function getArchetype(key: string): PageArchetype | undefined {
  return PAGE_ARCHETYPES.find((a) => a.key === key);
}
