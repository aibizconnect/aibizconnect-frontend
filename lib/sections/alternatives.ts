import { PREBUILT_TEMPLATES, type PrebuiltTemplate, type PrebuiltCategory } from "./prebuilt-templates";
import type { SectionContent } from "./schemas";

/**
 * Section alternatives (Builder North-Star P2, D-382). Given a section, return compatible swap-in
 * LAYOUTS from the prebuilt library — the "replace this section" capability (Relume-style). The AI
 * "regenerate copy" path already exists (rewriteSectionAI); this is the structural swap that pairs
 * with it: pick a new layout, then optionally AI-fill it with your content.
 */

// Map a section's type → the prebuilt categories that make sensible drop-in replacements.
const TYPE_CATEGORIES: Record<string, PrebuiltCategory[]> = {
  hero: ["Hero", "Contemporary Luxury"],
  features: ["About & Services", "Content", "Split / Photo"],
  testimonials: ["Social Proof"],
  pricing: ["Conversion"],
  cta: ["Conversion"],
  gallery: ["Split / Photo", "Content"],
  "contact-form": ["Conversion"],
  faq: ["Content"],
  text: ["Content"],
  heading: ["Content"],
  logos: ["Social Proof"],
};

function categoriesForSection(content: any): PrebuiltCategory[] {
  const t = content?.type;
  if (t === "row") {
    if (content?._kind === "header") return ["Headers"];
    if (content?._kind === "footer") return ["Footers"];
    return ["Content"];
  }
  return TYPE_CATEGORIES[t] ?? ["Content"];
}

export interface SectionAlternative { id: string; name: string; category: string; icon: string; blurb: string; sections: SectionContent[] }

/** Library layouts that can replace this section (matched by the section's intent/category). */
export function sectionAlternatives(content: SectionContent): SectionAlternative[] {
  const cats = new Set<string>(categoriesForSection(content));
  return PREBUILT_TEMPLATES
    .filter((p) => cats.has(p.category))
    .map((p) => ({ id: p.id, name: p.name, category: p.category, icon: p.icon, blurb: p.blurb, sections: p.sections }));
}

export function prebuiltById(id: string): PrebuiltTemplate | null {
  return PREBUILT_TEMPLATES.find((p) => p.id === id) ?? null;
}
