import { createSupabaseServiceClient } from "../lib/supabase/service";
const TENANT = "214ca58a-c76f-48d6-97ec-3f040db3b81f";
const WEBSITE = "e53089f3-b078-4ef9-8e04-aba951ef520f";
(async () => {
  const sb = createSupabaseServiceClient();
  const { data: page } = await sb.from("website_pages").select("draft_sections").eq("tenant_id", TENANT).eq("website_id", WEBSITE).eq("slug", "home").maybeSingle();
  const secs = (page as any).draft_sections as any[];
  const footer = secs[secs.length - 1];
  const cell = footer.children[0] as any[];
  console.log(`footer row: ${cell.length} blocks in cell`);
  cell.forEach((b: any, i: number) => {
    const txt = JSON.stringify(b);
    console.log(`\n[${i}] type=${b.type} name=${b._name ?? ""} :: ${txt.slice(0, 220)}${txt.length > 220 ? " …" : ""}`);
    if (b.type === "row") (b.children as any[]).flat().forEach((c: any, j: number) => console.log(`    col-block ${j}: ${JSON.stringify(c).slice(0, 120)}`));
  });
})();
