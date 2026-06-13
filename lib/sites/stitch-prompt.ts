/**
 * Structured Stitch prompt builder (D-287..291) — the "find a way" deliverable.
 *
 * Ali's existential ask: get gorgeous designs that drop into our Section → Row → Column
 * → Element structure LOSSLESSLY, without touching the editor or importer. The lever is
 * the INPUT: this builder makes Stitch (or any design AI) produce output that maps 1:1
 * onto our element vocabulary — clean full-width bands of equal columns built from named
 * components our recognizers already understand. Same beautiful look; lands in our tree
 * whole. Full rules: docs/DESIGN-IMPORT-CONTRACT.md.
 *
 * Pure + dependency-free so it can feed the Stitch pipeline, the wizard, or a manual run.
 */

export type DesignPageType = "home" | "about" | "services" | "product" | "pricing" | "contact" | "landing";

export interface StitchPromptInput {
  businessName: string;
  industry: string;
  pageType?: DesignPageType;
  tone?: string;
  audience?: string;
  brandColor?: string;   // primary
  accentColor?: string;
  headingFont?: string;
  bodyFont?: string;
}

const DEF = {
  tone: "professional and trustworthy",
  audience: "prospective customers",
  brandColor: "#1e3a8a",
  accentColor: "#22d3ee",
  headingFont: "Montserrat",
  bodyFont: "Source Sans 3",
  bg: "#ffffff",
  surface: "#f8fafc",
  text: "#0f172a",
};

/** Named section recipes per page type (each entry maps to one of our elements). */
const PAGE_SECTIONS: Record<DesignPageType, string[]> = {
  home: [
    "HEADER — logo/brand text left, 3–5 nav links center, one primary CTA button right.",
    "HERO — big headline, one-sentence subhead, two buttons, optional supporting image on the right.",
    "FEATURES — a row of 3–4 EQUAL cards, each a small icon, a short title, and one line of text.",
    "TESTIMONIALS — 3 EQUAL cards, each a quote, a person's name, and a 5-star rating.",
    "PRICING — 3 EQUAL plan cards; mark the middle one \"Most Popular\" with a colored badge.",
    "FAQ — a question/answer accordion of 4–6 items.",
    "CTA — a full-width band with a single accent GRADIENT background, a headline, and one button.",
    "FOOTER — 4 columns: a short brand blurb + 3 columns of link lists; a copyright bar as the LAST line.",
  ],
  about: [
    "HEADER — logo left, nav center, CTA right.",
    "HERO — short headline + one-line subhead.",
    "STORY — a 2-column band: image on the left, heading + descriptive paragraphs on the right.",
    "TEAM — a row of 3–4 EQUAL cards, each a photo, a name, and a role.",
    "VALUES — a row of 3 EQUAL cards, each an icon, a title, and a line of text.",
    "CTA — a full-width gradient band, headline + one button.",
    "FOOTER — 4 columns of link lists + copyright bar.",
  ],
  services: [
    "HEADER — logo left, nav center, CTA right.",
    "HERO — headline + subhead + one button.",
    "FEATURES — a row of 3–4 EQUAL service cards (icon, title, description).",
    "TABS — a tabbed band comparing service tiers or options.",
    "PRICING — 3 EQUAL plan cards; mark one \"Most Popular\".",
    "FAQ — 4–6 item accordion.",
    "CTA — gradient band, headline + button.",
    "FOOTER — 4 columns + copyright bar.",
  ],
  product: [
    "HEADER — logo left, nav center, CTA right.",
    "HERO — headline + subhead + two buttons + product image on the right.",
    "FEATURES — a row of 3–4 EQUAL capability cards (icon, title, description).",
    "TABS — a tabbed band of detailed capabilities or use-cases.",
    "TESTIMONIALS — 3 EQUAL quote cards with names and ratings.",
    "PRICING — 3 EQUAL plan cards; mark one \"Most Popular\".",
    "CTA — gradient band, headline + button.",
    "FOOTER — 4 columns + copyright bar.",
  ],
  pricing: [
    "HEADER — logo left, nav center, CTA right.",
    "HERO — short headline (\"Simple, transparent pricing\") + one-line subhead.",
    "PRICING — 3 EQUAL plan cards; mark the middle \"Most Popular\" with a badge.",
    "FEATURES — a row of 3 EQUAL cards reinforcing what's included.",
    "FAQ — 4–6 item accordion about billing/plans.",
    "CTA — gradient band, headline + button.",
    "FOOTER — 4 columns + copyright bar.",
  ],
  contact: [
    "HEADER — logo left, nav center, CTA right.",
    "HERO — short headline (\"Get in touch\") + one-line subhead.",
    "CONTACT — a 2-column band: a CONTACT FORM (Name, Email, Phone, Message + submit) on the left, business details as a bullet list (address, phone, email, hours) on the right.",
    "MAP — a full-width map band.",
    "FOOTER — 4 columns + copyright bar.",
  ],
  landing: [
    "HERO — big headline, subhead, one strong button (no nav — this is a focused landing page).",
    "FEATURES — a row of 3 EQUAL benefit cards (icon, title, text).",
    "TESTIMONIALS — 3 EQUAL quote cards with names and ratings.",
    "CTA — a full-width gradient band with a headline and one button.",
    "FOOTER — a minimal single-row footer: brand blurb + copyright bar.",
  ],
};

export function buildStitchPrompt(input: StitchPromptInput): string {
  const o = { ...DEF, ...Object.fromEntries(Object.entries(input).filter(([, v]) => v)) } as Required<StitchPromptInput> & typeof DEF;
  const pageType = (input.pageType ?? "home") as DesignPageType;
  const sections = PAGE_SECTIONS[pageType] ?? PAGE_SECTIONS.home;
  const sectionLines = sections.map((s, i) => `${i + 1}. ${s}`).join("\n");

  return `Design a modern, responsive, visually appealing ${pageType} page for "${o.businessName}", a ${o.industry} business.
Tone: ${o.tone}. Audience: ${o.audience}.

STRUCTURE (follow exactly — this is how the page must be built):
- Lay the page out as a VERTICAL STACK OF FULL-WIDTH HORIZONTAL SECTIONS. One idea per section.
- Inside each section, arrange content in a SINGLE ROW of 1 to 4 EQUAL-WIDTH columns.
- NEVER use: absolute/overlapping positioning, CSS grid column spans, sticky/fixed elements,
  parallax, background images with text on top (except the hero), or tables for layout.
- Use semantic HTML5: <header>, <section>, <footer>, <h1>–<h6>, <p>, <ul><li>, <a>, <button>, <img>.
- Spacing rhythm: section padding 24–40px; gaps 16–24px; consistent multiples of 8. Never exceed 40px for any single padding/margin.

SECTIONS (use these named blocks, in this order — each must stay a clean full-width band of equal columns):
${sectionLines}

STYLE — use ONLY this palette (no arbitrary colors, so the theme captures cleanly):
- primary ${o.brandColor} · accent ${o.accentColor} · background ${o.bg} · surface ${o.surface} · text ${o.text} · text-muted #64748b · border #e2e8f0.
- Heading font: ${o.headingFont} (Google Fonts). Body font: ${o.bodyFont} (Google Fonts).
- Use primary for buttons, links, and badges; the ONE CTA band uses a primary→accent gradient. At most one gradient on the page.
- Corner radius 8px; soft, subtle shadows for card elevation.
- All text must meet WCAG-AA contrast against its background (never light text on a light band).
- Icons: standard Material Symbols only.

Make it beautiful and modern, but every section must remain a clean full-width band of equal columns built from the named blocks above. Generate complete, semantic HTML and CSS that follows every rule above.`;
}
