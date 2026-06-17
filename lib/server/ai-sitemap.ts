import { llm, stripFences } from "@/lib/agent/llm";
import { sectionSchema, type SectionContent } from "@/lib/sections/schemas";
import { instantiateTemplate, pageToSectionContents, getIndustryTemplate } from "@/lib/design/templates";

/**
 * AI sitemap-first generation (Builder North-Star Goal A, P1 — D-382, Gemini+Copilot ratified).
 *
 * Given a business brief, ask the LLM for an ADAPTIVE sitemap — the pages a business like this needs,
 * each with ordered sections authored in OUR native section vocabulary (so they render + stay AI-
 * editable). Every section is validated against `sectionSchema`; invalid ones are dropped. If the LLM
 * has no key or returns nothing usable (L-3 deterministic fallback), we fall back to the fixed
 * industry template — onboarding NEVER breaks.
 */

export interface SitemapPage { slug: string; title: string; seo: { seo_title: string; seo_description: string }; sections: SectionContent[] }
export interface Sitemap { source: "ai" | "template"; pages: SitemapPage[] }

export interface SiteBrief {
  businessName: string;
  templateKey: string;            // the picked industry card (maps to the template + fallback)
  industryLabel?: string;         // human label e.g. "Real Estate"
  location?: { country?: string; region?: string; city?: string };
  description?: string;           // optional free-text about the business
  tenantId?: string;              // for usage metering / key resolution
}

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const slugify = (s: string) => (s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 32) || "page";

/** The section types the AI may emit (curated to ones that render well from pure JSON — no asset URLs). */
const ALLOWED = new Set(["hero", "features", "testimonials", "pricing", "faq", "cta", "text", "contact-form"]);

const SYSTEM = `You are a senior conversion-focused web designer + copywriter. You output ONLY valid JSON (no prose, no markdown fences).
You design a small business marketing website as a SITEMAP: an ordered list of pages, each an ordered list of SECTIONS.
Use ONLY these section shapes (exact keys):
- {"type":"hero","heading":string,"subheading":string,"primaryCta":{"label":string,"href":string},"secondaryCta":{"label":string,"href":string}}
- {"type":"features","heading":string,"features":[{"title":string,"description":string,"icon":string}]}   // icon = a single emoji
- {"type":"testimonials","heading":string,"items":[{"name":string,"role":string,"quote":string}]}
- {"type":"pricing","plans":[{"name":string,"price":string,"period":string,"features":[{"text":string}],"ctaLabel":string,"ctaHref":string}]}
- {"type":"faq","items":[{"q":string,"a":string}]}
- {"type":"cta","heading":string,"subheading":string,"cta":{"label":string,"href":string}}
- {"type":"text","text":string,"align":"center"}
- {"type":"contact-form","heading":string,"subheading":string,"fields":[{"name":"name","label":"Your name","type":"text"},{"name":"email","label":"Email","type":"email"},{"name":"phone","label":"Phone","type":"tel"},{"name":"message","label":"How can we help?","type":"textarea"}],"submitLabel":"Send message"}
All "href" values MUST be a bare page slug from THIS site: "home","about","services","pricing","contact" (or another slug you define). Never use full URLs.
Write specific, benefit-led copy tailored to the business — never lorem ipsum, never placeholders.`;

interface RawSitemap { pages?: { slug?: string; title?: string; seoTitle?: string; seoDescription?: string; sections?: unknown[] }[] }

/** Validate + clean one raw section against the section schema. Returns null if unusable. */
function cleanSection(raw: unknown): SectionContent | null {
  if (!raw || typeof raw !== "object") return null;
  const type = (raw as any).type;
  if (!ALLOWED.has(type)) return null;
  const parsed = sectionSchema.safeParse(raw);
  return parsed.success ? (parsed.data as SectionContent) : null;
}

/** Build the deterministic template sitemap (the L-3 fallback). */
function templateSitemap(brief: SiteBrief): Sitemap {
  const tpl = instantiateTemplate(brief.templateKey, { businessName: brief.businessName }) ?? getIndustryTemplate("real-estate");
  const pages: SitemapPage[] = (tpl?.pages ?? []).map((p) => ({
    slug: SLUG_RE.test(p.slug) ? p.slug : slugify(p.slug),
    title: p.title,
    seo: { seo_title: p.seo.title, seo_description: p.seo.description },
    sections: pageToSectionContents(p) as unknown as SectionContent[],
  }));
  return { source: "template", pages };
}

export async function generateSitemap(brief: SiteBrief): Promise<Sitemap> {
  const where = [brief.location?.city, brief.location?.region, brief.location?.country].filter(Boolean).join(", ");
  const user = `Business name: ${brief.businessName}
Industry: ${brief.industryLabel || brief.templateKey}
${where ? `Location: ${where}` : ""}
${brief.description ? `About: ${brief.description}` : ""}

Design a complete marketing website (4–6 pages: typically Home, About, Services, Pricing, Contact — adapt to the industry). Each page: an ordered list of sections using ONLY the allowed shapes, with strong, specific copy and clear CTAs that link to the right page slug. Home should open with a hero and end with a cta. Contact must include the contact-form.
Return JSON: {"pages":[{"slug":"home","title":"...","seoTitle":"...","seoDescription":"...","sections":[ ... ]}, ...]}`;

  let raw: RawSitemap | null = null;
  try {
    const text = await llm.complete({ system: SYSTEM, user, jsonObject: true, temperature: 0.6 }, brief.tenantId);
    if (text) raw = JSON.parse(stripFences(text)) as RawSitemap;
  } catch { raw = null; }

  if (!raw?.pages?.length) return templateSitemap(brief); // L-3 deterministic fallback

  const seen = new Set<string>();
  const pages: SitemapPage[] = [];
  for (const p of raw.pages) {
    const sections = (Array.isArray(p.sections) ? p.sections : []).map(cleanSection).filter((s): s is SectionContent => !!s);
    if (!sections.length) continue;                       // skip empty/invalid pages
    let slug = SLUG_RE.test(String(p.slug)) ? String(p.slug) : slugify(String(p.title || "page"));
    while (seen.has(slug)) slug = `${slug}-2`;
    seen.add(slug);
    pages.push({
      slug,
      title: String(p.title || brief.businessName),
      seo: { seo_title: String(p.seoTitle || p.title || brief.businessName), seo_description: String(p.seoDescription || "") },
      sections,
    });
  }

  // Guard: if the AI produced too little to be a real site, fall back to the template.
  if (pages.length < 2) return templateSitemap(brief);
  return { source: "ai", pages };
}
