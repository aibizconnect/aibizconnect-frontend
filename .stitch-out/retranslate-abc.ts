// OFFLINE re-translate of the ABC SalesMaster capture (fidelity round 2 — Ali's editor
// re-inspection caught: gradient CTA bg dropped, footer © swallowed, ghost grid column).
// Reads the SAVED snapshots (.stitch-out/abc-mirror/rendered) instead of the render bridge,
// re-runs the fixed importer, and updates the existing pages in place (upsert by slug).
import { readFileSync } from "fs";
import { htmlToSections } from "../lib/sites/html-importer";
import { ingestSectionImages } from "../lib/sites/image-ingestion";
import { inspectPage } from "../lib/sites/inspector";
import { sectionSchema } from "../lib/sections/schemas";
import { createSupabaseServiceClient } from "../lib/supabase/service";

const TENANT = "214ca58a-c76f-48d6-97ec-3f040db3b81f";
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
const LINK_MAP = new Map<string, string>(ROUTES.map((r) => [r.route, r.isHome ? "/" : `/${r.slug}`]));
LINK_MAP.set("/company/about", "/abc-about"); // tenant-wide slug collision fallback
const ORIGIN = "https://aibizconnect.app";
function mapHref(v: string): string {
  let path = v;
  if (path.startsWith(ORIGIN + "/") || path === ORIGIN) path = path.slice(ORIGIN.length) || "/";
  if (!path.startsWith("/")) return v;
  const clean = path.length > 1 ? path.replace(/[/]+$/, "") : path;
  return LINK_MAP.get(clean) ?? clean;
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

(async () => {
  const sb = createSupabaseServiceClient();
  const { data: w } = await sb.from("websites").select("id").eq("tenant_id", TENANT).eq("slug", "abc-salesmaster").maybeSingle();
  if (!w) { console.error("FAIL: website abc-salesmaster not found"); process.exit(1); }
  const websiteId = (w as any).id;
  console.log(`website: ${websiteId}`);

  for (const r of ROUTES) {
    const html = readFileSync(`.stitch-out/abc-mirror/rendered/${r.slug}.html`, "utf8");
    let raw: any[];
    try { raw = htmlToSections(html, BASE, { faithful: true }) as any[]; }
    catch (e: any) { console.log(`${r.slug}: translate FAILED: ${e?.message}`); continue; }
    const sections = raw.filter((s) => sectionSchema.safeParse(s).success);
    if (!sections.length) { console.log(`${r.slug}: SKIP (nothing renderable)`); continue; }

    let finalSections = sections;
    try { finalSections = (await ingestSectionImages(TENANT, sections as any, { websiteId })) as any[]; }
    catch { console.log(`${r.slug}: (image ingestion failed — keeping source URLs)`); }
    remapLinks(finalSections);

    const { data: pe } = await sb.from("website_pages").select("id, slug, draft_seo").eq("tenant_id", TENANT)
      .eq("website_id", websiteId).in("slug", [r.slug, `abc-${r.slug}`]).limit(1).maybeSingle();
    if (!pe) { console.log(`${r.slug}: PAGE MISSING — run capture-abc-site.ts first`); continue; }
    const { error } = await sb.from("website_pages").update({ draft_sections: finalSections }).eq("id", (pe as any).id);
    if (error) { console.log(`${r.slug}: update FAILED ${error.message}`); continue; }
    const report = await inspectPage(finalSections as any, null, { seo: (pe as any).draft_seo ?? {} });
    const ctaBg = JSON.stringify(finalSections).includes("linear-gradient") ? "gradient✓" : "no-gradient";
    const hasCopy = JSON.stringify(finalSections).includes("©") ? "©✓" : "NO-©";
    console.log(`${r.slug}: ${finalSections.length} rows, score ${report.score}, ${ctaBg}, ${hasCopy}${report.issues.length ? ` issues:${report.issues.map((i: any) => i.code).join(",")}` : ""}`);
  }
  console.log("DONE");
})();
