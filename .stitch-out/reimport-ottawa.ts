// Re-import the Ottawa Mortgage autonomous page IN PLACE (same page id → Ali's links keep working)
// using the fixed importer + image ingestion. Source = the existing rendered capture.
import { readFileSync } from "fs";
import { htmlToSections } from "../lib/sites/html-importer";
import { ingestSectionImages } from "../lib/sites/image-ingestion";
import { createSupabaseServiceClient } from "../lib/supabase/service";

const TENANT = "d723a086-eac0-4b61-8742-25313370d0b7";
const PAGE = "6e33e369-490d-46a6-845e-56d47c1be1de";

async function main() {
  const html = readFileSync(".stitch-out/ottawa-rendered.html", "utf8");
  const sections = (htmlToSections as any)(html, "https://stitch.googleapis.com", { faithful: true });
  console.log("sections:", sections.length);

  const finalSections = await ingestSectionImages(TENANT, sections as any);

  const supabase = createSupabaseServiceClient();
  const { error } = await supabase
    .from("website_pages")
    .update({ draft_sections: finalSections })
    .eq("tenant_id", TENANT)
    .eq("id", PAGE);
  if (error) { console.error("UPDATE FAILED:", error.message); process.exit(1); }
  console.log("page updated in place:", PAGE);
}
main().catch((e) => { console.error(e); process.exit(1); });
