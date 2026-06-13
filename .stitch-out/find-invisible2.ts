import { createSupabaseServiceClient } from "../lib/supabase/service";
import { inspectPage } from "../lib/sites/inspector";
const TENANT = "214ca58a-c76f-48d6-97ec-3f040db3b81f";
const WEBSITE = "e53089f3-b078-4ef9-8e04-aba951ef520f";
(async () => {
  const sb = createSupabaseServiceClient();
  const { data: page } = await sb.from("website_pages").select("draft_sections, draft_seo").eq("tenant_id", TENANT).eq("website_id", WEBSITE).eq("slug", "home").maybeSingle();
  const report = await inspectPage((page as any).draft_sections, null, { checkImages: false, seo: (page as any).draft_seo });
  for (const i of report.issues.filter((x) => x.code === "text-invisible")) console.log(`${i.where}: ${i.message}`);
})();
