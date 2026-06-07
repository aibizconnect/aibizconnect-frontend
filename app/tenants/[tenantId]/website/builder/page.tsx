import Link from "next/link";
import EditorPage from "../editor/EditorPage";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { resolveTheme, mergeBrandRows } from "@/lib/sections/theme";
import { collectPageFonts } from "@/lib/fonts";

/**
 * Page builder route (the leading builder's "Edit"). Opens the section editor for a specific page.
 * Reached from the Website → Pages grid via each card's Edit button.
 *
 * Fonts are PRELOADED here (server side): we resolve the tenant's theme + the page's
 * sections and emit the Google Fonts <link> + uploaded @font-face into the initial HTML,
 * with rel=preload, so the canvas renders in the correct fonts immediately — no FOUT and
 * no need to open Typography to "wake them up".
 */
interface BuilderPageProps {
  params: Promise<{ tenantId: string }>;
  searchParams: Promise<{ pageId?: string }>;
}

export default async function BuilderPage({ params, searchParams }: BuilderPageProps) {
  const { tenantId } = await params;
  const { pageId } = await searchParams;

  // Resolve theme + this page's sections so we can preload every font they use.
  let googleHref: string | null = null;
  let customFaces = "";
  let websiteId: string | null = null;
  const customSrcs: string[] = [];
  try {
    const supabase = createSupabaseServiceClient();
    // There can be MULTIPLE brand rows per tenant (0019 brand-per-website). Pick the one
    // that actually carries uploaded customFonts; otherwise the first row.
    const { data: brands } = await supabase
      .from("website_brand_settings")
      .select("primary_color, secondary_color, accent_color, font_heading, font_body, theme")
      .eq("tenant_id", tenantId);
    const theme: any = resolveTheme(mergeBrandRows(Array.isArray(brands) ? brands : []));
    let sections: any[] = [];
    if (pageId) {
      const { data: page } = await supabase
        .from("website_pages")
        .select("draft_sections, website_id")
        .eq("tenant_id", tenantId).eq("id", pageId).maybeSingle();
      const ds = (page as any)?.draft_sections;
      if (Array.isArray(ds)) sections = ds;
      websiteId = (page as any)?.website_id ?? null;
    }
    const fonts = collectPageFonts(theme, sections);
    googleHref = fonts.googleHref;
    // Emit EVERY uploaded custom @font-face directly (not just name-matched ones) so the
    // brand fonts are always in the initial HTML and load before first paint — bulletproof.
    const customs = (Array.isArray(theme.customFonts) ? theme.customFonts : []).filter((f: any) => f?.name && f?.src);
    customFaces = customs.map((f: any) => `@font-face{font-family:"${f.name}";src:url("${f.src}");font-display:swap;}`).join("");
    customs.forEach((f: any) => customSrcs.push(f.src));
  } catch { /* preload is best-effort; the canvas still injects fonts at runtime */ }

  return (
    <div className="flex h-full flex-col">
      {/* Preload tenant fonts into the document head so the canvas renders them instantly. */}
      {googleHref && <link rel="preload" as="style" href={googleHref} />}
      {googleHref && <link rel="stylesheet" href={googleHref} />}
      {customSrcs.filter((s) => !s.startsWith("data:")).map((src, i) => <link key={i} rel="preload" as="font" href={src} crossOrigin="anonymous" />)}
      {customFaces && <style dangerouslySetInnerHTML={{ __html: customFaces }} />}

      <div className="mb-3 flex items-center gap-3">
        <Link href={websiteId ? `/tenants/${tenantId}/website/${websiteId}` : `/tenants/${tenantId}/website`} className="text-sm font-medium text-[#1e3a8a] hover:underline">← Pages</Link>
        <span className="text-sm text-slate-400">Page Builder</span>
      </div>
      <EditorPage tenantId={tenantId} initialPageId={pageId} />
    </div>
  );
}
