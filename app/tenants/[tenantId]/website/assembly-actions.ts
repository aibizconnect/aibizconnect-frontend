"use server";

import { requireTenantAccess } from "@/lib/auth/tenant-access";
import { generateWebsiteFromBrief, assemblePage, planSitemap, type AssemblyProfile } from "@/lib/sites/assembly-generator";

/**
 * Direct-assembly generator actions (D-292..296). ADDITIVE — a new generation path that
 * builds pages by assembling our prebuilt library + writing copy, straight into section
 * JSON (lossless, no importer). The existing Stitch/import path is untouched. No UI yet;
 * these are the wireable entry points (a "Generate with AI" button can call them later).
 */

export async function generateAssembledSiteAction(
  tenantId: string,
  websiteId: string,
  profile: AssemblyProfile,
): Promise<{ ok: boolean; pages: { slug: string; title: string }[]; errors: string[] }> {
  await requireTenantAccess(tenantId);
  const r = await generateWebsiteFromBrief(tenantId, websiteId, profile);
  return { ok: r.ok, pages: r.pages.map((p) => ({ slug: p.slug, title: p.title })), errors: r.errors };
}

/** Assemble (or re-assemble) a single page — for "regenerate this page" later. */
export async function assemblePageAction(
  tenantId: string,
  profile: AssemblyProfile,
  page: { slug: string; title: string; pageType: string },
): Promise<{ ok: boolean; sections: unknown[]; message?: string }> {
  await requireTenantAccess(tenantId);
  try {
    const sections = await assemblePage(profile, page, tenantId);
    return { ok: sections.length > 0, sections };
  } catch (e) { return { ok: false, sections: [], message: (e as Error).message }; }
}

export async function planSitemapAction(tenantId: string, profile: AssemblyProfile): Promise<{ pages: { slug: string; title: string; pageType: string }[] }> {
  await requireTenantAccess(tenantId);
  return planSitemap(profile, tenantId);
}
