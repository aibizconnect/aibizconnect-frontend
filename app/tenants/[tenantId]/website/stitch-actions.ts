"use server";

/**
 * Stitch → our framework glue (Ali's pipeline: wizard idea → Stitch design → editable sections).
 *
 * Takes the HTML a Stitch screen exports and decomposes it into our EXISTING section model via
 * htmlToSections (h1-h6→heading, p→text, a/button→button, img→image/gallery, grids→row/columns,
 * forms→contact-form, with captured typography) — so the design lands INTACT but fully
 * SEGMENTED and every element is editable in our builder. Drafts-only, tenant/website scoped.
 */

import { requireTenantAccess } from "@/lib/auth/tenant-access";
import { htmlToSections } from "@/lib/sites/html-importer";
import { renderHtmlToDom } from "@/lib/sites/site-clone";
import { ingestSectionImages } from "@/lib/sites/image-ingestion";
import { sectionSchema } from "@/lib/sections/schemas";
import { createPage, saveDraft } from "./actions";

export interface ImportHtmlResult {
  ok: boolean;
  pageId?: string;
  slug?: string;
  sectionCount?: number;
  droppedCount?: number;
  /** "high" when computed styles were captured (render bridge); "low" when we imported raw markup
   *  with no resolvable styling — UI should warn + offer re-capture (architect D-146/D-144). */
  fidelity?: "high" | "low";
  imagesIngested?: number;
  message?: string;
}

const slugify = (s: string) =>
  (s || "page").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "page";

/**
 * Decompose HTML → editable sections and create a DRAFT page from them.
 * `baseUrl` is used to absolutize relative image/link URLs in the source HTML.
 */
export async function importHtmlAsDraftPage(
  tenantId: string,
  websiteId: string,
  html: string,
  title: string,
  opts?: { baseUrl?: string; isHome?: boolean },
): Promise<ImportHtmlResult> {
  await requireTenantAccess(tenantId);
  if (!html || html.length < 40) return { ok: false, message: "Empty/too-small HTML." };

  // FIDELITY (architect D-146): pasted markup carries utility/inline CLASSES but no resolved
  // computed styles. Render it in a real browser (render bridge) so those classes resolve to true
  // padding/spacing/color/typography annotated as data-cs — then decompose. If no bridge is
  // configured (or it fails), fall back to the raw markup and flag the page low-fidelity so the
  // user can re-capture instead of silently shipping unstyled primitives.
  let working = html;
  let fidelity: "high" | "low" = "low";
  if (html.includes("data-cs")) {
    fidelity = "high"; // already annotated (e.g. came from a URL capture)
  } else {
    const rendered = await renderHtmlToDom(html);
    if (rendered) { working = rendered; fidelity = "high"; }
  }

  let raw: Record<string, unknown>[];
  try {
    // Faithful mode: keep the design's real structure/order as editable primitives instead of
    // collapsing the first section into our composite hero template.
    raw = htmlToSections(working, opts?.baseUrl || "https://stitch.local", { faithful: true });
  } catch (e: any) {
    return { ok: false, message: `Decompose failed: ${e?.message ?? e}` };
  }
  // Keep only sections our renderer can validate (each remains fully editable).
  let sections = raw.filter((s) => sectionSchema.safeParse(s).success);
  const dropped = raw.length - sections.length;
  if (!sections.length) return { ok: false, fidelity, message: "No renderable sections produced.", droppedCount: dropped };

  // P1 (architect D-148): pull every imported image (img/gallery/hero bg/_style bg/row children)
  // into the tenant Media Library so the page owns durable, reusable copies instead of hotlinks
  // that rot. Best-effort: any single failure leaves that URL untouched.
  let imagesIngested = 0;
  try {
    const before = JSON.stringify(sections);
    const ingested = await ingestSectionImages(tenantId, sections as any, { websiteId });
    sections = ingested as any;
    if (JSON.stringify(sections) !== before) imagesIngested = 1; // at least one URL was rewritten
  } catch { /* keep original URLs */ }

  const slug = slugify(title);
  let page: { id: string };
  try {
    page = await createPage(tenantId, { title, slug, isHome: !!opts?.isHome, websiteId });
  } catch {
    page = await createPage(tenantId, { title, slug: `${slug}-${websiteId.slice(0, 8)}`, isHome: !!opts?.isHome, websiteId });
  }
  await saveDraft(page.id, tenantId, { draft_sections: sections as any });

  return { ok: true, pageId: page.id, slug, sectionCount: sections.length, droppedCount: dropped, fidelity, imagesIngested };
}
