// Capture aibizconnect.app (Lovable "ABC SalesMaster") before hosting expires:
// for each public marketing route — render via the bridge (real browser, data-cs
// annotations), SAVE the raw snapshot (layer 2 of the backup), translate to native
// elements (Bill's supreme rule), ingest images to the Media Library, create draft
// pages in a dedicated website under Ali's tenant. Run with SITE_RENDER_URL +
// SITE_RENDER_TOKEN env.
import { writeFileSync, mkdirSync } from "fs";
import { htmlToSections } from "../lib/sites/html-importer";
import { ingestSectionImages } from "../lib/sites/image-ingestion";
import { inspectPage } from "../lib/sites/inspector";
import { sectionSchema } from "../lib/sections/schemas";
import { createSupabaseServiceClient } from "../lib/supabase/service";

const TENANT = "214ca58a-c76f-48d6-97ec-3f040db3b81f"; // AIBizConnect Consulting (Ali's real tenant)
const BASE = "https://aibizconnect.app";
const ROUTES: { route: string; title: string; slug: string; isHome?: boolean }[] = [
  { route: "/", title: "Home", slug: "home", isHome: true },
  { route: "/pricing", title: "Pricing", slug: "pricing" },
  { route: "/product", title: "Product", slug: "product" },
  { route: "/product/crm", title: "CRM & Pipelines", slug: "product-crm" },
  { route: "/product/websites", title: "Websites & Funnels", slug: "product-websites" },
  { route: "/product/ai-builder", title: "AI Builder", slug: "product-ai-builder" },
  { route: "/product/automations", title: "Automations & Workflows", slug: "product-automations" },
  { route: "/product/consumer-portal", title: "Consumer Portal", slug: "product-consumer-portal" },
  { route: "/product/marketplace", title: "Marketplace", slug: "product-marketplace" },
  { route: "/solutions/real-estate", title: "Real Estate", slug: "solutions-real-estate" },
  { route: "/solutions/mortgage", title: "Mortgage / Finance", slug: "solutions-mortgage" },
  { route: "/solutions/legal", title: "Legal", slug: "solutions-legal" },
  { route: "/solutions/insurance", title: "Insurance", slug: "solutions-insurance" },
  { route: "/solutions/coaching", title: "Coaching & Consulting", slug: "solutions-coaching" },
  { route: "/solutions/agencies", title: "Agencies", slug: "solutions-agencies" },
  { route: "/company/about", title: "About", slug: "about" },
  { route: "/company/careers", title: "Careers", slug: "careers" },
  { route: "/company/partners", title: "Partners", slug: "partners" },
];
// Internal links on imported pages → our page slugs (home → site root). The importer
// ABSOLUTIZES hrefs against the source origin, so strip it back off first — otherwise
// every nav link would keep pointing at the dying Lovable host.
const LINK_MAP = new Map<string, string>(ROUTES.map((r) => [r.route, r.isHome ? "/" : `/${r.slug}`]));
LINK_MAP.set("/company/about", "/abc-about"); // tenant-wide slug collision fallback
const ORIGIN = "https://aibizconnect.app";
function mapHref(v: string): string {
  let path = v;
  if (path.startsWith(ORIGIN + "/") || path === ORIGIN) path = path.slice(ORIGIN.length) || "/";
  if (!path.startsWith("/")) return v;                     // external / mailto / tel — unchanged
  const clean = path.length > 1 ? path.replace(/[/]+$/, "") : path;
  return LINK_MAP.get(clean) ?? clean;                     // unknown internals stay relative
}
function remapLinks(o: unknown): void {
  if (Array.isArray(o)) { o.forEach(remapLinks); return; }
  if (o && typeof o === "object") {
    for (const [k, v] of Object.entries(o as Record<string, unknown>)) {
      if ((k === "href" || k === "url") && typeof v === "string" && (v.startsWith(ORIGIN) || v.startsWith("/"))) {
        (o as Record<string, unknown>)[k] = mapHref(v);
      } else remapLinks(v);
    }
  }
}

const fail = (m: string) => { console.error("FAIL:", m); process.exit(1); };

async function renderUrl(url: string): Promise<string | null> {
  const bridge = process.env.SITE_RENDER_URL;
  const token = process.env.SITE_RENDER_TOKEN;
  if (!bridge || !token) fail("SITE_RENDER_URL / SITE_RENDER_TOKEN env required");
  const res = await fetch(`${bridge}/render?url=${encodeURIComponent(url)}&token=${encodeURIComponent(token!)}`);
  if (!res.ok) { console.log(`  bridge ${res.status} for ${url}`); return null; }
  return await res.text();
}

async function main() {
  const sb = createSupabaseServiceClient();
  mkdirSync(".stitch-out/abc-mirror/rendered", { recursive: true });

  // Dedicated website (idempotent by slug).
  let websiteId: string;
  const { data: existing } = await sb.from("websites").select("id").eq("tenant_id", TENANT).eq("slug", "abc-salesmaster").maybeSingle();
  if (existing) websiteId = (existing as any).id;
  else {
    const { data: w, error } = await sb.from("websites").insert({ tenant_id: TENANT, name: "ABC SalesMaster (imported)", slug: "abc-salesmaster", is_primary: false }).select("id").single();
    if (error) fail(`website create: ${error.message}`);
    websiteId = (w as any).id;
  }
  console.log(`website: ${websiteId}`);

  let order = 0;
  for (const r of ROUTES) {
    const url = `${BASE}${r.route}`;
    console.log(`\n— ${r.title} (${url})`);
    const html = await renderUrl(url);
    if (!html || html.length < 500) { console.log("  SKIP (no render)"); continue; }
    writeFileSync(`.stitch-out/abc-mirror/rendered/${r.slug}.html`, html);
    console.log(`  snapshot saved (${(html.length / 1024).toFixed(0)} KB, data-cs: ${html.includes("data-cs")})`);

    let raw: any[];
    try { raw = htmlToSections(html, BASE, { faithful: true }) as any[]; }
    catch (e: any) { console.log(`  translate FAILED: ${e?.message}`); continue; }
    const sections = raw.filter((s) => sectionSchema.safeParse(s).success);
    console.log(`  native sections: ${sections.length}/${raw.length} (${sections.slice(0, 8).map((s: any) => s._name || s.type).join(" | ")}${sections.length > 8 ? " …" : ""})`);
    if (!sections.length) { console.log("  SKIP (nothing renderable)"); continue; }

    let finalSections = sections;
    try { finalSections = (await ingestSectionImages(TENANT, sections as any, { websiteId })) as any[]; }
    catch { console.log("  (image ingestion failed — keeping source URLs)"); }
    remapLinks(finalSections);

    const title = (/<title>([^<]*)<\/title>/.exec(html)?.[1] ?? r.title).split(" - ")[0].trim() || r.title;
    const desc = /<meta name="description" content="([^"]*)"/.exec(html)?.[1];

    // Upsert page by slug within the website (idempotent re-runs). Live DB still enforces
    // slug uniqueness TENANT-wide (pre-0016 constraint) → fall back to an abc- prefix.
    const slugCandidates = [r.slug, `abc-${r.slug}`];
    let pExistId: string | null = null; let useSlug = r.slug;
    for (const sl of slugCandidates) {
      const { data: pe } = await sb.from("website_pages").select("id").eq("tenant_id", TENANT).eq("website_id", websiteId).eq("slug", sl).maybeSingle();
      if (pe) { pExistId = (pe as any).id; useSlug = sl; break; }
    }
    const mkRow = (sl: string): Record<string, unknown> => ({
      tenant_id: TENANT, website_id: websiteId, title: r.title, slug: sl,
      is_home: !!r.isHome, is_public: false, order_index: order++,
      draft_sections: finalSections,
      draft_seo: { seo_title: title, ...(desc ? { seo_description: desc } : {}) },
    });
    let pageId: string;
    if (pExistId) {
      const { error } = await sb.from("website_pages").update(mkRow(useSlug)).eq("id", pExistId);
      if (error) { console.log(`  page update FAILED: ${error.message}`); continue; }
      pageId = pExistId;
    } else {
      let inserted: any = null;
      let { data: p, error } = await sb.from("website_pages").insert(mkRow(r.slug)).select("id").single();
      inserted = p;
      if (error && /unique_slug_per_tenant|duplicate key/i.test(error.message)) {
        ({ data: inserted, error } = await sb.from("website_pages").insert(mkRow(`abc-${r.slug}`)).select("id").single());
      }
      if (error) { console.log(`  page insert FAILED: ${error.message}`); continue; }
      pageId = (inserted as any).id;
    }
    const report = await inspectPage(finalSections as any, null, { seo: { seo_title: title, ...(desc ? { seo_description: desc } : {}) } as any });
    console.log(`  page ${pageId} — INSPECTOR score ${report.score}${report.issues.length ? ` (issues: ${report.issues.map((i) => i.code).join(",")})` : ""}`);
    console.log(`  editor: https://app.aibizconnect.app/tenants/${TENANT}/website/${websiteId}  ·  preview: https://app.aibizconnect.app/tenants/${TENANT}/website/preview/${pageId}`);
  }
  // Website theme (fill-empty-only): the captured palette + the site's Google-Fonts stack.
  const { data: brand } = await sb.from("website_brand_settings").select("*").eq("tenant_id", TENANT).eq("website_id", websiteId).maybeSingle();
  const fill: Record<string, unknown> = {};
  const put = (col: string, v: string) => { if (!(brand as any)?.[col]) fill[col] = v; };
  put("primary_color", "#0950c3"); put("secondary_color", "#0f1729"); put("accent_color", "#65758b");
  put("font_heading", "Montserrat Alternates"); put("font_body", "Montserrat");
  if (Object.keys(fill).length) {
    if (brand) await sb.from("website_brand_settings").update(fill).eq("tenant_id", TENANT).eq("website_id", websiteId);
    else await sb.from("website_brand_settings").insert({ tenant_id: TENANT, website_id: websiteId, ...fill });
    console.log(`\ntheme set: ${Object.keys(fill).join(", ")}`);
  }
  console.log("\nDONE");
}
main().catch((e) => { console.error(e); process.exit(1); });
