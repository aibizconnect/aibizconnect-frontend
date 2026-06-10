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
import { htmlToLosslessSections } from "@/lib/sites/lossless-importer";
import { deriveDesignTokens } from "@/lib/sites/design-bridge";
import { renderHtmlToDom } from "@/lib/sites/site-clone";
import { ingestSectionImages } from "@/lib/sites/image-ingestion";
import { sectionSchema } from "@/lib/sections/schemas";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
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
  opts?: { baseUrl?: string; isHome?: boolean; mode?: "lossless" | "blocks" },
): Promise<ImportHtmlResult> {
  await requireTenantAccess(tenantId);
  if (!html || html.length < 40) return { ok: false, message: "Empty/too-small HTML." };

  // FIDELITY (architect D-146): pasted markup carries utility/inline CLASSES but no resolved
  // computed styles. Render it in a real browser (render bridge) so those classes resolve to true
  // padding/spacing/color/typography annotated as data-cs — AND, for the lossless path, get the
  // data-uid stamps + compiled-CSS snapshot (D-179/D-180). If no bridge is configured (or it
  // fails), fall back to the raw markup and flag the page low-fidelity so the user can re-capture
  // instead of silently shipping unstyled primitives (D-144 preserved per D-186).
  let working = html;
  let fidelity: "high" | "low" = "low";
  if (html.includes("data-cs")) {
    fidelity = "high"; // already annotated (e.g. came from a URL capture)
  } else {
    const rendered = await renderHtmlToDom(html);
    if (rendered) { working = rendered; fidelity = "high"; }
  }

  // DEFAULT = LOSSLESS (architect D-178/D-186): the page's real HTML is the source of truth —
  // verbatim bands + CSS snapshot + Layer-Tree patch editing. The heuristic translator remains
  // reachable via mode:"blocks" ("Convert to editable blocks", D-182). Lossless requires the
  // bridge's uid stamps; without them (low fidelity) we fall back to the translator.
  const mode = opts?.mode ?? (fidelity === "high" && working.includes("data-uid") ? "lossless" : "blocks");

  let sections: Record<string, unknown>[];
  let dropped = 0;
  let seo: { title?: string; description?: string; imageUrl?: string } = {};
  if (mode === "lossless") {
    try {
      const out = htmlToLosslessSections(working, opts?.baseUrl || "https://stitch.local");
      sections = out.sections;
      seo = out.seo;
    } catch (e: any) {
      return { ok: false, message: `Lossless import failed: ${e?.message ?? e}` };
    }
    if (!sections.some((s) => s.type === "imported-html")) return { ok: false, fidelity, message: "No bands produced." };
    // Media Library ingestion for verbatim bands: collect <img src> urls, ingest via the existing
    // pipeline, then rewrite the band HTML strings.
    try {
      const urls = new Set<string>();
      for (const s of sections) {
        const h = (s as any).html as string | undefined;
        if (h) for (const m of h.matchAll(/src="(https?:\/\/[^"]+)"/g)) urls.add(m[1]);
      }
      if (urls.size) {
        const fake = Array.from(urls).map((url) => ({ type: "image", url }));
        const ingested = (await ingestSectionImages(tenantId, fake as any, { websiteId })) as any[];
        const map = new Map<string, string>();
        Array.from(urls).forEach((u, i) => { const nu = ingested[i]?.url; if (nu && nu !== u) map.set(u, nu); });
        for (const s of sections) {
          let h = (s as any).html as string | undefined;
          if (!h) continue;
          for (const [from, to] of map) h = h.split(from).join(to);
          (s as any).html = h;
        }
      }
    } catch { /* keep original URLs */ }
  } else {
    let raw: Record<string, unknown>[];
    try {
      // Faithful mode: keep the design's real structure/order as editable primitives instead of
      // collapsing the first section into our composite hero template.
      raw = htmlToSections(working, opts?.baseUrl || "https://stitch.local", { faithful: true });
    } catch (e: any) {
      return { ok: false, message: `Decompose failed: ${e?.message ?? e}` };
    }
    // Keep only sections our renderer can validate (each remains fully editable).
    sections = raw.filter((s) => sectionSchema.safeParse(s).success);
    dropped = raw.length - sections.length;
    if (!sections.length) return { ok: false, fidelity, message: "No renderable sections produced.", droppedCount: dropped };

    // P1 (architect D-148): pull every imported image into the tenant Media Library so the page
    // owns durable, reusable copies instead of hotlinks that rot.
    try {
      const ingested = await ingestSectionImages(tenantId, sections as any, { websiteId });
      sections = ingested as any;
    } catch { /* keep original URLs */ }
  }

  const slug = slugify(title);
  let page: { id: string };
  try {
    page = await createPage(tenantId, { title, slug, isHome: !!opts?.isHome, websiteId });
  } catch {
    page = await createPage(tenantId, { title, slug: `${slug}-${websiteId.slice(0, 8)}`, isHome: !!opts?.isHome, websiteId });
  }
  // DESIGN CSS lives in the page's CUSTOM CSS slot (Ali) — NOT as a pseudo-section above the
  // header. Font stylesheets ride along as @import lines (valid inside a <style> everywhere the
  // page renders). The css carrier section is dropped AFTER theme derivation reads it.
  let customCss: string | null = null;
  if (mode === "lossless") {
    const carrier = sections.find((s) => s.type === "imported-css") as { css?: string; fontHrefs?: string[] } | undefined;
    if (carrier) {
      const imports = Array.from(new Set(carrier.fontHrefs || [])).map((h) => `@import url("${h}");`).join("\n");
      customCss = `${imports}${imports ? "\n" : ""}${carrier.css || ""}`.trim() || null;
    }
  }

  const draft: Record<string, unknown> = { draft_sections: sections as any };
  // SEO captured from the imported <head> lands in the page's draft SEO fields (D-178.4).
  if (seo.title || seo.description || seo.imageUrl) {
    draft.draft_seo = {
      ...(seo.title ? { seo_title: seo.title } : {}),
      ...(seo.description ? { seo_description: seo.description } : {}),
      ...(seo.imageUrl ? { seo_image_url: seo.imageUrl } : {}),
    };
  }
  if (customCss) {
    draft.custom_css = customCss;
    draft.draft_sections = sections.filter((s) => s.type !== "imported-css") as any;
  }
  await saveDraft(page.id, tenantId, draft as any);

  // DESIGN BRIDGE (D-194, Copilot spec): derive brand tokens from the imported design so NATIVE
  // palette elements inserted later match its typography/colors. Fill EMPTY fields only — the
  // tenant's own theme edits always win; written once at import; deterministic for re-imports.
  if (mode === "lossless") {
    try {
      const t = deriveDesignTokens(sections);
      const sb = createSupabaseServiceClient();
      const { data: brand } = await sb.from("website_brand_settings").select("*").eq("tenant_id", tenantId).limit(1).maybeSingle();
      const fill: Record<string, unknown> = {};
      const put = (col: string, v?: string) => { if (v && !(brand as any)?.[col]) fill[col] = v; };
      put("primary_color", t.primary); put("secondary_color", t.secondary); put("accent_color", t.accent);
      put("font_heading", t.fontHeading); put("font_body", t.fontBody);
      if (Object.keys(fill).length) {
        if (brand) await sb.from("website_brand_settings").update(fill).eq("tenant_id", tenantId);
        else await sb.from("website_brand_settings").insert({ tenant_id: tenantId, ...fill });
      }
    } catch { /* theme derivation is best-effort — never blocks an import */ }
  }

  return { ok: true, pageId: page.id, slug, sectionCount: sections.length, droppedCount: dropped, fidelity };
}

/**
 * Import a Stitch screen DIRECTLY by its exported-HTML URL — no copy/paste. The Stitch MCP's
 * `get_screen` returns `htmlCode.downloadUrl` (a self-contained Tailwind-CDN HTML doc); pass that
 * URL here. We fetch it, then hand off to importHtmlAsDraftPage, which renders it through the bridge
 * (resolving Tailwind classes → true computed styles), ingests images, and creates an editable page.
 *
 * `htmlUrl` must be an https Google usercontent download link from the Stitch MCP. We fetch
 * server-side (no secrets, no PII) and cap the body.
 */
export async function importStitchScreen(
  tenantId: string,
  websiteId: string,
  htmlUrl: string,
  title: string,
  opts?: { isHome?: boolean },
): Promise<ImportHtmlResult> {
  await requireTenantAccess(tenantId);
  let parsed: URL;
  try { parsed = new URL(htmlUrl); } catch { return { ok: false, message: "Invalid Stitch HTML URL." }; }
  if (parsed.protocol !== "https:") return { ok: false, message: "Stitch HTML URL must be https." };
  // Only accept Google usercontent hosts the Stitch MCP actually serves from.
  if (!/(^|\.)usercontent\.google\.com$/.test(parsed.hostname) && !/(^|\.)googleusercontent\.com$/.test(parsed.hostname)) {
    return { ok: false, message: "URL is not a Stitch (Google usercontent) export link." };
  }

  let html: string;
  try {
    const res = await fetch(parsed.toString(), { signal: AbortSignal.timeout(30000), redirect: "follow" });
    if (!res.ok) return { ok: false, message: `Could not fetch Stitch HTML (${res.status}).` };
    html = (await res.text()).slice(0, 2_000_000);
  } catch (e: any) {
    return { ok: false, message: `Fetch failed: ${e?.message ?? e}` };
  }
  if (!html || html.length < 40) return { ok: false, message: "Stitch HTML was empty." };

  // baseUrl = stitch.local keeps relative-URL absolutization harmless; Stitch assets are absolute.
  return importHtmlAsDraftPage(tenantId, websiteId, html, title, { baseUrl: "https://stitch.local", isHome: opts?.isHome });
}
