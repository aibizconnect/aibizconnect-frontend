import { inspectPage } from "../lib/sites/inspector";
import { createSupabaseServiceClient } from "../lib/supabase/service";
async function main() {
  const sb = createSupabaseServiceClient();
  const { data: page } = await sb.from("website_pages")
    .select("draft_sections, custom_css")
    .eq("id", "6e33e369-490d-46a6-845e-56d47c1be1de").single();
  const report = await inspectPage((page?.draft_sections as any[]) || [], page?.custom_css as string);
  console.log(JSON.stringify(report, null, 1));
}
main().catch((e) => { console.error(e); process.exit(1); });
