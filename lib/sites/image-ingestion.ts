/**
 * Build-time image ingestion pass (architect D-133/134). Walks generated section content,
 * pulls every external image URL into the tenant's Media Library (durable + reusable), and
 * rewrites the content to the stored URLs. Optionally AI-generates a hero background when one
 * is missing (capped + env/tenant-gated). Drafts-only; idempotent on re-run.
 *
 * Operates on OUR real section shapes:
 *   - hero.backgroundImageUrl
 *   - gallery.images[].url
 *   - image.url   (type:"image")
 *   - _style.bgImage   (ElementStyle background)
 *   - row.children[][]  (recurse into nested blocks)
 */

import { ingestExternalImage } from "@/lib/media/ingest";

export interface IngestPassOptions {
  websiteId?: string | null;
  /** Shared mutable budget for AI hero generation across a multi-page build (e.g. {left:3}). */
  aiBudget?: { left: number };
  /** Profile hints for the AI hero prompt. */
  profile?: { businessName?: string; industry?: string; tone?: string };
}

type Content = Record<string, any>;

/** Collect every external image URL in a section content tree. */
function collectUrls(c: Content, out: Set<string>): void {
  if (!c || typeof c !== "object") return;
  if (typeof c.backgroundImageUrl === "string") out.add(c.backgroundImageUrl);
  if (c.type === "image" && typeof c.url === "string") out.add(c.url);
  if (c.type === "gallery" && Array.isArray(c.images)) for (const im of c.images) if (im && typeof im.url === "string") out.add(im.url);
  if (c.type === "logos" && Array.isArray(c.images)) for (const im of c.images) if (im && typeof im.url === "string") out.add(im.url);
  const st = c._style;
  if (st && typeof st.bgImage === "string") out.add(st.bgImage);
  // Rows: children is an array of columns, each an array of block contents.
  if (c.type === "row" && Array.isArray(c.children)) for (const col of c.children) if (Array.isArray(col)) for (const b of col) collectUrls(b, out);
}

/** Rewrite external URLs in a content tree using the map (returns a new object). */
function rewrite(c: Content, map: Map<string, string>): Content {
  if (!c || typeof c !== "object") return c;
  const out: Content = Array.isArray(c) ? [...c] : { ...c };
  const sub = (u: any) => (typeof u === "string" && map.has(u) ? map.get(u)! : u);
  if (typeof out.backgroundImageUrl === "string") out.backgroundImageUrl = sub(out.backgroundImageUrl);
  if (out.type === "image" && typeof out.url === "string") out.url = sub(out.url);
  if ((out.type === "gallery" || out.type === "logos") && Array.isArray(out.images)) out.images = out.images.map((im: any) => (im && typeof im.url === "string" ? { ...im, url: sub(im.url) } : im));
  if (out._style && typeof out._style.bgImage === "string") out._style = { ...out._style, bgImage: sub(out._style.bgImage) };
  if (out.type === "row" && Array.isArray(out.children)) out.children = out.children.map((col: any) => (Array.isArray(col) ? col.map((b: any) => rewrite(b, map)) : col));
  return out;
}

/**
 * Ingest + rewrite all images in a page's sections. Best-effort: any single failure leaves the
 * original URL untouched. Returns a new sections array (input not mutated).
 */
export async function ingestSectionImages(
  tenantId: string,
  sections: Content[],
  opts: IngestPassOptions = {},
): Promise<Content[]> {
  if (!Array.isArray(sections) || !sections.length) return sections;

  // 1. Collect unique external URLs.
  const urls = new Set<string>();
  for (const s of sections) collectUrls(s, urls);

  // 2. Ingest in parallel, build the rewrite map.
  const map = new Map<string, string>();
  await Promise.all(Array.from(urls).map(async (u) => {
    const r = await ingestExternalImage(tenantId, u, { websiteId: opts.websiteId, sourceType: "external_url" });
    if (r) map.set(u, r.url);
  }));

  // 3. Optional: AI-generate a hero background when missing (capped + gated).
  let out = sections.map((s) => rewrite(s, map));
  if (opts.aiBudget && opts.aiBudget.left > 0) {
    try {
      const { imagenGenerateAndImport, imageGenEnabled } = await import("@/lib/ai/generateAiImages");
      if (imageGenEnabled()) {
        for (let i = 0; i < out.length && opts.aiBudget.left > 0; i++) {
          const s = out[i];
          if (s?.type === "hero" && !s.backgroundImageUrl) {
            const p = opts.profile || {};
            const prompt = `Elegant, contemporary hero background photo for a ${p.industry || "professional"} business${p.businessName ? ` (${p.businessName})` : ""}. ${p.tone || "Refined, understated"}. No text, no logos, soft depth of field.`;
            const gen = await imagenGenerateAndImport(tenantId, prompt, { count: 1, aspectRatio: "16:9", namePrefix: "AI hero" });
            const url = gen.images?.[0]?.url;
            if (url) {
              out[i] = { ...s, backgroundImageUrl: url };
              opts.aiBudget.left -= 1;
              try { const { recordAiUsage } = await import("@/app/tenants/[tenantId]/website/actions"); await recordAiUsage(tenantId, "image_generation", 1, { context: "build_hero" }); } catch { /* metering best-effort */ }
            }
          }
        }
      }
    } catch { /* generation unavailable → keep as-is */ }
  }
  return out;
}
