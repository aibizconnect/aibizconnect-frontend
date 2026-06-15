import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { getSiteTemplate } from "./site-templates";
import { createPage, saveDraft, publishPage, setWebsiteChrome, updateBrandColumns, ensureBrandRow } from "@/app/tenants/[tenantId]/website/actions";

/**
 * Site-Template Applier (D-364, Gemini ruled + Copilot ratified). Lays an industry site template
 * onto a website: brand → central menu/social → global header/footer chrome → starter pages.
 * NON-DESTRUCTIVE: fresh mode refuses to run on a website that already has content (no clobber).
 */

export interface ApplyOptions { mode?: "fresh" | "merge" | "replace" }
export interface ApplyReport { ok: boolean; message: string; pagesCreated: number; errors: string[] }

const svc = () => createSupabaseServiceClient();
const msg = (e: unknown) => (e as any)?.message ?? String(e);

/** A website is "blank" when it has no pages, or only unpublished pages with no real draft content. */
export async function isWebsiteBlank(tenantId: string, websiteId: string): Promise<boolean> {
  const sb = svc();
  const { data, error } = await sb.from("website_pages").select("is_public, draft_title, draft_sections").eq("tenant_id", tenantId).eq("website_id", websiteId);
  if (error) return true; // pre-0016 / no rows
  const pages = data ?? [];
  if (pages.length === 0) return true;
  for (const p of pages) {
    if (p.is_public) return false;                                   // a published page → not blank
    if (p.draft_title) return false;
    if (Array.isArray(p.draft_sections) && p.draft_sections.length > 1) return false; // real edited content
  }
  return true;
}

async function setBrandMenuSocial(tenantId: string, websiteId: string, menu: unknown, social: unknown): Promise<void> {
  await svc().from("website_brand_settings").update({ menu, social_links: social, updated_at: new Date().toISOString() }).eq("tenant_id", tenantId).eq("website_id", websiteId);
}

export async function applySiteTemplate(tenantId: string, websiteId: string, templateId: string, opts: ApplyOptions = {}): Promise<ApplyReport> {
  const mode = opts.mode ?? "fresh";
  const t = await getSiteTemplate(templateId);
  if (!t) return { ok: false, message: "Site template not found.", pagesCreated: 0, errors: [] };
  if (mode === "fresh" && !(await isWebsiteBlank(tenantId, websiteId))) {
    return { ok: false, message: "Fresh mode needs a blank website — this one already has content. Create a new website (or empty this one) first.", pagesCreated: 0, errors: [] };
  }

  const errors: string[] = [];

  // Replace mode (D-364): wipe the website's existing pages (cascade clears sections + block refs),
  // then rebuild from the template. Keeps the website row + domain. Used to fix an AI/blank build.
  if (mode === "replace") {
    const { data: existing } = await svc().from("website_pages").select("id").eq("tenant_id", tenantId).eq("website_id", websiteId);
    const ids = (existing ?? []).map((p: any) => p.id);
    if (ids.length) {
      const { error } = await svc().from("website_pages").delete().in("id", ids);
      if (error) errors.push(`clear: ${error.message}`);
    }
  }

  // 1) Brand defaults + central menu + global social (D-365/D-366)
  try {
    await ensureBrandRow(tenantId, websiteId);
    await updateBrandColumns(tenantId, t.brandDefaults as any, websiteId);
    await setBrandMenuSocial(tenantId, websiteId, t.menu, t.socialLinks);
  } catch (e) { errors.push(`brand: ${msg(e)}`); }

  // 2) Global header + footer chrome (a single row each)
  try {
    await setWebsiteChrome(tenantId, websiteId, t.name, t.headerSections[0], t.footerSections[0]);
  } catch (e) { errors.push(`chrome: ${msg(e)}`); }

  // 3) Starter pages (create → fill draft → publish)
  let pagesCreated = 0;
  for (const page of t.pages) {
    try {
      const p = await createPage(tenantId, { title: page.title, slug: page.slug, isHome: !!page.isHome, websiteId });
      await saveDraft(p.id, tenantId, {
        draft_sections: page.sections,
        draft_title: page.title,
        draft_seo: { seo_title: page.seo_title ?? page.title, seo_description: page.seo_description ?? "" },
      });
      await publishPage(p.id, tenantId);
      pagesCreated++;
    } catch (e) { errors.push(`page ${page.slug}: ${msg(e)}`); }
  }

  return {
    ok: errors.length === 0,
    message: errors.length ? `Applied "${t.name}" with ${errors.length} issue(s).` : `Applied "${t.name}" — ${pagesCreated} page(s) created.`,
    pagesCreated, errors,
  };
}
