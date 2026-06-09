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
import { sectionSchema } from "@/lib/sections/schemas";
import { createPage, saveDraft } from "./actions";

export interface ImportHtmlResult {
  ok: boolean;
  pageId?: string;
  slug?: string;
  sectionCount?: number;
  droppedCount?: number;
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

  let raw: Record<string, unknown>[];
  try {
    raw = htmlToSections(html, opts?.baseUrl || "https://stitch.local");
  } catch (e: any) {
    return { ok: false, message: `Decompose failed: ${e?.message ?? e}` };
  }
  // Keep only sections our renderer can validate (each remains fully editable).
  const sections = raw.filter((s) => sectionSchema.safeParse(s).success);
  const dropped = raw.length - sections.length;
  if (!sections.length) return { ok: false, message: "No renderable sections produced.", droppedCount: dropped };

  const slug = slugify(title);
  let page: { id: string };
  try {
    page = await createPage(tenantId, { title, slug, isHome: !!opts?.isHome, websiteId });
  } catch {
    page = await createPage(tenantId, { title, slug: `${slug}-${websiteId.slice(0, 8)}`, isHome: !!opts?.isHome, websiteId });
  }
  await saveDraft(page.id, tenantId, { draft_sections: sections as any });

  return { ok: true, pageId: page.id, slug, sectionCount: sections.length, droppedCount: dropped };
}
