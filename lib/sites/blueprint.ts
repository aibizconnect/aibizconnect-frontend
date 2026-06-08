import { htmlToSections } from "./html-importer";
import type { BusinessProfile } from "./page-generate";

/**
 * Learn the LAYER STRUCTURE of top sites and synthesize a best-practice blueprint, then emit a
 * tenant-branded section per archetype (top → bottom). Used for FROM-SCRATCH builds so a tenant
 * with no existing site still gets a well-structured page modelled on the top-3 similar sites,
 * filled with their own profile and styled by their theme.
 */

export type Archetype = "hero" | "logos" | "features" | "stats" | "gallery" | "testimonials" | "pricing" | "faq" | "cta" | "content";

const CANON: Archetype[] = ["hero", "logos", "features", "stats", "gallery", "testimonials", "pricing", "faq", "cta"];
export const DEFAULT_BLUEPRINT: Archetype[] = ["hero", "features", "testimonials", "pricing", "faq", "cta"];

function bandText(sec: Record<string, any>): string { return String(sec._name || sec.heading || "").toLowerCase(); }
function bandBlocks(sec: Record<string, any>): Record<string, any>[] { return sec.type === "row" ? (sec.children?.[0] || []) : [sec]; }

/** Classify one imported band (hero section or banded row) into an archetype. */
export function classifyBand(sec: Record<string, any>): Archetype {
  if (sec.type === "hero") return "hero";
  const name = bandText(sec);
  const blocks = bandBlocks(sec);
  const kinds = blocks.map((b) => b.type);
  const text = blocks.map((b) => String(b.text || b.heading || "")).join(" ").toLowerCase();
  const all = name + " " + text;
  const headings = kinds.filter((k) => k === "heading").length;
  const hasButton = kinds.includes("button");
  const images = kinds.filter((k) => k === "image").length + (kinds.includes("gallery") ? 3 : 0);

  if (/\b(pricing|plans?|per month|\/mo|monthly|annual)\b/.test(all) || /\$\s?\d/.test(text)) return "pricing";
  if (/\b(faq|frequently asked|common questions|questions)\b/.test(name)) return "faq";
  if (/\b(testimonial|reviews?|loved by|what .*(say|think)|customers? say|hear from)\b/.test(all)) return "testimonials";
  if (/\b(trusted by|our partners|our clients|as seen|featured in|brands)\b/.test(name) && images >= 2) return "logos";
  if (/\b(ready|get started|start (your|free|today)|try (it|free)|sign up|book (a|your)|free trial|get in touch|contact us|join (us|today))\b/.test(name) && hasButton && blocks.length <= 4) return "cta";
  if (images >= 3 && headings <= 1) return "gallery";
  if (/\b(by the numbers|results|stats|impact|trusted across)\b/.test(name)) return "stats";
  if (headings >= 3 || /\b(features|why (choose|us)|benefits|everything you|what you get|how it works|services|solutions|what we (do|offer)|capabilities)\b/.test(name)) return "features";
  return "content";
}

/** Ordered archetypes for a rendered competitor page. */
export function blueprintFromHtml(html: string, baseUrl: string): Archetype[] {
  let secs: Record<string, any>[] = [];
  try { secs = htmlToSections(html, baseUrl) as Record<string, any>[]; } catch { return []; }
  return secs.map(classifyBand);
}

/** Merge several competitors' blueprints into one canonical best-practice order (hero…cta). */
export function synthesizeBlueprint(lists: Archetype[][]): Archetype[] {
  const present = new Set<Archetype>();
  for (const l of lists) for (const a of l) if (a !== "content") present.add(a);
  if (!present.size) return DEFAULT_BLUEPRINT;
  let order = CANON.filter((a) => present.has(a) && a !== "hero" && a !== "cta");
  if (!order.includes("features")) order.unshift("features");
  return ["hero", ...order, "cta"];
}

// ── Branded section per archetype (fact-safe templates from the tenant profile) ───────────────
function svc(p: BusinessProfile): string[] { return (p.services_products ?? []).filter(Boolean).slice(0, 6); }

function sectionForArchetype(arch: Archetype, p: BusinessProfile): Record<string, unknown> | null {
  const name = p.business_name || "our company";
  switch (arch) {
    case "hero":
      return { type: "hero", _name: "Hero", heading: p.business_name || "Welcome",
        subheading: p.audience ? `Built for ${p.audience}.` : (p.industry ? `${p.industry}, done right.` : "See how we can help you today."),
        primaryCta: { label: "Get started", href: "/contact" }, secondaryCta: { label: "Learn more", href: "#" } };
    case "features": {
      const s = svc(p);
      return { type: "features", _name: "Features", heading: "What we offer",
        features: (s.length ? s : ["Expert service", "Clear communication", "Results that matter"]).map((t) => ({ title: t, description: "" })) };
    }
    case "stats":
      return { type: "row", columns: 3, _name: "Highlights", contentWidth: "boxed", children: [
        [{ type: "number-counter", value: "100", start: 0, end: 100, duration: 2, suffix: "+", label: "Clients served" }],
        [{ type: "number-counter", value: "10", start: 0, end: 10, duration: 2, suffix: "+", label: "Years experience" }],
        [{ type: "number-counter", value: "100", start: 0, end: 100, duration: 2, suffix: "%", label: "Commitment" }],
      ] };
    case "logos": return { type: "logos", _name: "Trusted by", images: [] };
    case "gallery": return { type: "gallery", _name: "Gallery", images: [] };
    case "testimonials":
      return { type: "testimonials", _name: "Testimonials", heading: "What our clients say", items: [
        { name: "Add a real client", role: "Customer", quote: `Working with ${name} was a great experience — replace this with a real review.` },
        { name: "Add another review", role: "Client", quote: "Professional, responsive, and results-driven." },
      ] };
    case "pricing":
      return { type: "pricing", _name: "Pricing", plans: [
        { name: "Starter", price: "$", period: "/mo", features: ["Core features"], ctaLabel: "Get started", ctaHref: "/contact" },
        { name: "Pro", price: "$$", period: "/mo", features: ["Everything in Starter", "Priority support"], ctaLabel: "Get started", ctaHref: "/contact" },
      ] };
    case "faq":
      return { type: "faq", _name: "FAQ", items: [
        { q: `What does ${name} do?`, a: p.industry ? `We provide ${p.industry} services${p.location ? ` in ${p.location}` : ""}.` : "We help our clients succeed — edit this answer." },
        { q: "How do I get started?", a: "Reach out via our contact page and we'll take it from there." },
      ] };
    case "cta":
      return { type: "cta", _name: "Call to action", heading: "Ready to get started?",
        subheading: p.audience ? `Join ${p.audience} who trust ${name}.` : "", cta: { label: "Contact us", href: "/contact" } };
    default: return null;
  }
}

/** Build the ordered, tenant-branded sections for a from-scratch page from a blueprint. */
export function buildScratchSections(blueprint: Archetype[], p: BusinessProfile): Record<string, unknown>[] {
  return blueprint.map((a) => sectionForArchetype(a, p)).filter(Boolean) as Record<string, unknown>[];
}
