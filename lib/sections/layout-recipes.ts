/**
 * Phase-3 generative section composition — the SAFE foundation (architect D-119/120/122).
 *
 * A LayoutRecipe is a high-quality, responsive section TEMPLATE expressed in our EXISTING
 * section content shape (so SectionView renders it with zero new renderer work — GEN-V7), with
 * `{{slot}}` placeholders in the text/url/label fields the AI (or a deterministic default) fills.
 *
 * Design choices that differ from the architect's draft, on purpose:
 *  - Our row shape is {type:"row", columns:number, widths:number[], children: block[][], _style},
 *    NOT columns:[{width,blocks}]. Recipes emit OUR shape.
 *  - `_style` is our ElementStyle (numeric paddingY, token-name `bg`), NOT CSS strings. Section
 *    backgrounds use token names ("surface"/"primary"/"accent") which Phase-1 now resolves to
 *    --abc-* at public render. Fine-grained color uses var(--abc-*) strings in `color` fields.
 *
 * This module is pure + deterministic. The LLM slot-fill (fillSlots) and the wizard
 * generator rewire are the NEXT checkpoint — this foundation is standalone + verifiable.
 */

import { sectionSchema } from "./schemas";

export type SlotContentType = "text" | "image_url" | "link_text" | "link_url";

export interface RecipeSlot {
  key: string;
  contentType: SlotContentType;
  /** Instruction for the LLM filler (Phase-3 next step). */
  brief?: string;
  maxLength?: number;
  /** Deterministic fallback so composeSection works with no LLM (fact-free, on-brand-neutral). */
  default: string;
}

export type SemanticType = "hero" | "features" | "split" | "cta" | "about" | "text_block";

export interface LayoutRecipe {
  key: string;
  name: string;
  semanticType: SemanticType;
  slots: RecipeSlot[];
  /** A section content object in our EXISTING shape, with `{{slot}}` placeholders. */
  template: Record<string, unknown>;
}

/** Deep-clone + replace every `{{slot}}` placeholder in string leaves. JSON-safe by design. */
function fillTemplate(node: any, values: Record<string, string>): any {
  if (typeof node === "string") {
    return node.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_m, k) => (k in values ? values[k] : ""));
  }
  if (Array.isArray(node)) return node.map((n) => fillTemplate(n, values));
  if (node && typeof node === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(node)) out[k] = fillTemplate(v, values);
    return out;
  }
  return node;
}

/** Map a recipe's slots to their default (fact-free) values. */
export function defaultSlotValues(recipe: LayoutRecipe): Record<string, string> {
  const v: Record<string, string> = {};
  for (const s of recipe.slots) v[s.key] = s.default;
  return v;
}

/**
 * Compose a concrete section content object (our shape) from a recipe + filled slot values.
 * Missing keys fall back to the slot default. Pure; output is designed to pass sectionSchema.
 */
export function composeSection(recipe: LayoutRecipe, values?: Record<string, string>): Record<string, unknown> {
  const merged = { ...defaultSlotValues(recipe), ...(values ?? {}) };
  return fillTemplate(recipe.template, merged) as Record<string, unknown>;
}

/** Deterministic recipe selection by semantic purpose (architect pickRecipes, Phase-3). */
export function pickRecipes(semanticType: SemanticType): LayoutRecipe[] {
  return LAYOUT_RECIPES.filter((r) => r.semanticType === semanticType);
}

export function getRecipe(key: string): LayoutRecipe | undefined {
  return LAYOUT_RECIPES.find((r) => r.key === key);
}

// --- helpers to keep recipe literals terse -------------------------------------------------
const FG = "var(--abc-color-foreground)";
const PRIMARY = "var(--abc-color-primary)";

// ---------------------------------------------------------------------------------------------
// Recipe library — Contemporary Luxury defaults. Generous whitespace, restrained type, token bg.
// ---------------------------------------------------------------------------------------------
export const LAYOUT_RECIPES: LayoutRecipe[] = [
  {
    key: "hero-centered-cta",
    name: "Centered hero with CTA",
    semanticType: "hero",
    slots: [
      { key: "eyebrow", contentType: "text", default: "Welcome", maxLength: 40, brief: "Short kicker above the headline" },
      { key: "headline", contentType: "text", default: "A refined experience, built around you", maxLength: 80, brief: "Benefit-led H1, no invented facts" },
      { key: "subhead", contentType: "text", default: "Thoughtfully crafted, quietly powerful — everything you need and nothing you don't.", maxLength: 160, brief: "Supporting sentence" },
      { key: "cta_label", contentType: "link_text", default: "Get started" },
      { key: "cta_href", contentType: "link_url", default: "#contact" },
    ],
    template: {
      type: "row",
      columns: 1,
      _style: { bg: "surface", align: "center", paddingY: 96, paddingX: 24 },
      children: [[
        { type: "subheading", text: "{{eyebrow}}", level: "h4", align: "center", color: PRIMARY, textTransform: "uppercase", letterSpacing: 2 },
        { type: "heading", text: "{{headline}}", level: "h1", align: "center", color: FG, lineHeight: 1.1 },
        { type: "text", text: "{{subhead}}", align: "center", color: FG, fontSize: 18, lineHeight: 1.6 },
        { type: "button", label: "{{cta_label}}", href: "{{cta_href}}", align: "center", variant: "solid", size: "lg", hover: "lift" },
      ]],
    },
  },
  {
    key: "features-trio",
    name: "Three-column feature row",
    semanticType: "features",
    slots: [
      { key: "f1_title", contentType: "text", default: "Considered", maxLength: 40 },
      { key: "f1_body", contentType: "text", default: "Every detail is deliberate, from first impression to final touch.", maxLength: 140 },
      { key: "f2_title", contentType: "text", default: "Dependable", maxLength: 40 },
      { key: "f2_body", contentType: "text", default: "Consistent, reliable delivery you can plan around.", maxLength: 140 },
      { key: "f3_title", contentType: "text", default: "Personal", maxLength: 40 },
      { key: "f3_body", contentType: "text", default: "A relationship, not a transaction — tailored to your goals.", maxLength: 140 },
    ],
    template: {
      type: "row",
      columns: 3,
      widths: [1 / 3, 1 / 3, 1 / 3],
      gap: 32,
      _style: { bg: "transparent", paddingY: 72, paddingX: 24 },
      children: [
        [ { type: "heading", text: "{{f1_title}}", level: "h3", color: FG }, { type: "text", text: "{{f1_body}}", color: FG, lineHeight: 1.6 } ],
        [ { type: "heading", text: "{{f2_title}}", level: "h3", color: FG }, { type: "text", text: "{{f2_body}}", color: FG, lineHeight: 1.6 } ],
        [ { type: "heading", text: "{{f3_title}}", level: "h3", color: FG }, { type: "text", text: "{{f3_body}}", color: FG, lineHeight: 1.6 } ],
      ],
    },
  },
  {
    key: "split-image-text",
    name: "Split — image left, text right",
    semanticType: "split",
    slots: [
      { key: "image_url", contentType: "image_url", default: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200&q=70", brief: "Relevant, on-brand photo" },
      { key: "title", contentType: "text", default: "Built for the way you work", maxLength: 80 },
      { key: "body", contentType: "text", default: "A measured approach that puts clarity first — so the outcome feels effortless.", maxLength: 240 },
      { key: "cta_label", contentType: "link_text", default: "Learn more" },
      { key: "cta_href", contentType: "link_url", default: "#about" },
    ],
    template: {
      type: "row",
      columns: 2,
      widths: [0.5, 0.5],
      gap: 48,
      valign: "center",
      _style: { bg: "surface", paddingY: 72, paddingX: 24 },
      children: [
        [ { type: "image", url: "{{image_url}}", alt: "{{title}}", objectFit: "cover", rounding: 16 } ],
        [
          { type: "heading", text: "{{title}}", level: "h2", color: FG, lineHeight: 1.2 },
          { type: "text", text: "{{body}}", color: FG, fontSize: 17, lineHeight: 1.7 },
          { type: "button", label: "{{cta_label}}", href: "{{cta_href}}", variant: "outline", size: "md", hover: "fill" },
        ],
      ],
    },
  },
  {
    key: "cta-band",
    name: "Full-width CTA band",
    semanticType: "cta",
    slots: [
      { key: "headline", contentType: "text", default: "Ready when you are", maxLength: 80 },
      { key: "cta_label", contentType: "link_text", default: "Book a call" },
      { key: "cta_href", contentType: "link_url", default: "#contact" },
    ],
    template: {
      type: "row",
      columns: 1,
      _style: { bg: "primary", align: "center", paddingY: 80, paddingX: 24 },
      children: [[
        { type: "heading", text: "{{headline}}", level: "h2", align: "center", color: "var(--abc-color-primaryContrast)", lineHeight: 1.2 },
        { type: "button", label: "{{cta_label}}", href: "{{cta_href}}", align: "center", variant: "solid", size: "lg", hover: "grow", bgColor: "var(--abc-color-accent)" },
      ]],
    },
  },
];

/**
 * Dev/Supervisor guard (GEN-V7): assert every recipe composes to renderer-valid content.
 * Not auto-run (keeps import cheap); call from a test/verify script.
 */
export function verifyRecipes(): { key: string; ok: boolean; error?: string }[] {
  return LAYOUT_RECIPES.map((r) => {
    const parsed = sectionSchema.safeParse(composeSection(r));
    return parsed.success ? { key: r.key, ok: true } : { key: r.key, ok: false, error: JSON.stringify(parsed.error.issues[0]) };
  });
}
