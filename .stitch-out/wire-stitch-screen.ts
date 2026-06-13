// Wire a generated Stitch screen into our element tree (D-287 proof): render the screen
// URL through the bridge (stamps data-cs), translate to native elements, create the page,
// QA with the Inspector. Usage: SCREEN_URL=<downloadUrl> npx tsx wire-stitch-screen.ts
import { readFileSync, writeFileSync } from "fs";
import { htmlToSections } from "../lib/sites/html-importer";
import { ingestSectionImages } from "../lib/sites/image-ingestion";
import { inspectPage } from "../lib/sites/inspector";
import { sectionSchema } from "../lib/sections/schemas";
import { createSupabaseServiceClient } from "../lib/supabase/service";

const P = "d723a086-eac0-4b61-8742-25313370d0b7";
const SCREEN_URL = process.env.SCREEN_URL!;
const RENDER = (process.env.SITE_RENDER_URL || "").replace(/\/+$/, "");
let TOKEN = process.env.SITE_RENDER_TOKEN || "";
try { if (!TOKEN) TOKEN = readFileSync(".stitch-out/render-token.txt", "utf8").trim().replace(/^SITE_RENDER_TOKEN=/, ""); } catch {}

(async () => {
  if (!SCREEN_URL) { console.error("set SCREEN_URL"); process.exit(1); }
  // 1. Render through the bridge → data-cs computed styles
  const r = await fetch(`${RENDER}/render?url=${encodeURIComponent(SCREEN_URL)}&token=${encodeURIComponent(TOKEN)}`);
  if (!r.ok) { console.error("bridge", r.status, (await r.text()).slice(0,200)); process.exit(1); }
  const html = await r.text();
  writeFileSync(".stitch-out/abc-v2-rendered.html", html);
  console.log(`rendered: ${(html.length/1024).toFixed(0)} KB, data-cs: ${html.includes("data-cs")}`);

  // 2. Translate to native elements
  const raw = htmlToSections(html, "https://stitch.local", { faithful: true }) as any[];
  const sections = raw.filter((s) => sectionSchema.safeParse(s).success);
  console.log(`native sections: ${sections.length}/${raw.length} — ${sections.map((s:any)=>s._name||s.type).join(" | ")}`);

  // 3. Ingest images
  const sb = createSupabaseServiceClient();
  let websiteId: string;
  const { data: w } = await sb.from("websites").select("id").eq("tenant_id", P).eq("slug", "main").maybeSingle();
  websiteId = (w as any)?.id;
  if (!websiteId) { const ins = await sb.from("websites").insert({ tenant_id: P, name: "AI Biz Connect", slug: "abc-v2", is_primary: true }).select("id").single(); websiteId = (ins.data as any).id; }
  let finalSections = sections;
  try { finalSections = (await ingestSectionImages(P, sections as any, { websiteId })) as any[]; } catch { console.log("(img ingest skipped)"); }

  // 4. Create page
  const { data: existing } = await sb.from("website_pages").select("id").eq("tenant_id", P).eq("website_id", websiteId).eq("slug", "home-v2").maybeSingle();
  const row = { tenant_id: P, website_id: websiteId, title: "Home (Stitch v2)", slug: "home-v2", is_home: false, is_public: false, order_index: 0, draft_sections: finalSections, draft_seo: { seo_title: "AI Biz Connect" } };
  let pageId: string;
  if (existing) { await sb.from("website_pages").update(row).eq("id", (existing as any).id); pageId = (existing as any).id; }
  else { const ins = await sb.from("website_pages").insert(row).select("id").single(); pageId = (ins.data as any).id; }

  // 5. QA
  const report = await inspectPage(finalSections as any, null, { checkImages: false, seo: { seo_title: "AI Biz Connect" } as any });
  const fallbacks = finalSections.filter((s:any)=>s.type==="imported-html"||s.type==="html").length;
  console.log(`\nINSPECTOR score: ${report.score} | issues: ${report.issues.map((i:any)=>i.code).join(",")||"none"}`);
  console.log(`fallback (html/imported-html) sections: ${fallbacks}`);
  console.log(`editor: https://app.aibizconnect.app/tenants/${P}/website/${websiteId}  · preview: https://app.aibizconnect.app/tenants/${P}/website/preview/${pageId}`);
})();
