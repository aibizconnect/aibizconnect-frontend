import { createSupabaseServiceClient } from "../lib/supabase/service";
const TENANT = "214ca58a-c76f-48d6-97ec-3f040db3b81f";
const WEBSITE = "e53089f3-b078-4ef9-8e04-aba951ef520f";
(async () => {
  const sb = createSupabaseServiceClient();
  const { data: page } = await sb.from("website_pages").select("id, draft_sections").eq("tenant_id", TENANT).eq("website_id", WEBSITE).eq("slug", "home").maybeSingle();
  const secs = (page as any).draft_sections as any[];
  console.log(`home: ${secs.length} top-level rows`);
  secs.forEach((s, i) => {
    const st = s._style || {};
    const kids = Array.isArray(s.children) ? s.children.flat().length : 0;
    const txt = JSON.stringify(s).match(/"text":"([^"]{0,40})/)?.[1] ?? "";
    console.log(`${String(i).padStart(2)}: ${s.type}/${s._name || ""} cols=${s.columns ?? "-"} kids=${kids} bg=${st.bg ?? "-"} bgImage=${st.bgImage ? "yes" : "-"} | "${txt}"`);
  });
  // detail: last three rows full-ish
  for (const s of secs.slice(-3)) console.log("\nLAST-ROW JSON:", JSON.stringify(s).slice(0, 1500));
})();
