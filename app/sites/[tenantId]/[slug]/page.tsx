import type { CSSProperties } from "react";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { SectionView } from "@/components/sections/registry";
import { ComponentRenderer } from "@/components/design/ComponentRenderer";
import { adaptSection } from "@/lib/design/section-adapter";
import { styleToCss, animClasses, bgLayerCss, bgFadeOverlayCss, hasBgLayer, backgroundOnlyCss, type ElementStyle } from "@/lib/design/element-style";
import { DEFAULT_BRAND_TOKENS, tokensToCssVars, resolveBrandTokens } from "@/lib/design/tokens";
import { getDesignSystemEnabled } from "@/lib/design/brand-memory";
import { getPageBlocks } from "../../../tenants/[tenantId]/website/actions";
import SitePopups from "@/components/website/SitePopups";
import SiteContactForm from "@/components/website/SiteContactForm";
import SiteSurvey from "@/components/website/SiteSurvey";
import BookingWidget from "@/components/calendars/BookingWidget";
import { listPopups } from "@/lib/popups";
import type { BrandSettings } from "@/lib/sections/schemas";
import { resolveTheme, mergeBrandRows } from "@/lib/sections/theme";
import { collectPageFonts } from "@/lib/fonts";
import { jsonLdScript } from "@/lib/seo/structured-data";
import SiteScripts from "@/components/site/SiteScripts";
import SiteOccasions from "@/components/site/SiteOccasions";
import CookieBanner from "@/components/site/CookieBanner";

interface PublicSitePageProps {
  params: Promise<{ tenantId: string; slug: string }>;
}

// Per-page SEO metadata (Step 25). App Router injects these into <head>.
// Uses generateMetadata (the correct mechanism) rather than raw <title>/<meta>
// in JSX. Falls back to page.title and omits empty fields; never throws.
export async function generateMetadata({
  params,
}: PublicSitePageProps): Promise<Metadata> {
  const { tenantId, slug } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: page } = await supabase
    .from("website_pages")
    .select(
      "title, seo_title, seo_description, seo_image_url, canonical_url, noindex, nofollow, draft_seo"
    )
    .eq("tenant_id", tenantId)
    .eq("slug", slug)
    .single();

  if (!page) return {};

  // Site-wide SEO/OG/robots defaults (theme.site) — fallbacks when the page has none.
  const { data: brandRowsForSite } = await supabase.from("website_brand_settings").select("theme").eq("tenant_id", tenantId);
  const brandRow = mergeBrandRows(Array.isArray(brandRowsForSite) ? brandRowsForSite : []);
  const site = (brandRow?.theme && typeof brandRow.theme === "object" ? (brandRow.theme as any).site : null) as
    | { siteName?: string; language?: string; defaultOgImage?: string; robotsNoindex?: boolean; faviconUrl?: string } | null;

  const extra = (page.draft_seo && typeof page.draft_seo === "object" ? page.draft_seo : {}) as Record<string, any>;
  const title = page.seo_title || page.title;
  const desc = page.seo_description || undefined;
  const imgAlt = extra.seo_image_alt ? String(extra.seo_image_alt) : undefined;
  const images = page.seo_image_url
    ? [imgAlt ? { url: page.seo_image_url, alt: imgAlt } : page.seo_image_url]
    : (site?.defaultOgImage ? [site.defaultOgImage] : undefined);
  const pageUrl = `/sites/${tenantId}/${slug}`;
  const meta: Metadata = {
    title,
    robots: { index: !page.noindex && !site?.robotsNoindex, follow: !page.nofollow },
    openGraph: {
      title, type: "website", url: page.canonical_url || pageUrl,
      ...(site?.siteName ? { siteName: site.siteName } : {}),
      ...(site?.language ? { locale: site.language } : {}),
      ...(desc ? { description: desc } : {}),
      ...(images ? { images } : {}),
    },
    twitter: {
      card: images ? "summary_large_image" : "summary",
      title,
      ...(desc ? { description: desc } : {}),
      ...(images ? { images } : {}),
    },
  };
  if (desc) meta.description = desc;
  if (site?.faviconUrl) meta.icons = { icon: site.faviconUrl };
  const kw = extra.keywords || extra.focus_keyword;
  if (kw) meta.keywords = String(kw).split(",").map((s) => s.trim()).filter(Boolean);
  if (extra.author) meta.authors = [{ name: String(extra.author) }];
  if (page.canonical_url) meta.alternates = { canonical: page.canonical_url };
  // Custom meta tags (og:locale, og:site_name, verification, etc.) → raw <meta>.
  // Skip keys Next already emits from openGraph so we never duplicate tags.
  if (Array.isArray(extra.meta_tags)) {
    const managed = new Set(["og:type", "og:title", "og:description", "og:url", "og:image"]);
    const other: Record<string, string> = {};
    for (const t of extra.meta_tags) {
      const name = typeof t?.name === "string" ? t.name.trim() : "";
      const content = typeof t?.content === "string" ? t.content.trim() : "";
      if (!name || !content || managed.has(name)) continue;
      // Promote the common OG identity tags to their proper openGraph slots.
      if (name === "og:site_name") { (meta.openGraph as any).siteName = content; continue; }
      if (name === "og:locale") { (meta.openGraph as any).locale = content; continue; }
      other[name] = content;
    }
    if (Object.keys(other).length) meta.other = other;
  }
  return meta;
}

export default async function PublicSitePage({ params }: PublicSitePageProps) {
  const { tenantId, slug } = await params;
  const supabase = await createSupabaseServerClient();

  // Brand settings — multiple rows possible (brand-per-website); .single() throws on >1,
  // so fetch all + merge (fonts split across rows otherwise get lost).
  const { data: brandRows } = await supabase
    .from("website_brand_settings")
    .select("*")
    .eq("tenant_id", tenantId);
  const brand = mergeBrandRows(Array.isArray(brandRows) ? brandRows : []);

  // Page (by slug)
  const { data: page } = await supabase
    .from("website_pages")
    .select("id, title, slug, is_public, redirect_url, seo_title, seo_description, seo_image_url, canonical_url, draft_seo")
    .eq("tenant_id", tenantId)
    .eq("slug", slug)
    .single();

  // Per-page custom CSS (separate select so a missing column never breaks the page).
  let customCss = "";
  try {
    const { data: cssRow } = await supabase.from("website_pages").select("custom_css").eq("tenant_id", tenantId).eq("slug", slug).single();
    customCss = (cssRow?.custom_css as string) ?? "";
  } catch { /* column not applied yet */ }

  // Per-page background (separate select so a missing column never breaks the page).
  let perPageBg: ElementStyle | null = null;
  try {
    const { data: bgRow } = await supabase.from("website_pages").select("page_background").eq("tenant_id", tenantId).eq("slug", slug).single();
    const b = (bgRow as any)?.page_background;
    if (b && typeof b === "object" && Object.keys(b).length) perPageBg = b as ElementStyle;
  } catch { /* column not applied yet */ }

  // Only published pages are visible publicly
  if (!page || !page.is_public) {
    notFound();
  }

  // Page-level redirect (302)
  if (page.redirect_url) {
    redirect(page.redirect_url);
  }

  // Ordered sections
  const { data: sectionRows } = page
    ? await supabase
        .from("website_page_sections")
        .select("id, type, content, order_index")
        .eq("tenant_id", tenantId)
        .eq("page_id", page.id)
        .order("order_index")
    : { data: [] as any[] };

  const sections = sectionRows ?? [];
  // "Exact copy" pages are a single html/iframe snapshot carrying their own header/footer — don't
  // also render the global Header/Footer blocks (avoids duplicates). Architect D-081/D-083.
  const isExactSnapshot = sections.length === 1 && (sections[0] as any)?.content?.type === "html";

  // Pre-resolve any Booking elements (calendar + available slots) so the section map stays sync.
  const bookingData: Record<string, { id: string; name: string; durationMin: number; days: { date: string; slots: string[] }[] }> = {};
  const bookingSlugs = Array.from(new Set(sections.filter((s: any) => s?.content?.type === "booking" && s.content?.calendarSlug).map((s: any) => String(s.content.calendarSlug))));
  if (bookingSlugs.length) {
    try {
      const { getCalendarBySlug, availableSlots } = await import("@/lib/calendars");
      for (const bs of bookingSlugs) {
        try { const cal = await getCalendarBySlug(tenantId, bs); if (cal) bookingData[bs] = { id: cal.id, name: cal.name, durationMin: cal.durationMin, days: await availableSlots(tenantId, cal) }; } catch { /* skip */ }
      }
    } catch { /* calendars unavailable */ }
  }
  const renderBooking = (c: any, key: string) => {
    const cal = bookingData[String(c.calendarSlug || "")];
    return (
      <section key={key} className="mx-auto max-w-2xl px-6 py-10">
        {c.heading && <h2 className="text-center text-2xl font-semibold">{c.heading}</h2>}
        {c.subheading && <p className="mb-6 mt-1 text-center text-slate-500">{c.subheading}</p>}
        {cal ? <BookingWidget tenantId={tenantId} calendarId={cal.id} calendarName={cal.name} durationMin={cal.durationMin} days={cal.days} />
          : <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-400">This booking calendar isn&apos;t set up yet.</div>}
      </section>
    );
  };

  // Background behind all sections — the per-page background wins; otherwise the
  // site-wide default (theme.pageBackground).
  const siteBg = (brand?.theme && typeof brand.theme === "object" ? (brand.theme as any).pageBackground : null) as ElementStyle | null;
  // Global site settings (tracking / integrations) live in theme.site.
  const siteSettings = (brand?.theme && typeof brand.theme === "object" ? (brand.theme as any).site : null) as
    | { ga4Id?: string; gtmId?: string; metaPixelId?: string; headScripts?: string; footerScripts?: string;
        cookieConsent?: { enabled?: boolean; message?: string; acceptLabel?: string; declineLabel?: string; policyUrl?: string; position?: "bottom" | "bottom-left" | "bottom-right" };
        occasions?: import("@/lib/occasions").OccasionsConfig } | null;
  const cookie = siteSettings?.cookieConsent;
  // Tenant-level External Tracking defaults (Settings → External Tracking) apply across ALL sites;
  // a per-website value (theme.site) always wins. Set-once-for-everything, the leading builder location-level parity.
  const { getTenantTrackingDefaults } = await import("../../../tenants/[tenantId]/settings/tracking-actions");
  const trackDefaults = await getTenantTrackingDefaults(tenantId).catch(() => ({} as Record<string, string | undefined>));
  const tracking = {
    ga4Id: siteSettings?.ga4Id || trackDefaults.ga4Id,
    gtmId: siteSettings?.gtmId || trackDefaults.gtmId,
    metaPixelId: siteSettings?.metaPixelId || trackDefaults.metaPixelId,
    headScripts: siteSettings?.headScripts || trackDefaults.headScripts,
    footerScripts: siteSettings?.footerScripts || trackDefaults.footerScripts,
  };
  const pageBg = perPageBg ?? siteBg;
  const pageBgHasImage = hasBgLayer(pageBg ?? undefined);
  const pageBgCss = pageBg ? backgroundOnlyCss(pageBg, { bgAsLayer: pageBgHasImage }) : null;
  const pageBgLayer = pageBgHasImage ? bgLayerCss(pageBg ?? undefined) : null;
  const pageBgOverlay = pageBgHasImage ? bgFadeOverlayCss(pageBg ?? undefined) : null;

  // Phase-1 design tokens: inject the canonical --abc-* CSS variables that element-style
  // and sections render against (was missing at public render). Bridged from the merged
  // brand row via resolveBrandTokens → tokensToCssVars (architect D-110/D-112).
  const brandStyle = {
    ...tokensToCssVars(resolveBrandTokens(brand)),
    "--primary": brand?.primary_color,
    "--secondary": brand?.secondary_color,
    "--accent": brand?.accent_color,
    "--font-heading": brand?.font_heading,
    "--font-body": brand?.font_body,
  } as CSSProperties;

  const brandSettings: BrandSettings = {
    primaryColor: brand?.primary_color,
    secondaryColor: brand?.secondary_color,
    accentColor: brand?.accent_color,
    fontHeading: brand?.font_heading,
    fontBody: brand?.font_body,
    logoUrl: brand?.logo_url,
  };
  const theme = resolveTheme(brand);
  const publishedBlocks = await getPageBlocks(page.id, tenantId, false);
  // Fonts used by this page (role fonts + element overrides + uploaded customs).
  const pageFonts = collectPageFonts(theme, [...sections.map((s: any) => s.content), ...publishedBlocks.map((b: any) => b.content)]);

  // JSON-LD structured data (GEO / rich results) from SEO config + brand + sections.
  const seoExtra = (page.draft_seo && typeof page.draft_seo === "object" ? page.draft_seo : {}) as Record<string, any>;
  const ld = jsonLdScript({
    url: `/sites/${tenantId}/${slug}`,
    siteName: brand?.business_name || brand?.name || page.title,
    logoUrl: brand?.logo_url,
    title: page.seo_title || page.title,
    description: page.seo_description || undefined,
    imageUrl: page.seo_image_url || undefined,
    schemaType: seoExtra.schema_type,
    schemaTypes: Array.isArray(seoExtra.schemas) ? seoExtra.schemas : undefined,
    author: seoExtra.author,
    language: seoExtra.language,
    sections: sections.map((s: any) => s.content),
  });

  // Per-tenant design-system toggle (tenant-owned) OR global env override.
  const useDesignSystem = (await getDesignSystemEnabled(tenantId)) || process.env.DESIGN_SYSTEM_RENDER === "true";

  // Global Header/Footer (single source of truth). Published blocks resolved above;
  // split by name so the Header renders ABOVE the body and the Footer BELOW it. This
  // replaces the old SiteNav so Editor = Preview = Public (no drift).
  const headerBlocks = publishedBlocks.filter((b: any) => !/footer/i.test(b.name));
  const footerBlocks = publishedBlocks.filter((b: any) => /footer/i.test(b.name));
  const popups = await listPopups(tenantId, { enabledOnly: true });

  // Responsive: each element with per-breakpoint overrides self-emits a scoped <style>
  // with media queries (tablet ≤1024 / mobile ≤768). The sink just hands out unique ids.
  let _cssId = 0;
  const cssSink = { nextId: () => ++_cssId };

  return (
    <div style={{ ...brandStyle, ...(pageBgCss ?? {}), ...(pageBgHasImage ? { position: "relative" as const } : {}) }} className="min-h-screen">
      {/* Page background image layer (blur/parallax/fade affect only the background). */}
      {pageBgLayer && <div aria-hidden style={pageBgLayer} />}
      {pageBgOverlay && <div aria-hidden style={pageBgOverlay} />}
      {/* Content sits above the background layers. */}
      {pageBgHasImage ? <div style={{ position: "relative", zIndex: 1 }}>{renderBody()}</div> : renderBody()}
    </div>
  );

  function renderBody() {
    return (
    <>
      {/* Site-wide tracking / integrations (GA4, GTM, Meta Pixel, custom scripts). */}
      {(tracking.ga4Id || tracking.gtmId || tracking.metaPixelId || tracking.headScripts || tracking.footerScripts) && (
        <SiteScripts ga4Id={tracking.ga4Id} gtmId={tracking.gtmId} metaPixelId={tracking.metaPixelId}
          headScripts={tracking.headScripts} footerScripts={tracking.footerScripts} />
      )}
      {/* GDPR/PIPEDA cookie consent banner. */}
      {cookie?.enabled && (
        <CookieBanner message={cookie.message} acceptLabel={cookie.acceptLabel} declineLabel={cookie.declineLabel}
          policyUrl={cookie.policyUrl} position={cookie.position} />
      )}
      {/* Structured data for search + AI/generative engines (GEO). */}
      {ld && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ld }} />}
      {/* Load the page's fonts (global roles + element overrides + uploaded customs). */}
      {pageFonts.googleHref && <link rel="stylesheet" href={pageFonts.googleHref} />}
      {pageFonts.customFaces && <style dangerouslySetInnerHTML={{ __html: pageFonts.customFaces }} />}
      <style>
        {`
          h1, h2, h3, h4, h5, h6 {
            font-family: var(--font-heading), sans-serif;
          }
          body, p, span, div {
            font-family: var(--font-body), sans-serif;
          }
          /* ── Platform responsive baseline (Copilot-ratified) ──────────────
             Every tenant site is mobile-perfect by default: media never overflows,
             no horizontal scroll, and boxed content goes full-width on phones. */
          img, video, iframe { max-width: 100%; }
          img, video { height: auto; }
          html, body { overflow-x: hidden; }
          @media (max-width: 768px) {
            :root, body { --abc-maxw: 100%; }
          }
        `}
      </style>

      {/* Global Header (single source of truth) — rendered above the body. Skipped on exact snapshots. */}
      {!isExactSnapshot && headerBlocks.map((b) => (
        <SectionView key={b.id} content={b.content} theme={theme} cssSink={cssSink} />
      ))}

      {/* Accessible page title (visually hidden) */}
      <h1 className="sr-only">{page?.title}</h1>

      {/* Design-system render path (DL-2 live integration) — OPT-IN via
          DESIGN_SYSTEM_RENDER=true. Default OFF: the live site keeps its current look
          until explicitly enabled. When on, mapped sections use the token-driven
          responsive renderer (tenant brand colors over token defaults); unmapped
          sections fall back to the proven SectionView so nothing is ever dropped. */}
      {useDesignSystem ? (
        <div
          style={tokensToCssVars({
            ...DEFAULT_BRAND_TOKENS,
            colors: {
              ...DEFAULT_BRAND_TOKENS.colors,
              ...(brand?.primary_color ? { primary: brand.primary_color } : {}),
              ...(brand?.accent_color ? { accent: brand.accent_color } : {}),
            },
            typography: {
              ...DEFAULT_BRAND_TOKENS.typography,
              ...(brand?.font_heading ? { fontHeading: brand.font_heading } : {}),
              ...(brand?.font_body ? { fontBody: brand.font_body } : {}),
            },
          }) as CSSProperties}
        >
          {sections.map((s: any) => {
            const adapted = adaptSection(s.content);
            const isForm = adapted?.type === "contact-form" || s.content?.type === "contact-form";
            const node = s.content?.type === "booking"
              ? renderBooking(s.content, s.id)
              : s.content?.type === "survey"
              ? <SiteSurvey tenantId={tenantId} pageId={page?.id} heading={s.content?.heading} questions={s.content?.questions ?? []} submitLabel={s.content?.submitLabel} successMessage={s.content?.successMessage} />
              : isForm
              ? <SiteContactForm tenantId={tenantId} heading={s.content?.heading ?? adapted?.props?.heading} fields={s.content?.fields ?? adapted?.props?.fields} submitLabel={s.content?.submitLabel ?? adapted?.props?.submitLabel} />
              : adapted
                ? <ComponentRenderer type={adapted.type} props={adapted.props} />
                : <SectionView content={s.content} theme={theme} cssSink={cssSink} />;
            const meta = (s.content?._style || s.content?._anim);
            return meta
              ? <div key={s.id} className={animClasses(s.content?._anim)} style={styleToCss(s.content?._style)}>{node}</div>
              : <div key={s.id}>{node}</div>;
          })}
        </div>
      ) : (
        sections.map((s: any) => (
          s.content?.type === "booking"
            ? renderBooking(s.content, s.id)
            : s.content?.type === "survey"
            ? <SiteSurvey key={s.id} tenantId={tenantId} pageId={page?.id} heading={s.content?.heading} questions={s.content?.questions ?? []} submitLabel={s.content?.submitLabel} successMessage={s.content?.successMessage} />
            : s.content?.type === "contact-form"
            ? <SiteContactForm key={s.id} tenantId={tenantId} heading={s.content?.heading} fields={s.content?.fields} submitLabel={s.content?.submitLabel} />
            : <SectionView key={s.id} content={s.content} theme={theme} cssSink={cssSink} />
        ))
      )}

      {/* Global Footer (single source of truth) — rendered below the body. Skipped on exact snapshots. */}
      {!isExactSnapshot && footerBlocks.map((b) => (
        <SectionView key={b.id} content={b.content} theme={theme} cssSink={cssSink} />
      ))}

      {popups.length > 0 && <SitePopups popups={popups} />}

      {/* Occasions Engine — seasonal/holiday effects active for the visitor's local date. */}
      {siteSettings?.occasions && <SiteOccasions config={siteSettings.occasions} />}

      {(siteSettings as any)?.siteCustomCss ? <style data-imported dangerouslySetInnerHTML={{ __html: (siteSettings as any).siteCustomCss }} /> : null}
      {customCss ? <style dangerouslySetInnerHTML={{ __html: customCss }} /> : null}
    </>
    );
  }
}
