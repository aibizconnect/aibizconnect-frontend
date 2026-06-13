import { createSupabaseServiceClient } from "../lib/supabase/service";
const C = "214ca58a-c76f-48d6-97ec-3f040db3b81f";
const W = "e53089f3-b078-4ef9-8e04-aba951ef520f";
(async () => {
  const sb = createSupabaseServiceClient();
  const { data: page } = await sb.from("website_pages").select("id, draft_sections").eq("website_id", W).eq("slug", "home").maybeSingle();
  const json = JSON.stringify((page as any).draft_sections);
  for (const m of json.matchAll(new RegExp(`.{0,120}${C}.{0,60}`, "g"))) console.log("CONTEXT:", m[0], "\n");
})();
