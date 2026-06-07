/**
 * Website Generation helpers (Steps 1c → blocks → tree → lean build). DETERMINISTIC and FAITHFUL:
 * rebuilt pages reuse ONLY content extracted from the real page (zero hallucination — the strongest
 * possible guarantee for WG-1C-V6 / WG-S3-V5, same precedent as the deterministic Step 1b). New
 * funnel/SEO pages (no source) get templated, FACT-FREE copy guided by the business profile — value
 * props / benefits / CTAs only, never invented names, awards, testimonials, or pricing (RULING 45).
 *
 * Block content is shaped 1:1 to lib/sections/schemas.ts section types so the lean build is a pure
 * pass-through into createPage()+saveDraft({draft_sections}).
 */

const HEADING_FONT = "Roboto";

// ---------- small HTML utilities (regex-based, no DOM on the server) ----------
function decode(s: string): string {
  return s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, " ").replace(/&#x27;/g, "'");
}
function stripTags(s: string): string { return decode(s.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim(); }
function absolutize(href: string, base: string): string { try { return new URL(href, base).toString(); } catch { return href; } }
function firstMatch(re: RegExp, html: string): string | null { const m = re.exec(html); return m ? m[1] : null; }

// ---------- Step 1c: faithful content extraction ----------
export interface ExtractedSection { heading: string; text: string }
export interface ExtractedCta { label: string; href: string }
export interface ExtractedContent {
  headline: string;
  subheadline: string;
  sections: ExtractedSection[];
  ctas: ExtractedCta[];
  images: string[];
  metadata: { title: string; description: string; ogImage: string };
  page_intent: "informational" | "conversion" | "trust_building" | "seo" | "funnel_step";
}

const CTA_WORDS = /\b(contact|get|book|call|sign\s?up|buy|start|request|quote|schedule|subscribe|learn more|get started|free)\b/i;

function inferIntent(url: string, title: string): ExtractedContent["page_intent"] {
  const s = `${url} ${title}`.toLowerCase();
  if (/(contact|quote|book|appointment|demo|signup|sign-up|get-started)/.test(s)) return "conversion";
  if (/(about|team|story|mission|review|testimonial)/.test(s)) return "trust_building";
  if (/(blog|guide|resource|article|faq)/.test(s)) return "seo";
  return "informational";
}

function isContentImage(src: string): boolean {
  const s = src.toLowerCase();
  if (s.startsWith("data:")) return false;
  if (/\.svg(\?|$)/.test(s)) return false;
  return !/(logo|icon|sprite|favicon|avatar|badge|pixel|spacer|1x1)/.test(s);
}

export function extractPageContent(html: string, baseUrl: string): ExtractedContent {
  // Strip site chrome (header/nav/footer) so the rebuild captures the page BODY only — the global
  // Header/Footer blocks provide navigation site-wide (architect D-083). Title read before stripping.
  const title = stripTags(firstMatch(/<title[^>]*>([\s\S]*?)<\/title>/i, html) || "");
  html = html.replace(/<(header|footer|nav)\b[\s\S]*?<\/\1>/gi, " ");
  const description = decode(firstMatch(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i, html) || "").trim();
  const ogImageRaw = firstMatch(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i, html) || "";
  const ogImage = ogImageRaw ? absolutize(ogImageRaw, baseUrl) : "";

  const h1 = stripTags(firstMatch(/<h1[^>]*>([\s\S]*?)<\/h1>/i, html) || "");
  const headline = h1 || title || "";

  // Sections: each h2/h3 + following text up to the next heading.
  const sections: ExtractedSection[] = [];
  const headingRe = /<h([23])[^>]*>([\s\S]*?)<\/h\1>/gi;
  let m: RegExpExecArray | null;
  const marks: { idx: number; end: number; heading: string }[] = [];
  while ((m = headingRe.exec(html))) marks.push({ idx: m.index, end: headingRe.lastIndex, heading: stripTags(m[2]) });
  for (let i = 0; i < marks.length; i++) {
    const slice = html.slice(marks[i].end, i + 1 < marks.length ? marks[i + 1].idx : marks[i].end + 4000);
    const text = stripTags(slice).slice(0, 600);
    if (marks[i].heading && text.length > 40) sections.push({ heading: marks[i].heading, text });
    if (sections.length >= 12) break;
  }

  const subheadline = description || (sections[0]?.text ? sections[0].text.slice(0, 160) : "");

  // CTAs: action-y anchors.
  const ctas: ExtractedCta[] = [];
  const aRe = /<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  while ((m = aRe.exec(html)) && ctas.length < 5) {
    const label = stripTags(m[2]);
    if (label && label.length <= 40 && CTA_WORDS.test(label)) {
      const href = absolutize(m[1], baseUrl);
      if (!ctas.some((c) => c.label.toLowerCase() === label.toLowerCase())) ctas.push({ label, href });
    }
  }

  // Images: real content images only.
  const images: string[] = [];
  const imgRe = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
  while ((m = imgRe.exec(html)) && images.length < 12) {
    const src = absolutize(m[1], baseUrl);
    if (isContentImage(src) && !images.includes(src)) images.push(src);
  }

  return { headline, subheadline, sections, ctas, images, metadata: { title, description, ogImage }, page_intent: inferIntent(baseUrl, title) };
}

// ---------- Blocks: ExtractedContent → section-shaped block content ----------
export interface GeneratedBlock { block_type: string; block_name: string; content: Record<string, unknown> }

function brandedHeading(text: string, level: "h1" | "h2" | "h3" = "h2"): Record<string, unknown> {
  return { type: "heading", text, level, fontFamily: HEADING_FONT };
}

/** Build atomic, render-ready blocks for a REBUILT page (faithful reuse only). */
export function contentToBlocks(ex: ExtractedContent, contactDefaultHref = "#contact"): GeneratedBlock[] {
  const blocks: GeneratedBlock[] = [];
  const primaryCta = ex.ctas[0];

  // Hero (reuses real headline / subheadline / first CTA / first content image).
  const hero: Record<string, unknown> = { type: "hero", heading: ex.headline || ex.metadata.title || "Welcome" };
  if (ex.subheadline) hero.subheading = ex.subheadline;
  if (primaryCta) hero.primaryCta = { label: primaryCta.label, href: primaryCta.href };
  if (ex.images[0] || ex.metadata.ogImage) hero.backgroundImageUrl = ex.images[0] || ex.metadata.ogImage;
  blocks.push({ block_type: "hero", block_name: "Hero", content: hero });

  // Sections → heading + text pairs (faithful copy).
  for (const s of ex.sections.slice(0, 10)) {
    blocks.push({ block_type: "heading", block_name: "Section heading", content: brandedHeading(s.heading) });
    blocks.push({ block_type: "text", block_name: "Section text", content: { type: "text", text: s.text, fontFamily: HEADING_FONT } });
  }

  // Gallery (only if we have multiple real content images).
  if (ex.images.length >= 3) {
    blocks.push({ block_type: "gallery", block_name: "Gallery", content: { type: "gallery", images: ex.images.slice(0, 8).map((url) => ({ url })) } });
  }

  // Closing CTA (reuses a real CTA when present, else a neutral contact prompt — no invented claims).
  const cta = primaryCta ?? { label: "Get in touch", href: contactDefaultHref };
  blocks.push({ block_type: "cta", block_name: "Call to action", content: { type: "cta", heading: ex.headline ? `Ready to get started?` : "Get in touch", cta: { label: cta.label, href: cta.href } } });

  return blocks;
}

// ---------- Superior page tree (improved architecture) ----------
export interface TreeNodeSpec {
  page_type: string; title: string; slug: string; full_path: string;
  is_funnel_page: boolean; is_seo_page: boolean; order_index: number;
  /** when set, this node REBUILDS an existing page (reuse its blocks) */
  source_url?: string;
}

const BASE_PAGES: { page_type: string; title: string; slug: string }[] = [
  { page_type: "home", title: "Home", slug: "home" },
  { page_type: "about", title: "About", slug: "about" },
  { page_type: "services", title: "Services", slug: "services" },
  { page_type: "pricing", title: "Pricing", slug: "pricing" },
  { page_type: "testimonials", title: "Testimonials", slug: "testimonials" },
  { page_type: "contact", title: "Contact", slug: "contact" },
];
const FUNNEL_PAGES: { page_type: string; title: string; slug: string }[] = [
  { page_type: "lead_magnet", title: "Free Guide", slug: "free-guide" },
  { page_type: "thank_you", title: "Thank You", slug: "thank-you" },
  { page_type: "ad_landing", title: "Get Started", slug: "get-started" },
];
const SEO_PAGES: { page_type: string; title: string; slug: string }[] = [
  { page_type: "blog_index", title: "Blog", slug: "blog" },
  { page_type: "faq", title: "FAQ", slug: "faq" },
];

/** Match an existing extraction to a base page_type by title/url keywords. */
function matchSource(pageType: string, extractions: { url: string; title: string }[]): string | undefined {
  const want: Record<string, RegExp> = {
    home: /(^|\/)(home|index)?\/?$/i, about: /about|team|story/i, services: /service|product|offer|solution/i,
    pricing: /pric|plan|package/i, testimonials: /testimonial|review|client/i, contact: /contact|quote|book/i,
  };
  const re = want[pageType];
  if (!re) return undefined;
  const hit = extractions.find((e) => re.test(e.url) || re.test(e.title || ""));
  return hit?.url;
}

export function superiorPageTree(extractions: { url: string; title: string }[]): TreeNodeSpec[] {
  const nodes: TreeNodeSpec[] = [];
  let order = 0;
  for (const p of BASE_PAGES) nodes.push({ ...p, full_path: p.slug === "home" ? "/" : `/${p.slug}`, is_funnel_page: false, is_seo_page: false, order_index: order++, source_url: matchSource(p.page_type, extractions) });
  for (const p of SEO_PAGES) nodes.push({ ...p, full_path: `/${p.slug}`, is_funnel_page: false, is_seo_page: true, order_index: order++ });
  for (const p of FUNNEL_PAGES) nodes.push({ ...p, full_path: `/${p.slug}`, is_funnel_page: true, is_seo_page: false, order_index: order++ });
  return nodes;
}

// ---------- Generated (fact-free) sections for NEW pages with no source ----------
export interface BusinessProfile {
  business_name?: string; industry?: string; services_products?: string[]; tone?: string;
  audience?: string; location?: string; logo_url?: string | null; brand_colors?: string[];
}

function svcList(p: BusinessProfile): string[] { return (p.services_products ?? []).slice(0, 4); }

/** Templated, fact-free sections for funnel/SEO pages (value props/benefits/CTAs only). */
export function generatedSectionsFor(pageType: string, p: BusinessProfile): Record<string, unknown>[] {
  const name = p.business_name || "our business";
  const svc = svcList(p);
  const sections: Record<string, unknown>[] = [];
  const heroFor = (heading: string, sub: string, ctaLabel: string): Record<string, unknown> => ({ type: "hero", heading, subheading: sub, primaryCta: { label: ctaLabel, href: "/contact" } });

  if (pageType === "lead_magnet") {
    sections.push(heroFor("Get our free guide", `Practical tips from ${name}${p.industry ? ` for ${p.industry}` : ""}.`, "Get the guide"));
    sections.push(brandedHeading("What's inside"));
    sections.push({ type: "bullet-list", bulletStyle: "check", items: (svc.length ? svc : ["Expert guidance", "Time-saving tips", "Real-world examples"]).map((t) => ({ text: t })) });
    sections.push({ type: "contact-form", heading: "Where should we send it?", fields: [{ name: "email", label: "Email", type: "email" }], submitLabel: "Send me the guide", successMessage: "Check your inbox!" });
  } else if (pageType === "thank_you") {
    sections.push(heroFor("Thank you!", "We've received your request and will be in touch shortly.", "Back to home"));
    sections.push({ type: "text", text: `In the meantime, explore what ${name} can do for you.`, fontFamily: HEADING_FONT });
  } else if (pageType === "ad_landing") {
    sections.push(heroFor(`Get started with ${name}`, p.audience ? `Built for ${p.audience}.` : "See how we can help you today.", "Get started"));
    sections.push({ type: "features", heading: "Why choose us", features: (svc.length ? svc : ["Trusted service", "Clear communication", "Results you can see"]).map((t) => ({ title: t, description: "" })) });
    sections.push({ type: "cta", heading: "Ready when you are", cta: { label: "Contact us", href: "/contact" } });
  } else if (pageType === "faq") {
    sections.push(brandedHeading("Frequently asked questions", "h1"));
    sections.push({ type: "faq", items: [
      { q: `What does ${name} offer?`, a: svc.length ? `We help with ${svc.join(", ")}.` : "Reach out and we'll walk you through how we can help." },
      { q: "How do I get started?", a: "Use the contact form and we'll respond promptly." },
    ] });
  } else if (pageType === "blog_index") {
    sections.push(brandedHeading("From our blog", "h1"));
    sections.push({ type: "text", text: "Insights, guides, and updates — coming soon.", fontFamily: HEADING_FONT });
  } else {
    sections.push(heroFor(name, p.industry || "Welcome", "Learn more"));
  }
  return sections;
}

/** Brand settings derived from the analysis profile (Roboto default, soft gradient). */
export function brandFromProfile(p: BusinessProfile): Record<string, unknown> {
  const primary = p.brand_colors?.[0] || "#1e3a8a";
  return {
    logo_url: p.logo_url || null,
    color_palette: { primary, secondary: "#0ea5e9", accent: "#22d3ee", background: "#ffffff", surface: "#f8fafc", border: "#e2e8f0", foreground: "#0f172a", muted: "#64748b" },
    font_pairing: { heading: "Roboto", body: "Roboto" },
    background_style: { type: "soft-gradient", value: "linear-gradient(180deg,#ffffff 0%,#f5f8ff 100%)" },
  };
}
