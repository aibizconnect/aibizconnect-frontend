/**
 * Decompose-on-open (Option B): convert monolithic composite sections (hero,
 * features, cta, …) into REAL primitive `row → column → element` structures so
 * every part becomes individually editable (add / delete / move / props / style)
 * through the existing RowEditor + inspector + drag-drop path.
 *
 * Styling reproduces the premium look via each element's own style fields
 * (fontSize/weight/color, button variant/bgColor) + per-column `colStyles` +
 * the row `_style` (backgrounds incl. gradients, padding, radius, shadow).
 *
 * Idempotent: a section that is already a `row` is returned unchanged, so
 * running this repeatedly (on every page open) is safe.
 */
import type { SectionContent } from "./schemas";

const TEXT = "#0f172a";
const MUTED = "#64748b";
const ACCENT = "#2563eb";
const ACCENT_DARK = "#1d4ed8";

type Style = Record<string, any>;
/** Zero the default element padding so stacked elements sit tight; add margins/extra. */
const wrap = (el: any, style: Style = {}) => ({ ...el, _style: { pt: 0, pr: 0, pb: 0, pl: 0, ...style } });

// Fonts are intentionally left UNSET so elements inherit the global Typography
// role font (Title/Heading/Body…); users override per element on the right.
const heading = (text: string, o: Style = {}) => ({
  type: "heading", text, level: o.level ?? "h2", align: o.align ?? "left",
  ...(o.fontFamily ? { fontFamily: o.fontFamily } : {}),
  fontSize: o.fontSize, fontWeight: o.fontWeight, lineHeight: o.lineHeight, color: o.color ?? TEXT,
});
const paragraph = (text: string, o: Style = {}) => ({
  type: "text", text, align: o.align ?? "left",
  ...(o.fontFamily ? { fontFamily: o.fontFamily } : {}),
  fontSize: o.fontSize ?? 16, color: o.color ?? MUTED, lineHeight: o.lineHeight ?? 1.6,
});
const button = (label: string, href: string, o: Style = {}) => ({
  type: "button", label, href: href || "#", align: o.align ?? "left",
  variant: o.variant ?? "solid", size: o.size ?? "md", bgColor: o.bgColor, textColor: o.textColor, radius: o.radius ?? 12,
  ...(o.fullWidth ? { fullWidth: o.fullWidth } : {}),
});
const image = (url: string, o: Style = {}) => ({ type: "image", url: url || "", alt: o.alt ?? "", rounding: o.rounding ?? 16, objectFit: o.objectFit ?? "cover" });

const row = (columns: number, children: any[][], o: Style = {}) => ({
  type: "row", columns, widths: o.widths ?? Array.from({ length: columns }, () => 1 / columns),
  gap: o.gap ?? 16, children,
  ...(o.colStyles ? { colStyles: o.colStyles } : {}),
  ...(o._style ? { _style: o._style } : {}),
  ...(o._role ? { _role: o._role } : {}),
});

/** HERO → white split: [Headline, Sub-Headline, Buttons] | [Image/visual]. */
function decomposeHero(c: any): SectionContent {
  const left: any[] = [
    wrap(heading(c.heading ?? "Headline", { level: "h1", fontSize: 50, fontWeight: "800", lineHeight: 1.05, color: TEXT }), { mb: 18 }),
  ];
  if (c.subheading) left.push(wrap(paragraph(c.subheading, { fontSize: 18 }), { mb: 24 }));
  const ctas: any[][] = [];
  if (c.primaryCta) ctas.push([button(c.primaryCta.label, c.primaryCta.href, { variant: "solid", bgColor: ACCENT, size: "lg" })]);
  if (c.secondaryCta) ctas.push([button(c.secondaryCta.label, c.secondaryCta.href, { variant: "outline", textColor: TEXT, size: "lg" })]);
  if (ctas.length) {
    left.push(ctas.length > 1
      ? row(ctas.length, ctas, { widths: ctas.map(() => 1 / ctas.length), gap: 12 })
      : { ...ctas[0][0] });
  }
  const right: any[] = [
    image(c.backgroundImageUrl ?? "", { rounding: 16, alt: "Hero visual" }),
  ];
  return row(2, [left, right], {
    widths: [0.55, 0.45], gap: 48, _role: "hero",
    _style: { bg: "#ffffff", pt: 72, pb: 72, pl: 24, pr: 24, width: "wide" },
    colStyles: [
      { align: "start", pt: 8, pb: 8, pl: 0, pr: 0 },
      { align: "center", bg: "linear-gradient(135deg,#0f172a,#1e3a8a)", radius: 18, pt: 28, pb: 28, pl: 24, pr: 24, shadow: "elevated" },
    ],
  }) as SectionContent;
}

/** CTA → full-width gradient banner: [Headline, Sub, Button] centered. */
function decomposeCta(c: any): SectionContent {
  const kids: any[] = [
    wrap(heading(c.heading ?? "Ready?", { align: "center", fontSize: 30, fontWeight: "800", color: "#ffffff" }), { mb: 12, align: "center" }),
  ];
  if (c.subheading) kids.push(wrap(paragraph(c.subheading, { align: "center", color: "#dbeafe", fontSize: 16 }), { mb: 24, align: "center" }));
  if (c.cta) kids.push(button(c.cta.label, c.cta.href, { align: "center", variant: "solid", bgColor: "#ffffff", textColor: ACCENT_DARK, size: "lg", radius: 10 }));
  return row(1, [kids], {
    _style: { bg: `linear-gradient(135deg,${ACCENT},${ACCENT_DARK})`, pt: 56, pb: 56, pl: 24, pr: 24 },
    colStyles: [{ align: "center", pt: 0, pb: 0, pl: 0, pr: 0, width: "normal" }],
  }) as SectionContent;
}

const CARD = { bg: "#ffffff", radius: 16, pt: 24, pb: 24, pl: 24, pr: 24, shadow: "soft", borderStyle: "solid", borderColor: "#e2e8f0", borderWidth: 1, align: "start" } as Style;
const SECTION_BG = { bg: "#f8fafc", pt: 72, pb: 72, pl: 24, pr: 24 } as Style;

/** Build a "heading + card grid" section. cards = array of element-cell arrays. */
function gridSection(headingText: string | undefined, cards: any[][], opts: Style = {}): SectionContent {
  const n = Math.max(1, Math.min(6, cards.length || 1));
  const cardsRow = row(n, cards, { gap: 24, colStyles: cards.map(() => CARD) });
  const headEl = headingText
    ? wrap(heading(headingText, { align: "center", fontSize: 34, fontWeight: "800", color: TEXT }), { mb: 40, align: "center" })
    : null;
  return row(1, [headEl ? [headEl, cardsRow] : [cardsRow]], {
    _style: { ...SECTION_BG, ...(opts.bg ? { bg: opts.bg } : {}) },
    colStyles: [{ pt: 0, pb: 0, pl: 0, pr: 0, align: "center", width: "wide" }],
  }) as SectionContent;
}

/** FEATURES → centered heading + premium white card grid (nested row of cards). */
function decomposeFeatures(c: any): SectionContent {
  const feats: any[] = Array.isArray(c.features) ? c.features : [];
  if (feats.length > 6) return c; // too many columns — keep composite
  const cards = (feats.length ? feats : [{ title: "Feature", description: "" }]).map((f: any) => {
    const cell: any[] = [];
    if (f.icon) cell.push(wrap(heading(String(f.icon), { fontSize: 24 }), { mb: 10 }));
    cell.push(wrap(heading(f.title ?? "Feature", { level: "h3", fontSize: 18, fontWeight: "700", color: TEXT }), { mb: 8 }));
    cell.push(paragraph(f.description ?? "", { fontSize: 14 }));
    return cell;
  });
  return gridSection(c.heading ?? "Features", cards);
}

/** TESTIMONIALS → heading + quote cards. */
function decomposeTestimonials(c: any): SectionContent {
  const items: any[] = Array.isArray(c.items) ? c.items : [];
  if (items.length > 6) return c;
  const cards = (items.length ? items : [{ quote: "Great!", name: "Client" }]).map((it: any) => {
    const cell: any[] = [wrap(paragraph(`“${it.quote ?? ""}”`, { fontSize: 16, color: TEXT, lineHeight: 1.6 }), { mb: 14 })];
    if (it.avatarUrl) cell.push(wrap(image(it.avatarUrl, { rounding: 999, alt: it.name }), { mb: 8 }));
    cell.push(heading(it.name ?? "Name", { level: "h4", fontSize: 15, fontWeight: "700", color: TEXT }));
    if (it.role) cell.push(paragraph(it.role, { fontSize: 13 }));
    return cell;
  });
  return gridSection(c.heading, cards);
}

/** PRICING → plan cards. */
function decomposePricing(c: any): SectionContent {
  const plans: any[] = Array.isArray(c.plans) ? c.plans : [];
  if (plans.length > 6) return c;
  const cards = (plans.length ? plans : [{ name: "Plan", price: "$0" }]).map((p: any) => {
    const cell: any[] = [
      wrap(heading(p.name ?? "Plan", { level: "h3", fontSize: 18, fontWeight: "700", color: TEXT }), { mb: 6 }),
      wrap(heading(`${p.price ?? ""}${p.period ?? ""}`, { fontSize: 30, fontWeight: "800", color: TEXT }), { mb: 14 }),
    ];
    (p.features ?? []).forEach((f: any) => cell.push(paragraph(`• ${f.text ?? ""}`, { fontSize: 14 })));
    if (p.ctaLabel) cell.push(wrap(button(p.ctaLabel, p.ctaHref ?? "#", { variant: "solid", bgColor: ACCENT, fullWidth: "full" }), { mt: 16 } as any));
    return cell;
  });
  return gridSection(undefined, cards);
}

/** LISTINGS → property/item cards. */
function decomposeListings(c: any): SectionContent {
  const items: any[] = Array.isArray(c.items) ? c.items : [];
  if (items.length > 6) return c;
  const cards = (items.length ? items : [{ title: "Item" }]).map((it: any) => {
    const cell: any[] = [];
    cell.push(wrap(image(it.imageUrl ?? "", { rounding: 12, alt: it.title }), { mb: 12 }));
    cell.push(wrap(heading(it.title ?? "Item", { level: "h3", fontSize: 18, fontWeight: "700", color: TEXT }), { mb: 4 }));
    const meta = [it.price, it.location].filter(Boolean).join(" · ");
    if (meta) cell.push(paragraph(meta, { fontSize: 14 }));
    if (it.href) cell.push(wrap(button("View", it.href, { variant: "outline", textColor: ACCENT }), { mt: 12 } as any));
    return cell;
  });
  return gridSection(c.heading, cards);
}

/** FAQ → stacked question/answer pairs (single column). */
function decomposeFaq(c: any): SectionContent {
  const items: any[] = Array.isArray(c.items) ? c.items : [];
  const kids: any[] = [];
  (items.length ? items : [{ q: "Question?", a: "Answer." }]).forEach((it: any, i: number) => {
    kids.push(wrap(heading(it.q ?? "", { level: "h3", fontSize: 18, fontWeight: "700", color: TEXT }), { mt: i ? 20 : 0, mb: 6 }));
    kids.push(paragraph(it.a ?? "", { fontSize: 15 }));
  });
  return row(1, [kids], {
    _style: { bg: "#ffffff", pt: 64, pb: 64, pl: 24, pr: 24 },
    colStyles: [{ pt: 0, pb: 0, pl: 0, pr: 0, align: "start", width: "normal" }],
  }) as SectionContent;
}

const DECOMPOSERS: Record<string, (c: any) => SectionContent> = {
  hero: decomposeHero,
  cta: decomposeCta,
  features: decomposeFeatures,
  testimonials: decomposeTestimonials,
  pricing: decomposePricing,
  listings: decomposeListings,
  faq: decomposeFaq,
};

/** Convert any composite sections in a page to editable primitive rows. Idempotent. */
export function decomposePage(sections: SectionContent[]): SectionContent[] {
  if (!Array.isArray(sections)) return [];
  return sections.map((s: any) => {
    const fn = s && typeof s.type === "string" ? DECOMPOSERS[s.type] : undefined;
    return fn ? fn(s) : s;
  });
}

/** Types we can currently decompose (for messaging / gating). */
export const DECOMPOSABLE_TYPES = Object.keys(DECOMPOSERS);
