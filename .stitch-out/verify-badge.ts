import { createSupabaseServiceClient } from "../lib/supabase/service";
const TENANT = "214ca58a-c76f-48d6-97ec-3f040db3b81f";
const WEBSITE = "e53089f3-b078-4ef9-8e04-aba951ef520f";
(async () => {
  const sb = createSupabaseServiceClient();
  const { data: page } = await sb.from("website_pages").select("draft_sections").eq("tenant_id", TENANT).eq("website_id", WEBSITE).eq("slug", "pricing").maybeSingle();
  const m = JSON.stringify((page as any).draft_sections).match(/.{0,160}Most Popular.{0,60}/);
  console.log("badge JSON:", m?.[0]);
})();
