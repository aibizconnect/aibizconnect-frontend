// ALI'S SUPREME RULE (D-216): re-import Ottawa as 100% NATIVE elements via the translator
// (htmlToSections faithful, carrying D-169..D-176). Clears the page-level design CSS (native
// elements style themselves + theme). Same page id — links unchanged.
import { readFileSync } from "fs";
import { htmlToSections } from "../lib/sites/html-importer";
import { ingestSectionImages } from "../lib/sites/image-ingestion";
import { inspectPage } from "../lib/sites/inspector";
import { createSupabaseServiceClient } from "../lib/supabase/service";

const TENANT = "d723a086-eac0-4b61-8742-25313370d0b7";
const PAGE = "6e33e369-490d-46a6-845e-56d47c1be1de";

async function main() {
  const html = readFileSync(".stitch-out/ottawa-rendered.html", "utf8");
  const sections = (htmlToSections as any)(html, "https://stitch.googleapis.com", { faithful: true });
  console.log("native sections:", sections.length, sections.map((s: any) => s._name || s.type).join(" | "));
  const finalSections = await ingestSectionImages(TENANT, sections as any);
  const sb = createSupabaseServiceClient();
  const { data: page } = await sb.from("website_pages").select("draft_seo").eq("id", PAGE).single();
  const { error } = await sb.from("website_pages")
    .update({ draft_sections: finalSections, custom_css: null })
    .eq("tenant_id", TENANT).eq("id", PAGE);
  if (error) { console.error("FAILED:", error.message); process.exit(1); }
  const report = await inspectPage(finalSections as any, null, { seo: (page?.draft_seo as any) ?? null });
  console.log("INSPECTOR:", JSON.stringify({ ok: report.ok, score: report.score, issues: report.issues.map((i) => i.code) }));
  console.log("page updated in place:", PAGE);
}
main().catch((e) => { console.error(e); process.exit(1); });
