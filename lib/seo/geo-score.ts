/**
 * SEO + GEO (Generative Engine Optimization) scoring. Pure, dependency-free. Scores a
 * page for both classic search AND AI answer engines (clear title/desc, headings, schema,
 * entity clarity, alt text, internal links). Powers the editor's "SEO & AI search" panel
 * and can feed the O-3 critic. No side effects.
 */

export interface SeoInput {
  title?: string;
  description?: string;
  sections?: any[];                 // flat section content objects
  author?: string;
  language?: string;
  schemaType?: string;              // e.g. "LocalBusiness", "Article"
  focusKeyword?: string;
  canonical?: string;
}

export interface CategoryScore {
  key: string;
  label: string;
  score: number;        // 0–100
  tips: string[];
}

export interface SeoReport {
  overall: number;      // 0–100
  categories: CategoryScore[];
}

// ---- helpers ----
function collectStrings(v: any, out: string[] = []): string[] {
  if (typeof v === "string") out.push(v);
  else if (Array.isArray(v)) v.forEach((x) => collectStrings(x, out));
  else if (v && typeof v === "object") for (const [k, val] of Object.entries(v)) { if (k === "type") continue; collectStrings(val, out); }
  return out;
}
function countImages(sections: any[]): { total: number; withAlt: number } {
  let total = 0, withAlt = 0;
  const walk = (v: any) => {
    if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === "object") {
      const hasSrc = typeof v.src === "string" || typeof v.image === "string" || typeof v.imageUrl === "string";
      if (hasSrc) { total++; if (typeof v.alt === "string" && v.alt.trim()) withAlt++; }
      for (const val of Object.values(v)) walk(val);
    }
  };
  walk(sections);
  return { total, withAlt };
}
function countLinks(sections: any[]): number {
  let n = 0;
  const walk = (v: any) => {
    if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === "object") {
      if (typeof v.href === "string" && v.href.length > 1) n++;
      if (v.cta && typeof v.cta.href === "string") n++;
      for (const val of Object.values(v)) walk(val);
    }
  };
  walk(sections);
  return n;
}
const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

export function scoreSeo(input: SeoInput): SeoReport {
  const sections = Array.isArray(input.sections) ? input.sections : [];
  const text = collectStrings(sections).join(" ");
  const words = text.split(/\s+/).filter(Boolean).length;
  const kw = (input.focusKeyword ?? "").trim().toLowerCase();
  const cats: CategoryScore[] = [];

  // Content
  {
    const tips: string[] = [];
    let s = 0;
    if ((input.title ?? "").length >= 10) s += 25; else tips.push("Add a clear, descriptive page title (10+ chars).");
    if ((input.description ?? "").length >= 50) s += 25; else tips.push("Write a meta description (50–160 chars).");
    if (sections.some((x) => x?.type === "hero")) s += 20; else tips.push("Lead with a hero (a single clear H1).");
    if (words >= 120) s += 30; else tips.push(`Add more content (${words} words; aim for 120+) — AI engines reward substance.`);
    cats.push({ key: "content", label: "Content", score: clamp(s), tips });
  }
  // Keywords
  {
    const tips: string[] = [];
    if (!kw) { cats.push({ key: "keywords", label: "Keywords", score: 0, tips: ["Set a focus keyword to check coverage."] }); }
    else {
      let s = 0;
      if ((input.title ?? "").toLowerCase().includes(kw)) s += 40; else tips.push("Use the focus keyword in the title.");
      if ((input.description ?? "").toLowerCase().includes(kw)) s += 30; else tips.push("Use the focus keyword in the description.");
      if (text.toLowerCase().includes(kw)) s += 30; else tips.push("Mention the focus keyword in the page content.");
      cats.push({ key: "keywords", label: "Keywords", score: clamp(s), tips });
    }
  }
  // Author (E-E-A-T / GEO authorship)
  cats.push((input.author ?? "").trim()
    ? { key: "author", label: "Author", score: 100, tips: [] }
    : { key: "author", label: "Author", score: 0, tips: ["Add an author — AI engines weight authorship & expertise."] });
  // Images
  {
    const { total, withAlt } = countImages(sections);
    if (total === 0) cats.push({ key: "images", label: "Images", score: 60, tips: ["No images detected — visuals improve engagement."] });
    else { const pct = (withAlt / total) * 100; cats.push({ key: "images", label: "Images", score: clamp(pct), tips: withAlt < total ? [`${total - withAlt} image(s) missing alt text (accessibility + SEO).`] : [] }); }
  }
  // Links & tags
  {
    const tips: string[] = []; let s = 0;
    const links = countLinks(sections);
    if (links >= 2) s += 60; else tips.push("Add internal links / CTAs to guide visitors and crawlers.");
    if ((input.canonical ?? "").length) s += 40; else tips.push("Set a canonical URL to avoid duplicate-content issues.");
    cats.push({ key: "links", label: "Links & tags", score: clamp(s), tips });
  }
  // Language
  cats.push((input.language ?? "").trim()
    ? { key: "language", label: "Language", score: 100, tips: [] }
    : { key: "language", label: "Language", score: 50, tips: ["Set the page language (helps international + AI parsing)."] });
  // Schema markup (big GEO signal)
  cats.push((input.schemaType ?? "").trim()
    ? { key: "schema", label: "Schema markup", score: 100, tips: [] }
    : { key: "schema", label: "Schema markup", score: 0, tips: ["Add structured data (e.g. LocalBusiness) — critical for AI answer engines."] });

  const overall = clamp(cats.reduce((a, c) => a + c.score, 0) / cats.length);
  return { overall, categories: cats };
}
