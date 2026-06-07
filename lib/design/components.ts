import { z } from "zod";

/**
 * Component registry (DL-2). The vocabulary of premium, composable building blocks
 * the mesh assembles into pages — richer than flat sections. Each entry declares the
 * props an agent may set and the responsive/layout intent, so the Builder and the
 * Design/Quality critic (O-3) share one contract for what "well-formed" means.
 *
 * This is additive: the existing flat section schemas (lib/sections/schemas.ts) keep
 * working; components are the forward path for design-system-aware output.
 */

export const COMPONENT_TYPES = [
  "hero", "feature-grid", "testimonial", "logo-cloud", "pricing-table",
  "faq", "cta-banner", "contact-form", "stats", "rich-text", "gallery", "footer",
] as const;
export type ComponentType = (typeof COMPONENT_TYPES)[number];

/** Layout intent every component supports — drives responsive rendering. */
export const layoutSchema = z.object({
  width: z.enum(["full", "contained", "narrow"]).default("contained"),
  align: z.enum(["start", "center", "end"]).default("center"),
  columns: z.number().int().min(1).max(4).default(1),
  paddingY: z.enum(["none", "sm", "md", "lg", "xl"]).default("lg"),
  background: z.enum(["transparent", "surface", "primary", "accent"]).default("transparent"),
});
export type Layout = z.infer<typeof layoutSchema>;

export interface ComponentDef {
  type: ComponentType;
  label: string;
  /** Capabilities this component can satisfy (for IA / role planning). */
  intents: string[];
  /** Zod schema for the component's content props. */
  schema: z.ZodTypeAny;
  /** Default layout intent. */
  defaultLayout: Partial<Layout>;
}

const cta = z.object({ label: z.string().min(1), href: z.string().min(1) });

export const COMPONENTS: Record<ComponentType, ComponentDef> = {
  hero: {
    type: "hero", label: "Hero", intents: ["headline", "primary-conversion"],
    schema: z.object({ heading: z.string().min(1), subheading: z.string().optional(), primaryCta: cta.optional(), secondaryCta: cta.optional(), media: z.string().optional() }),
    defaultLayout: { width: "full", paddingY: "xl", background: "surface" },
  },
  "feature-grid": {
    type: "feature-grid", label: "Feature Grid", intents: ["explain", "benefits"],
    schema: z.object({ heading: z.string().optional(), features: z.array(z.object({ title: z.string(), description: z.string(), icon: z.string().optional() })).min(1) }),
    defaultLayout: { columns: 3, paddingY: "lg" },
  },
  testimonial: {
    type: "testimonial", label: "Testimonial", intents: ["trust", "social-proof"],
    schema: z.object({ quote: z.string().min(1), author: z.string(), role: z.string().optional(), avatar: z.string().optional() }),
    defaultLayout: { width: "narrow", paddingY: "lg" },
  },
  "logo-cloud": {
    type: "logo-cloud", label: "Logo Cloud", intents: ["trust", "social-proof"],
    schema: z.object({ heading: z.string().optional(), logos: z.array(z.object({ alt: z.string(), src: z.string() })).min(1) }),
    defaultLayout: { paddingY: "md" },
  },
  "pricing-table": {
    type: "pricing-table", label: "Pricing Table", intents: ["convert", "compare"],
    schema: z.object({ heading: z.string().optional(), tiers: z.array(z.object({ name: z.string(), price: z.string(), features: z.array(z.string()), cta: cta.optional(), highlight: z.boolean().optional() })).min(1) }),
    defaultLayout: { columns: 3, paddingY: "lg" },
  },
  faq: {
    type: "faq", label: "FAQ", intents: ["explain", "objection-handling"],
    schema: z.object({ heading: z.string().optional(), items: z.array(z.object({ q: z.string(), a: z.string() })).min(1) }),
    defaultLayout: { width: "narrow", paddingY: "lg" },
  },
  "cta-banner": {
    type: "cta-banner", label: "CTA Banner", intents: ["convert"],
    schema: z.object({ heading: z.string().min(1), subheading: z.string().optional(), cta }),
    defaultLayout: { width: "full", paddingY: "lg", background: "primary" },
  },
  "contact-form": {
    type: "contact-form", label: "Contact Form", intents: ["capture", "convert"],
    schema: z.object({ heading: z.string().optional(), fields: z.array(z.object({ name: z.string(), label: z.string(), type: z.enum(["text", "email", "tel", "textarea"]) })).min(1), submitLabel: z.string().default("Send") }),
    defaultLayout: { width: "narrow", paddingY: "lg" },
  },
  stats: {
    type: "stats", label: "Stats", intents: ["trust", "impact"],
    schema: z.object({ heading: z.string().optional(), stats: z.array(z.object({ value: z.string(), label: z.string() })).min(1) }),
    defaultLayout: { columns: 4, paddingY: "md" },
  },
  "rich-text": {
    type: "rich-text", label: "Rich Text", intents: ["explain", "seo-content"],
    schema: z.object({ heading: z.string().optional(), body: z.string().min(1) }),
    defaultLayout: { width: "narrow", paddingY: "md" },
  },
  gallery: {
    type: "gallery", label: "Gallery", intents: ["showcase"],
    schema: z.object({ heading: z.string().optional(), images: z.array(z.object({ src: z.string(), alt: z.string() })).min(1) }),
    defaultLayout: { columns: 3, paddingY: "lg" },
  },
  footer: {
    type: "footer", label: "Footer", intents: ["navigation", "trust"],
    schema: z.object({ columns: z.array(z.object({ heading: z.string(), links: z.array(z.object({ label: z.string(), href: z.string() })) })).optional(), legal: z.string().optional() }),
    defaultLayout: { width: "full", paddingY: "md", background: "surface" },
  },
};

export const listComponents = () =>
  Object.values(COMPONENTS).map((c) => ({ type: c.type, label: c.label, intents: c.intents, defaultLayout: c.defaultLayout }));

export function validateComponent(type: ComponentType, props: unknown): { ok: boolean; violations: string[] } {
  const def = COMPONENTS[type];
  if (!def) return { ok: false, violations: [`unknown component type "${type}"`] };
  const r = def.schema.safeParse(props);
  return r.success ? { ok: true, violations: [] } : { ok: false, violations: r.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`) };
}
