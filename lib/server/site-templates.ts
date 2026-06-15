import { createSupabaseServiceClient } from "@/lib/supabase/service";
import type { SectionContent } from "@/lib/sections/schemas";

/**
 * Site-template store (D-363..368). An industry site template = global header/footer chrome +
 * central menu + brand defaults + global social links + starter pages. Backed by
 * website_site_templates (migration 0074); seeded from REAL_ESTATE_SITE_TEMPLATES. The applier
 * (site-template-applier.ts) lays one onto a blank website.
 */

export interface SiteTemplateMenu { items: { label: string; link: { url: string } }[] }
export interface SiteTemplatePage { slug: string; title: string; seo_title?: string; seo_description?: string; isHome?: boolean; sections: SectionContent[] }
export interface SiteTemplate {
  id: string; name: string; industry: string; manifest: Record<string, unknown>;
  headerSections: SectionContent[]; footerSections: SectionContent[];
  menu: SiteTemplateMenu; pages: SiteTemplatePage[];
  brandDefaults: Record<string, string>; socialLinks: Record<string, string>; status: string;
}

const svc = () => createSupabaseServiceClient();
const missingTable = (m?: string) => /relation .* does not exist|Could not find the table/i.test(m ?? "");
const rowTo = (r: any): SiteTemplate => ({
  id: r.id, name: r.name, industry: r.industry, manifest: r.manifest ?? {},
  headerSections: Array.isArray(r.header_sections) ? r.header_sections : [],
  footerSections: Array.isArray(r.footer_sections) ? r.footer_sections : [],
  menu: r.menu ?? { items: [] }, pages: Array.isArray(r.pages) ? r.pages : [],
  brandDefaults: r.brand_defaults ?? {}, socialLinks: r.social_links ?? {}, status: r.status ?? "active",
});

export async function listSiteTemplates(industry?: string): Promise<SiteTemplate[]> {
  let q = svc().from("website_site_templates").select("*").eq("status", "active").order("industry").order("name");
  if (industry) q = q.eq("industry", industry);
  const { data, error } = await q;
  if (error) return [];
  return (data ?? []).map(rowTo);
}

export async function getSiteTemplate(id: string): Promise<SiteTemplate | null> {
  const { data } = await svc().from("website_site_templates").select("*").eq("id", id).maybeSingle();
  return data ? rowTo(data) : null;
}

/** Idempotent seed from REAL_ESTATE_SITE_TEMPLATES (upsert on industry+name). */
export async function seedSiteTemplates(): Promise<{ inserted: number; error?: string }> {
  const { REAL_ESTATE_SITE_TEMPLATES } = await import("@/lib/sections/prebuilt-templates");
  let inserted = 0;
  for (const t of REAL_ESTATE_SITE_TEMPLATES) {
    const row = {
      name: t.name, industry: t.industry, manifest: t.manifest,
      header_sections: [t.header], footer_sections: [t.footer], menu: t.menu, pages: t.pages,
      brand_defaults: t.brand, social_links: t.social, status: "active", updated_at: new Date().toISOString(),
    };
    const { error } = await svc().from("website_site_templates").upsert(row, { onConflict: "industry,name" });
    if (error) return { inserted, error: missingTable(error.message) ? "Run migration 0074_site_templates.sql first." : error.message };
    inserted++;
  }
  return { inserted };
}
