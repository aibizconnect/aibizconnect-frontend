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
import { SYSTEM_TENANT_ID } from "@/lib/media/system";

export interface IngestPassOptions {
  websiteId?: string | null;
  /** Shared mutable budget for AI hero generation across a multi-page build (e.g. {left:3}). */
  aiBudget?: { left: number };
  /** Profile hints for the AI hero prompt. */
  profile?: { businessName?: string; industry?: string; tone?: string };
}

type Content = Record<string, any>;

/** Collect external image URLs in a content tree, tagging each with its section context. */
function collectUrls(c: Content, ctx: string[], out: Map<string, Set<string>>): void {
  if (!c || typeof c !== "object") return;
  const tagsFor = (kind: string) => [...ctx, kind];
  const add = (url: any, kind: string) => {
    if (typeof url !== "string" || !url) return;
    if (!out.has(url)) out.set(url, new Set());
    for (const t of tagsFor(kind)) if (t) out.get(url)!.add(t.toLowerCase());
  };
  if (typeof c.backgroundImageUrl === "string") add(c.backgroundImageUrl, "background");
  if (c.type === "image") add(c.url, "image");
  if (c.type === "gallery" && Array.isArray(c.images)) for (const im of c.images) if (im) add(im.url, "gallery");
  if (c.type === "logos" && Array.isArray(c.images)) for (const im of c.images) if (im) add(im.url, "logo");
  if (c._style && typeof c._style.bgImage === "string") add(c._style.bgImage, "background");
  if (c.type === "row" && Array.isArray(c.children)) for (const col of c.children) if (Array.isArray(col)) for (const b of col) collectUrls(b, ctx, out);
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

  // 1. Collect unique external URLs, each tagged with its section type + industry for search.
  const urlTags = new Map<string, Set<string>>();
  const industry = opts.profile?.industry;
  for (const s of sections) {
    const ctx = [s?.type, industry, "website"].filter(Boolean) as string[];
    collectUrls(s, ctx, urlTags);
  }

  // 2. Ingest in parallel, build the rewrite map.
  const map = new Map<string, string>();
  await Promise.all(Array.from(urlTags.entries()).map(async ([u, tags]) => {
    const r = await ingestExternalImage(tenantId, u, { websiteId: opts.websiteId, sourceType: "external_url", tags: [...tags] });
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
            // Ownership rule (Ali): the PLATFORM pays for AI generation, so the image is OURS —
            // store it in the SYSTEM library (read-by-all, copy-on-use). The tenant page just
            // references the public system URL. Usage is still metered to the triggering tenant.
            const gen = await imagenGenerateAndImport(SYSTEM_TENANT_ID, prompt, { count: 1, aspectRatio: "16:9", namePrefix: "AI hero" });
            const sysImg = gen.images?.[0];
            if (sysImg?.url) {
              opts.aiBudget.left -= 1;
              // Copy-on-use: the tenant ALSO gets their own copy (Ali). Reference the tenant
              // copy on the page so it's theirs/editable; the SYSTEM original stays the reusable
              // master. Fall back to the system URL if the copy fails.
              let useUrl = sysImg.url;
              try {
                const { importSystemAssetToTenant } = await import("@/app/tenants/[tenantId]/website/actions");
                const copy = await importSystemAssetToTenant(tenantId, sysImg.id);
                if (copy?.url) useUrl = copy.url;
              } catch { /* keep system url */ }
              out[i] = { ...s, backgroundImageUrl: useUrl };
              try { const { recordAiUsage } = await import("@/app/tenants/[tenantId]/website/actions"); await recordAiUsage(tenantId, "image_generation", 1, { context: "build_hero", ownedBy: "system" }); } catch { /* metering best-effort */ }
            }
          }
        }
      }
    } catch { /* generation unavailable → keep as-is */ }
  }
  return out;
}
