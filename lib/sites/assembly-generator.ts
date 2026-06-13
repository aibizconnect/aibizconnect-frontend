import { PREBUILT_TEMPLATES } from "@/lib/sections/prebuilt-templates";
import { sectionSchema, type SectionContent } from "@/lib/sections/schemas";
import { llm, stripFences } from "@/lib/agent/llm";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

/**
 * DIRECT-ASSEMBLY website generator (D-292..296 — the Relume model, native to us).
 *
 * Builds beautiful, FULLY-EDITABLE pages by ASSEMBLING from our own prebuilt section
 * library + writing real copy — straight into our section JSON. NO HTML, NO render
 * bridge, NO importer: lossless by construction, nothing to translate, nothing to drop.
 * ADDITIVE — does not touch the editor or importer (Ali's law).
 *
 * How it stays reliable (vs. asking an LLM to emit raw section JSON, which is fragile):
 *   1. The LLM only PICKS prebuilt sections (by id) and WRITES copy — two things LLMs do
 *      well. Structure, validity, and styling come from our curated, schema-valid prebuilts.
 *   2. Copy is applied by walking the prebuilt's text SLOTS and replacing them by path —
 *      deterministic, can't break structure.
 *   3. Brand colors are applied deterministically (the LLM never names a color).
 *   4. Every section is validated with sectionSchema before it ships.
 */

// ---- catalog the LLM picks from -------------------------------------------------
export interface CatalogEntry { id: string; name: string; category: string; blurb: string; slots: number }

const COPY_KEYS = new Set(["text", "label", "alt", "value", "suffix", "title", "subtitle", "eyebrow", "question", "answer", "name", "role", "quote", "caption", "heading", "subheading"]);
const SKIP_VAL = (v: string) => !v || /^(https?:|\/|#|mailto:|tel:|data:|rgb|#[0-9a-fA-F])/.test(v) || v.length > 600;

/** Walk a section tree; collect every editable-copy string with its JSON path. */
function extractSlots(node: unknown, path: (string | number)[] = [], out: { path: (string | number)[]; key: string; text: string }[] = []): typeof out {
  if (Array.isArray(node)) { node.forEach((v, i) => extractSlots(v, [...path, i], out)); return out; }
  if (node && typeof node === "object") {
    for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
      if (typeof v === "string" && COPY_KEYS.has(k) && !SKIP_VAL(v)) out.push({ path: [...path, k], key: k, text: v });
      else extractSlots(v, [...path, k], out);
    }
  }
  return out;
}

/** Set a value at a JSON path on a cloned tree. */
function setAtPath(root: any, path: (string | number)[], value: string): void {
  let cur = root;
  for (let i = 0; i < path.length - 1; i++) cur = cur[path[i]];
  cur[path[path.length - 1]] = value;
}

export function prebuiltCatalog(): CatalogEntry[] {
  return PREBUILT_TEMPLATES.map((t: any) => ({
    id: t.id, name: t.name, category: t.category, blurb: t.blurb ?? "",
    slots: t.sections.reduce((n: number, s: any) => n + extractSlots(s).length, 0),
  }));
}

// ---- inputs ---------------------------------------------------------------------
export interface AssemblyProfile {
  businessName: string; industry: string; tone?: string; audience?: string;
  services?: string; city?: string; country?: string;
  brandPrimary?: string; brandAccent?: string;
}
export interface PageSpec { slug: string; title: string; pageType: string }
export interface SitemapPlan { pages: PageSpec[] }

const DEFAULT_PAGES: PageSpec[] = [
  { slug: "home", title: "Home", pageType: "home" },
  { slug: "about", title: "About", pageType: "about" },
  { slug: "services", title: "Services", pageType: "services" },
  { slug: "contact", title: "Contact", pageType: "contact" },
];

// ---- step 1: sitemap ------------------------------------------------------------
export async function planSitemap(profile: AssemblyProfile, tenantId?: string): Promise<SitemapPlan> {
  const raw = await llm.complete({
    system: `You plan a small-business marketing website's SITEMAP. Output ONE JSON object: {"pages":[{"slug","title","pageType"}]}. pageType ∈ home|about|services|product|pricing|contact. 4–6 pages, "home" first. Slugs are lowercase-kebab. No prose.`,
    user: `Business: ${profile.businessName} — ${profile.industry}. ${profile.services ? `Services: ${profile.services}.` : ""} ${profile.audience ? `Audience: ${profile.audience}.` : ""}`,
    jsonObject: true, temperature: 0.3,
  }, tenantId);
  try {
    const j = JSON.parse(stripFences(raw ?? "{}"));
    if (Array.isArray(j.pages) && j.pages.length) {
      const pages = j.pages.slice(0, 6).map((p: any) => ({ slug: String(p.slug || "page").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""), title: String(p.title || "Page"), pageType: String(p.pageType || "home") }));
      if (!pages.some((p: PageSpec) => p.slug === "home")) pages.unshift(DEFAULT_PAGES[0]);
      return { pages };
    }
  } catch { /* fall through */ }
  return { pages: DEFAULT_PAGES };
}

// ---- per-page-type prebuilt shortlists (LLM picks within these) -----------------
const SECTION_FLOW: Record<string, string[]> = {
  home: ["Headers", "Hero", "Content", "Social Proof", "Conversion", "Footers"],
  about: ["Headers", "Hero", "Split / Photo", "Content", "Social Proof", "Conversion", "Footers"],
  services: ["Headers", "Hero", "Content", "Conversion", "Footers"],
  product: ["Headers", "Hero", "Content", "Social Proof", "Conversion", "Footers"],
  pricing: ["Headers", "Hero", "Conversion", "Content", "Footers"],
  contact: ["Headers", "Hero", "Content", "Footers"],
};

// ---- step 2: assemble one page --------------------------------------------------
export async function assemblePage(profile: AssemblyProfile, page: PageSpec, tenantId?: string): Promise<SectionContent[]> {
  const catalog = prebuiltCatalog();
  const flow = SECTION_FLOW[page.pageType] ?? SECTION_FLOW.home;
  const byCat = (cat: string) => catalog.filter((c) => c.category === cat);

  // 2a. LLM picks an ordered list of prebuilt ids that fit this page, one per band.
  const menu = flow.map((cat) => `${cat}: ${byCat(cat).map((c) => `${c.id} (${c.name})`).join(", ") || "—"}`).join("\n");
  const pickRaw = await llm.complete({
    system: `You assemble a "${page.pageType}" page for a business website by choosing prebuilt SECTIONS, in top-to-bottom order. Pick ONE section id per row from the menu, following this category flow: ${flow.join(" → ")}. Use 5–8 sections total. Prefer variety and a strong narrative (hook → value → proof → action). Output ONE JSON object: {"sections":["<id>","<id>",...]}. Only ids from the menu. No prose.`,
    user: `Business: ${profile.businessName} — ${profile.industry}. Page: ${page.title}.\nMENU:\n${menu}`,
    jsonObject: true, temperature: 0.4,
  }, tenantId);

  let ids: string[] = [];
  try { const j = JSON.parse(stripFences(pickRaw ?? "{}")); if (Array.isArray(j.sections)) ids = j.sections.map(String); } catch { /* */ }
  ids = ids.filter((id) => catalog.some((c) => c.id === id));
  if (ids.length < 3) {
    // deterministic fallback: one section per category in the flow
    ids = flow.map((cat) => byCat(cat)[0]?.id).filter(Boolean) as string[];
  }

  // 2b. Clone the chosen prebuilts; collect every copy slot across the whole page.
  const chosen = ids.map((id) => PREBUILT_TEMPLATES.find((t: any) => t.id === id)).filter(Boolean) as any[];
  const pageSections: any[] = chosen.flatMap((t) => JSON.parse(JSON.stringify(t.sections)));
  const manifest: { id: string; sec: number; role: string; current: string; path: (string | number)[] }[] = [];
  pageSections.forEach((sec, si) => {
    extractSlots(sec).forEach((s, idx) => manifest.push({ id: `${si}.${idx}`, sec: si, role: s.key, current: s.text, path: s.path }));
  });

  // 2c. ONE whole-page copy pass (Relume Copywriting-1.5 coherence). Grounded, no lorem.
  const slotsForLlm = manifest.map((m) => ({ id: m.id, role: m.role, current: m.current.slice(0, 120) }));
  const copyRaw = await llm.complete({
    system: `You write REAL website copy for the business below. You are given content SLOTS (id, role, current sample text). Rewrite EVERY slot to fit the business, page, and the slot's role/length. Rules: specific and benefit-led, never Lorem Ipsum or "[placeholder]"; match the approximate LENGTH of the current sample; for testimonial/quote/name roles write realistic SAMPLE social proof (no real awards, numbers, or named clients claimed as fact); keep headings punchy and buttons 2–4 words. Output ONE JSON object: {"<id>":"<new text>", ...} covering EVERY id. No prose.`,
    user: `Business: ${profile.businessName} — ${profile.industry}. ${profile.services ? `Services: ${profile.services}.` : ""} ${profile.audience ? `Audience: ${profile.audience}.` : ""} ${profile.city ? `Location: ${profile.city}.` : ""} Tone: ${profile.tone ?? "professional, confident"}. Page: ${page.title} (${page.pageType}).\nSLOTS:\n${JSON.stringify(slotsForLlm)}`,
    jsonObject: true, temperature: 0.6,
  }, tenantId);

  let copy: Record<string, string> = {};
  try { copy = JSON.parse(stripFences(copyRaw ?? "{}")); } catch { /* keep samples */ }

  // 2d. Apply copy by path (deterministic; structure untouched).
  for (const m of manifest) {
    const v = copy[m.id];
    if (typeof v === "string" && v.trim() && !/lorem|\[placeholder\]/i.test(v)) setAtPath(pageSections[m.sec], m.path, v.trim());
  }

  // 2e. Brand colors (deterministic — the LLM never named a color).
  applyBrand(pageSections, profile);

  // 2f. Contrast repair (deterministic self-heal): flip any text that would be invisible
  // against its band background to white/ink — guarantees the Inspector contrast guard
  // passes even when a source prebuilt shipped a low-contrast color (D-293 repair).
  pageSections.forEach((s) => fixContrast(s));

  // 2g. Validate; drop anything that somehow fails (keeps the page shippable).
  return pageSections.filter((s) => sectionSchema.safeParse(s).success) as SectionContent[];
}

// ---- deterministic contrast repair ----------------------------------------------
function lum(hex: string): number | null {
  const h = /^#([0-9a-f]{6})$/i.exec(hex.length === 4 ? "#" + hex.slice(1).split("").map((c) => c + c).join("") : hex);
  if (!h) return null;
  const [r, g, b] = [0, 2, 4].map((i) => { const c = parseInt(h[1].slice(i, i + 2), 16) / 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
const firstHex = (bg: unknown): string | null => {
  if (typeof bg !== "string") return null;
  const m = bg.match(/#[0-9a-fA-F]{6}/);
  return m ? m[0] : null;
};
const ratio = (a: number, b: number) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);

function fixContrast(node: unknown, bandBg = "#ffffff"): void {
  if (Array.isArray(node)) { node.forEach((n) => fixContrast(n, bandBg)); return; }
  if (!node || typeof node !== "object") return;
  const o = node as Record<string, any>;
  const ownBg = firstHex(o._style?.bg) ?? (o.type === "button" ? firstHex(o.bgColor) : null);
  const bg = ownBg ?? bandBg;
  const bgLum = lum(bg) ?? 1;
  for (const k of ["color", "textColor"]) {
    const fg = o[k];
    if (typeof fg === "string" && /^#[0-9a-fA-F]{6}$/.test(fg)) {
      const fl = lum(fg);
      // Skip decorative watermark numerals (huge font) — they're meant to be faint.
      if (fl != null && ratio(fl, bgLum) < 2 && !(Number(o.fontSize) >= 40 && String(o.text ?? "").trim().length <= 4)) {
        o[k] = bgLum < 0.4 ? "#ffffff" : "#0f172a";
      }
    }
  }
  for (const [k, v] of Object.entries(o)) if (k !== "_style") fixContrast(v, bg);
}

// ---- deterministic brand recolor ------------------------------------------------
// The prebuilts are already designed with correct CONTRAST. So we touch ONLY the
// safe surfaces: solid buttons adopt the brand primary (with white text), and the
// overall palette comes from the site's theme/brand row via the renderer. We never
// recolor backgrounds or text (that would break the prebuilt's designed contrast —
// the lesson from v1's text-invisible regressions).
function applyBrand(sections: any[], profile: AssemblyProfile): void {
  const primary = /^#[0-9a-fA-F]{6}$/.test(profile.brandPrimary || "") ? profile.brandPrimary! : null;
  if (!primary) return;
  const walk = (node: unknown): void => {
    if (Array.isArray(node)) { node.forEach(walk); return; }
    if (node && typeof node === "object") {
      const o = node as Record<string, unknown>;
      if (o.type === "button" && o.variant !== "outline" && o.variant !== "ghost") {
        o.bgColor = primary; o.textColor = "#ffffff"; // solid CTA on brand, guaranteed contrast
      }
      for (const v of Object.values(o)) walk(v);
    }
  };
  sections.forEach(walk);
}

// ---- SEO + orchestrator ---------------------------------------------------------
/** A clean 50–160 char meta description (deterministic — no fabricated claims). */
function metaDescription(profile: AssemblyProfile, page: PageSpec): string {
  const base = `${profile.businessName} — ${profile.industry}.`;
  const extra = page.pageType === "contact" ? " Get in touch to get started."
    : page.pageType === "pricing" ? " Simple, transparent pricing."
    : profile.services ? ` ${profile.services}.` : " Learn more about what we do.";
  return `${base}${extra}`.replace(/\s+/g, " ").trim().slice(0, 160);
}

export interface GeneratedPage { slug: string; title: string; sections: SectionContent[]; seoDescription: string }

/**
 * Full website from a brief: plan the sitemap, assemble every page from the prebuilt
 * library, persist as draft pages. Lossless (no import). Returns what it built.
 * ADDITIVE — creates pages on the given website; never touches the editor/importer.
 */
export async function generateWebsiteFromBrief(
  tenantId: string,
  websiteId: string,
  profile: AssemblyProfile,
): Promise<{ ok: boolean; pages: GeneratedPage[]; errors: string[] }> {
  const errors: string[] = [];
  const sitemap = await planSitemap(profile, tenantId);
  const built: GeneratedPage[] = [];
  const sb = createSupabaseServiceClient();
  let order = 0;
  for (const page of sitemap.pages) {
    try {
      const sections = await assemblePage(profile, page, tenantId);
      if (!sections.length) { errors.push(`${page.slug}: produced no sections`); continue; }
      const seoDescription = metaDescription(profile, page);
      const row = {
        tenant_id: tenantId, website_id: websiteId, title: page.title, slug: page.slug,
        is_home: page.slug === "home", is_public: false, order_index: order++,
        draft_sections: sections, draft_seo: { seo_title: `${page.title} — ${profile.businessName}`, seo_description: seoDescription },
      };
      const { data: ex } = await sb.from("website_pages").select("id").eq("tenant_id", tenantId).eq("website_id", websiteId).eq("slug", page.slug).maybeSingle();
      if (ex) await sb.from("website_pages").update(row).eq("id", (ex as any).id);
      else await sb.from("website_pages").insert(row);
      built.push({ slug: page.slug, title: page.title, sections, seoDescription });
    } catch (e) { errors.push(`${page.slug}: ${(e as Error).message}`); }
  }
  return { ok: built.length > 0, pages: built, errors };
}
