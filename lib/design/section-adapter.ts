import { COMPONENT_TYPES, type ComponentType } from "./components";

/**
 * Section -> design-system component adapter (DL-2 live integration). Maps the legacy
 * published section content schema (hero/features/testimonials/cta/contact-form/…) to
 * the design-system component types the token-driven ComponentRenderer understands.
 *
 * It ALSO recognizes NATIVE design-system content produced by the Industry Template
 * Library — sections stored flat as `{ type: <componentType>, ...props, layout? }` —
 * and passes them straight through to the ComponentRenderer. This is what lets a
 * template-generated site render natively, while legacy sections keep mapping as before.
 *
 * Returns null for unmapped types so the caller can fall back to the existing
 * SectionView renderer — this keeps the integration ADDITIVE and lossless: nothing a
 * legacy renderer can show is ever dropped.
 */

export interface AdaptedComponent { type: ComponentType; props: Record<string, any>; }

const COMPONENT_TYPE_SET = new Set<string>(COMPONENT_TYPES);

export function adaptSection(content: any): AdaptedComponent | null {
  if (!content || typeof content !== "object") return null;
  const t = String(content.type ?? "");

  // NATIVE design-system content (Industry Template Library): the content IS already a
  // component — reconstruct props by stripping the discriminator/layout meta keys.
  if (COMPONENT_TYPE_SET.has(t)) {
    const { type: _t, layout: _l, ...props } = content as Record<string, any>;
    return { type: t as ComponentType, props };
  }

  switch (t) {
    case "hero":
      return { type: "hero", props: {
        heading: content.heading ?? content.title,
        subheading: content.subheading ?? content.subtitle,
        primaryCta: content.primaryCta ?? (content.ctaLabel ? { label: content.ctaLabel, href: content.ctaHref ?? "#" } : undefined),
        secondaryCta: content.secondaryCta,
      } };
    case "features":
      return { type: "feature-grid", props: {
        heading: content.heading ?? content.title,
        features: (content.features ?? content.items ?? []).map((f: any) => ({ title: f.title ?? f.heading, description: f.description ?? f.body, icon: f.icon })),
      } };
    case "testimonials": {
      const items = content.testimonials ?? content.items ?? [];
      const first = items[0] ?? {};
      return { type: "testimonial", props: { quote: first.quote ?? first.body ?? content.heading, author: first.author ?? first.name ?? "", role: first.role ?? first.title } };
    }
    case "cta":
      return { type: "cta-banner", props: {
        heading: content.heading ?? content.title,
        subheading: content.subheading,
        cta: content.cta ?? (content.ctaLabel ? { label: content.ctaLabel, href: content.ctaHref ?? "#" } : { label: "Learn more", href: "#" }),
      } };
    case "contact-form":
      return { type: "contact-form", props: {
        heading: content.heading ?? content.title,
        fields: content.fields ?? [],
        submitLabel: content.submitLabel ?? "Send",
      } };
    default:
      return null; // unmapped -> caller falls back to legacy SectionView
  }
}
