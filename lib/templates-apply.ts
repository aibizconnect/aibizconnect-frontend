import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { instantiateTemplate, pageToSectionContents, getIndustryTemplate, type IndustryTemplate } from "./design/templates";

/**
 * Start-from-Template ("one-click build my site"). Turns an industry template into a
 * tenant's DRAFT website: creates a website_pages row per template page with the
 * blueprint stored in draft_sections + draft SEO, and (optionally) seeds the tenant's
 * brand settings from the template's BrandHint.
 *
 * SAFETY (preserves Ali's rules):
 *   - Produces DRAFTS only. is_public stays false. NOTHING is published here.
 *   - The tenant still clicks publish/flip per page; that runs supervisedPublish, whose
 *     O-3 critic is a HARD gate. (Templates are pre-verified to pass it.)
 *   - Brand-token apply is per-tenant and only affects this tenant's own site.
 *   - No spend, no send, no DDL. Service-role write (agent context carries no RLS claim).
 */

function service(): SupabaseClient {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
}

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** The live IDX listings element (SiteListings weblet) — renders the tenant's real/sample MLS feed. */
const idxListingsSection = (heading: string): Record<string, any> => ({
  type: "listings", source: "idx", heading, count: 6, columns: 3, sort: "newest",
  showSort: true, showPagination: false, showFavorites: true, showBadges: true, showAttribution: true, showDisclaimer: true,
  ctaLabel: "View all listings →", filter: {},
});

/**
 * For real-estate sites, swap the template's static "Featured listings" gallery placeholder for the
 * LIVE IDX listings element so seeded sample listings (and later the real CREA feed) actually render.
 * Keeps the design-system component vocabulary clean — `listings(source:idx)` is injected here at
 * apply-time, not added to the template ComponentType set. No-op for non-real-estate templates.
 */
function injectLiveListings(templateKey: string, sections: Array<Record<string, any>>): Array<Record<string, any>> {
  if (templateKey !== "real-estate") return sections;
  let swapped = false;
  const out = sections.map((s) => {
    if (!swapped && s?.type === "gallery" && /listing/i.test(String(s?.heading ?? ""))) {
      swapped = true;
      return idxListingsSection(String(s.heading) || "Featured Listings");
    }
    return s;
  });
  return out;
}

/** Real-estate home pages MUST surface the live IDX listings. If there's no gallery-to-swap and no
 *  listings section yet (e.g. an AI-generated sitemap), insert one after the hero. */
function ensureListingsOnHome(templateKey: string, sections: Array<Record<string, any>>): Array<Record<string, any>> {
  if (templateKey !== "real-estate") return sections;
  if (sections.some((s) => s?.type === "listings" && s?.source === "idx")) return sections;
  const swapped = injectLiveListings(templateKey, sections);
  if (swapped.some((s) => s?.type === "listings" && s?.source === "idx")) return swapped;
  const heroIdx = sections.findIndex((s) => s?.type === "hero");
  const at = heroIdx >= 0 ? heroIdx + 1 : 0;
  return [...sections.slice(0, at), idxListingsSection("Featured Listings"), ...sections.slice(at)];
}

export interface ApplyTemplateResult {
  ok: boolean;
  templateKey: string;
  businessName: string;
  pages: Array<{ id: string; slug: string; title: string; sectionCount: number; previewPath: string }>;
  brandApplied: boolean;
  note: string;
  error?: string;
}

export async function applyTemplate(args: {
  tenantId: string;
  templateKey: string;
  businessName: string;
  applyBrand?: boolean; // default true: seed brand settings from the template BrandHint
}): Promise<ApplyTemplateResult> {
  const businessName = (args.businessName ?? "").trim() || "Your Business";
  const base: ApplyTemplateResult = { ok: false, templateKey: args.templateKey, businessName, pages: [], brandApplied: false, note: "" };

  const tpl: IndustryTemplate | null = instantiateTemplate(args.templateKey, { businessName });
  if (!tpl) return { ...base, error: `unknown template "${args.templateKey}"` };

  const sb = service();

  // existing slugs for this tenant (uniqueness)
  const { data: existing } = await sb.from("website_pages").select("slug").eq("tenant_id", args.tenantId);
  const taken = new Set<string>((existing ?? []).map((r: any) => String(r.slug)));
  const uniqueSlug = (slug: string) => {
    let s = SLUG_RE.test(slug) ? slug : "page";
    if (!taken.has(s)) { taken.add(s); return s; }
    for (let i = 2; i < 50; i++) { const c = `${slug}-${i}`; if (!taken.has(c)) { taken.add(c); return c; } }
    return `${slug}-${taken.size}`;
  };

  const pages: ApplyTemplateResult["pages"] = [];
  for (let i = 0; i < tpl.pages.length; i++) {
    const p = tpl.pages[i];
    const slug = uniqueSlug(p.slug);
    const sections = injectLiveListings(args.templateKey, pageToSectionContents(p));
    const draftSeo = { seo_title: p.seo.title, seo_description: p.seo.description };

    const { data: row, error } = await sb.from("website_pages").insert({
      tenant_id: args.tenantId,
      title: p.title,
      slug,
      order_index: i,
      is_home: slug === "home" || i === 0,
      is_public: false,
      draft_title: p.title,
      draft_slug: slug,
      draft_seo: draftSeo,
      draft_sections: sections,
    }).select("id").single();

    if (error) return { ...base, pages, error: `page "${slug}" insert failed: ${error.message}` };
    // Generated pages are always drafts (is_public=false) → the view link is a draft PREVIEW (?preview=1).
    pages.push({ id: row.id, slug, title: p.title, sectionCount: sections.length, previewPath: `/sites/${args.tenantId}/${slug}?preview=1` });
  }

  // optional: seed brand settings from the template BrandHint (per-tenant only)
  let brandApplied = false;
  if (args.applyBrand !== false) {
    const h = tpl.brandHint;
    const { error: bErr } = await sb.from("website_brand_settings").upsert({
      tenant_id: args.tenantId,
      primary_color: h.primary,
      accent_color: h.accent,
      font_heading: h.fontHeading,
      font_body: h.fontBody,
      tone: h.mood,
    }, { onConflict: "tenant_id" });
    brandApplied = !bErr;
  }

  return {
    ok: true,
    templateKey: args.templateKey,
    businessName,
    pages,
    brandApplied,
    note: `Created ${pages.length} draft page(s) from "${tpl.label}". Brand ${brandApplied ? "seeded" : "unchanged"}. Drafts are private until the tenant publishes (O-3 critic gate) and flips the design toggle.`,
  };
}

/**
 * Write a DRAFT website from an AI-generated (or template) SITEMAP (Builder North-Star P1, D-382).
 * Same safety + output shape as applyTemplate (drafts only, brand from the industry hint, IDX listings
 * ensured on the real-estate home), but the pages/sections come from `generateSitemap()` instead of a
 * fixed template.
 */
export async function applySitemap(args: {
  tenantId: string;
  sitemap: { source: string; pages: Array<{ slug: string; title: string; seo: { seo_title: string; seo_description: string }; sections: any[] }> };
  templateKey: string;
  businessName: string;
  applyBrand?: boolean;
}): Promise<ApplyTemplateResult> {
  const businessName = (args.businessName ?? "").trim() || "Your Business";
  const base: ApplyTemplateResult = { ok: false, templateKey: args.templateKey, businessName, pages: [], brandApplied: false, note: "" };
  const pagesIn = args.sitemap?.pages ?? [];
  if (!pagesIn.length) return { ...base, error: "empty sitemap" };

  const sb = service();
  const { data: existing } = await sb.from("website_pages").select("slug").eq("tenant_id", args.tenantId);
  const taken = new Set<string>((existing ?? []).map((r: any) => String(r.slug)));
  const uniqueSlug = (slug: string) => {
    let s = SLUG_RE.test(slug) ? slug : "page";
    if (!taken.has(s)) { taken.add(s); return s; }
    for (let i = 2; i < 50; i++) { const c = `${slug}-${i}`; if (!taken.has(c)) { taken.add(c); return c; } }
    return `${slug}-${taken.size}`;
  };

  const hasHome = pagesIn.some((p) => p.slug === "home");
  const pages: ApplyTemplateResult["pages"] = [];
  for (let i = 0; i < pagesIn.length; i++) {
    const p = pagesIn[i];
    const slug = uniqueSlug(p.slug);
    const isHome = hasHome ? slug === "home" : i === 0;
    let sections = injectLiveListings(args.templateKey, (p.sections ?? []) as any);
    if (isHome) sections = ensureListingsOnHome(args.templateKey, sections);
    const draftSeo = { seo_title: p.seo?.seo_title, seo_description: p.seo?.seo_description };

    const { data: row, error } = await sb.from("website_pages").insert({
      tenant_id: args.tenantId, title: p.title, slug, order_index: i,
      is_home: isHome, is_public: false,
      draft_title: p.title, draft_slug: slug, draft_seo: draftSeo, draft_sections: sections,
      seo_title: draftSeo.seo_title, seo_description: draftSeo.seo_description,
    }).select("id").single();
    if (error) return { ...base, pages, error: `page "${slug}" insert failed: ${error.message}` };
    pages.push({ id: row.id, slug, title: p.title, sectionCount: sections.length, previewPath: `/sites/${args.tenantId}/${slug}?preview=1` });
  }

  let brandApplied = false;
  if (args.applyBrand !== false) {
    const h = getIndustryTemplate(args.templateKey)?.brandHint;
    if (h) {
      const { error: bErr } = await sb.from("website_brand_settings").upsert({
        tenant_id: args.tenantId, primary_color: h.primary, accent_color: h.accent, font_heading: h.fontHeading, font_body: h.fontBody, tone: h.mood,
      }, { onConflict: "tenant_id" });
      brandApplied = !bErr;
    }
  }

  return {
    ok: true, templateKey: args.templateKey, businessName, pages, brandApplied,
    note: `Created ${pages.length} ${args.sitemap.source === "ai" ? "AI-generated" : "template"} draft page(s). Drafts are private until published (O-3 critic gate).`,
  };
}
