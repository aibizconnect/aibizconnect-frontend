import type { CSSProperties } from "react";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { SectionView } from "@/components/sections/registry";
import { bgLayerCss, bgFadeOverlayCss, hasBgLayer, backgroundOnlyCss, type ElementStyle } from "@/lib/design/element-style";
import { getPageBlocks } from "@/app/tenants/[tenantId]/website/actions";
import { resolveTheme, mergeBrandRows } from "@/lib/sections/theme";
import { collectPageFonts } from "@/lib/fonts";
import { jsonLdScript } from "@/lib/seo/structured-data";
import SiteScripts from "@/components/site/SiteScripts";
import SiteOccasions from "@/components/site/SiteOccasions";

/**
 * Shared draft-preview document. Renders a page's DRAFT state (header/footer global
 * blocks + sections + per-page background) exactly like the public site. Used by:
 *  - the in-dashboard preview route (with the draft banner), and
 *  - the chrome-free /website-embed route (embed mode) used as the Pages-grid
 *    thumbnail — that route lives OUTSIDE the dashboard layout, so no sidebar.
 */
export default async function SitePreviewDocument({
  tenantId, pageId, embed = false,
}: { tenantId: string; pageId: string; embed?: boolean }) {
  const supabase = createSupabaseServiceClient();

  // A tenant can have MULTIPLE brand rows (0019 brand-per-website); .single() THROWS on >1
  // row → brand becomes null → fonts fall back and layout shifts. Fetch all + merge.
  const { data: brandRows } = await supabase
    .from("website_brand_settings").select("*").eq("tenant_id", tenantId);
  const brand = mergeBrandRows(Array.isArray(brandRows) ? brandRows : []);

  const { data: page } = await supabase
    .from("website_pages")
    .select("id, title, slug, redirect_url, draft_title, draft_slug, draft_sections, draft_seo, seo_title, seo_description, seo_image_url, canonical_url, custom_css")
    .eq("tenant_id", tenantId)
    .eq("id", pageId)
    .single();

  // Preview from draft_sections if present, else the live sections.
  let sections: { content: any }[] = [];
  const draftSections = page?.draft_sections;
  if (Array.isArray(draftSections) && draftSections.length > 0) {
    sections = draftSections.map((content: any) => ({ content }));
  } else {
    const { data: sectionRows } = await supabase
      .from("website_page_sections")
      .select("content, order_index")
      .eq("tenant_id", tenantId)
      .eq("page_id", pageId)
      .order("order_index");
    sections = (sectionRows ?? []).map((r: any) => ({ content: r.content }));
  }

  const previewTitle = page?.draft_title ?? page?.title;
  const draftSlugDiffers = page?.draft_slug && page.draft_slug !== page.slug;
  // Only flag "unpublished changes" when the draft actually differs from the live page.
  // publishPage clears draft_sections to [] and the draft_* fields, so a freshly-published
  // (clean) page shows NO banner — matching the editor's Save button having no red dot.
  const hasUnpublished =
    (Array.isArray(draftSections) && draftSections.length > 0) ||
    page?.draft_title != null ||
    !!draftSlugDiffers;

  const brandStyle = {
    "--primary": brand?.primary_color,
    "--secondary": brand?.secondary_color,
    "--accent": brand?.accent_color,
    "--font-heading": brand?.font_heading,
    "--font-body": brand?.font_body,
  } as CSSProperties;

  const theme = resolveTheme(brand);
  // Background behind all sections — per-page wins, else the site-wide default.
  const siteBg = (brand?.theme && typeof brand.theme === "object" ? (brand.theme as any).pageBackground : null) as ElementStyle | null;
  const site = (brand?.theme && typeof brand.theme === "object" ? (brand.theme as any).site : null) as
    | { ga4Id?: string; gtmId?: string; metaPixelId?: string; headScripts?: string; footerScripts?: string; occasions?: import("@/lib/occasions").OccasionsConfig } | null;
  let perPageBg: ElementStyle | null = null;
  try {
    const { data: bgRow } = await supabase.from("website_pages").select("page_background").eq("tenant_id", tenantId).eq("id", pageId).maybeSingle();
    const b = (bgRow as any)?.page_background;
    if (b && typeof b === "object" && Object.keys(b).length) perPageBg = b as ElementStyle;
  } catch { /* column not applied yet */ }
  const pageBg = perPageBg ?? siteBg;
  const pageBgHasImage = hasBgLayer(pageBg ?? undefined);
  const pageBgCss = pageBg ? backgroundOnlyCss(pageBg, { bgAsLayer: pageBgHasImage }) : null;
  const pageBgLayer = pageBgHasImage ? bgLayerCss(pageBg ?? undefined) : null;
  const pageBgOverlay = pageBgHasImage ? bgFadeOverlayCss(pageBg ?? undefined) : null;

  const previewBlocks = await getPageBlocks(pageId, tenantId, true);
  const pageFonts = collectPageFonts(theme, [...sections.map((s) => s.content), ...previewBlocks.map((b: any) => b.content)]);

  const seoD = (page?.draft_seo && typeof page.draft_seo === "object" ? page.draft_seo : {}) as Record<string, any>;
  const ld = jsonLdScript({
    url: `/sites/${tenantId}/${page?.slug ?? ""}`,
    siteName: brand?.business_name || brand?.name || page?.title,
    logoUrl: brand?.logo_url,
    title: seoD.seo_title || (page as any)?.seo_title || page?.title || "",
    description: seoD.seo_description || (page as any)?.seo_description || undefined,
    imageUrl: seoD.seo_image_url || (page as any)?.seo_image_url || undefined,
    schemaType: seoD.schema_type, schemaTypes: Array.isArray(seoD.schemas) ? seoD.schemas : undefined,
    author: seoD.author, language: seoD.language,
    sections: sections.map((s) => s.content),
  });

  const headerBlocks = previewBlocks.filter((b: any) => !/footer/i.test(b.name));
  const footerBlocks = previewBlocks.filter((b: any) => /footer/i.test(b.name));

  // Responsive sink: lets each row self-emit its scoped @media query so columns STACK to one column
  // under 768px (without it, preview kept desktop columns side-by-side on mobile). Matches the public
  // site renderer.
  let _cssId = 0;
  const cssSink = { nextId: () => ++_cssId };

  return (
    <div style={{ ...brandStyle, ...(pageBgCss ?? {}), ...(pageBgHasImage ? { position: "relative" as const } : {}) }} className="min-h-screen">
      {pageBgLayer && <div aria-hidden style={pageBgLayer} />}
      {pageBgOverlay && <div aria-hidden style={pageBgOverlay} />}
      <div style={pageBgHasImage ? { position: "relative", zIndex: 1 } : undefined}>
        {ld && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ld }} />}
        {pageFonts.googleHref && <link rel="stylesheet" href={pageFonts.googleHref} />}
        {pageFonts.customFaces && <style dangerouslySetInnerHTML={{ __html: pageFonts.customFaces }} />}
        {/* The page's custom CSS applies EVERYWHERE it renders — including embed/thumbnail mode,
            since lossless imports keep their design CSS here (Ali). Scripts stay non-embed only. */}
        {(page as any)?.custom_css ? <style dangerouslySetInnerHTML={{ __html: (page as any).custom_css }} /> : null}
        {!embed && site && (site.ga4Id || site.gtmId || site.metaPixelId || site.headScripts || site.footerScripts) && (
          <SiteScripts ga4Id={site.ga4Id} gtmId={site.gtmId} metaPixelId={site.metaPixelId} headScripts={site.headScripts} footerScripts={site.footerScripts} />
        )}
        {/* Occasions effects active in the editor Preview too (Ali). */}
        {!embed && site?.occasions && <SiteOccasions config={site.occasions} />}
        <style>
          {`
            h1, h2, h3, h4, h5, h6 { font-family: var(--font-heading), sans-serif; }
            body, p, span, div { font-family: var(--font-body), sans-serif; }
          `}
        </style>

        {/* Global Header (draft) — above the body. */}
        {headerBlocks.map((b) => (
          <SectionView key={b.id} content={b.content} theme={theme} cssSink={cssSink} />
        ))}

        {!embed && hasUnpublished && (
          <div className="bg-blue-50 px-6 py-2 text-xs text-blue-800">
            Draft preview — shows unpublished changes.
          </div>
        )}
        {!embed && draftSlugDiffers && (
          <div className="bg-amber-50 px-6 py-2 text-sm text-amber-800">
            Draft slug differs from published slug — publish to apply.
          </div>
        )}
        {!embed && page?.redirect_url && (
          <div className="bg-amber-50 px-6 py-3 text-sm text-amber-800">
            This page redirects to {page.redirect_url} (redirect is not applied in preview).
          </div>
        )}

        {/* Accessible page title (visually hidden) */}
        <h1 className="sr-only">{previewTitle}</h1>

        {sections.map((s, i) => (
          <SectionView key={i} content={s.content} theme={theme} cssSink={cssSink} />
        ))}

        {/* Global Footer (draft) — below the body. */}
        {footerBlocks.map((b) => (
          <SectionView key={b.id} content={b.content} theme={theme} cssSink={cssSink} />
        ))}
      </div>
    </div>
  );
}
