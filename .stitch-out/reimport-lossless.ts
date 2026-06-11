// LOSSLESS re-import of the Ottawa page (D-183 acceptance): real HTML bands + CSS snapshot + SEO,
// images ingested to the Media Library, page updated IN PLACE (same id → same preview link).
// Also removes this page's global-block refs — the imported header/footer ARE the page's bands
// (this was the duplicate-menu bug).
import { readFileSync, writeFileSync } from "fs";
import { htmlToLosslessSections } from "../lib/sites/lossless-importer";
import { ingestSectionImages } from "../lib/sites/image-ingestion";
import { createSupabaseServiceClient } from "../lib/supabase/service";

const TENANT = "d723a086-eac0-4b61-8742-25313370d0b7";
const PAGE = "6e33e369-490d-46a6-845e-56d47c1be1de";

async function main() {
  const html = readFileSync(".stitch-out/ottawa-lossless.html", "utf8");
  const { sections, seo } = htmlToLosslessSections(html, "https://stitch.googleapis.com");
  console.log("bands:", sections.length, "| seo:", JSON.stringify(seo));
  for (const s of sections) console.log("  -", s.type, (s as any)._name, "| html bytes:", String((s as any).html || (s as any).css || "").length);

  // Ingest every external image to the Media Library via the existing pipeline (fake image
  // sections → rewritten urls → string-replace back into the band html).
  const urls = new Set<string>();
  for (const s of sections) {
    const h = (s as any).html as string | undefined;
    if (!h) continue;
    for (const m of h.matchAll(/src="(https?:\/\/[^"]+)"/g)) urls.add(m[1]);
  }
  console.log("external images:", urls.size);
  if (urls.size) {
    const fake = Array.from(urls).map((url) => ({ type: "image", url }));
    const ingested = (await ingestSectionImages(TENANT, fake as any)) as any[];
    const map = new Map<string, string>();
    Array.from(urls).forEach((u, i) => { const nu = ingested[i]?.url; if (nu && nu !== u) map.set(u, nu); });
    console.log("rewritten:", map.size);
    for (const s of sections) {
      let h = (s as any).html as string | undefined;
      if (!h) continue;
      for (const [from, to] of map) h = h.split(from).join(to);
      (s as any).html = h;
    }
  }

  const supabase = createSupabaseServiceClient();
  // Kill the duplicate header/footer: detach global blocks from THIS page only.
  const { error: refErr, count } = await supabase
    .from("website_page_block_refs")
    .delete({ count: "exact" })
    .eq("tenant_id", TENANT)
    .eq("page_id", PAGE);
  console.log("global block refs removed:", count ?? 0, refErr?.message ?? "");

  const draft_seo: Record<string, unknown> = {};
  if (seo.title) draft_seo.seo_title = seo.title;
  if (seo.description) draft_seo.seo_description = seo.description;
  if (seo.imageUrl) draft_seo.seo_image_url = seo.imageUrl;

  const { error } = await supabase
    .from("website_pages")
    .update({ draft_sections: sections, draft_seo })
    .eq("tenant_id", TENANT)
    .eq("id", PAGE);
  if (error) { console.error("UPDATE FAILED:", error.message); process.exit(1); }
  writeFileSync(".stitch-out/lossless-sections.json", JSON.stringify(sections, null, 1));
  console.log("page updated in place:", PAGE);
}
main().catch((e) => { console.error(e); process.exit(1); });
