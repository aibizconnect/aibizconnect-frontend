import { createSupabaseServiceClient } from "../lib/supabase/service";
const TENANT = "214ca58a-c76f-48d6-97ec-3f040db3b81f";
const WEBSITE = "e53089f3-b078-4ef9-8e04-aba951ef520f";
function deepHrefs(o: unknown, out: string[] = []): string[] {
  if (Array.isArray(o)) o.forEach((x) => deepHrefs(x, out));
  else if (o && typeof o === "object") for (const [k, v] of Object.entries(o)) {
    if ((k === "href" || k === "url") && typeof v === "string" && v) out.push(`${k}:${v}`);
    else deepHrefs(v, out);
  }
  return out;
}
(async () => {
  const sb = createSupabaseServiceClient();
  const { data: page } = await sb.from("website_pages").select("draft_sections").eq("tenant_id", TENANT).eq("website_id", WEBSITE).eq("slug", "home").single();
  const links = [...new Set(deepHrefs((page as any).draft_sections))];
  console.log(links.slice(0, 40).join("\n"));
})();
