import { createSupabaseServiceClient } from "../lib/supabase/service";
const P = "d723a086-eac0-4b61-8742-25313370d0b7";
(async () => {
  const sb = createSupabaseServiceClient();
  const del = async (t: string, col = "tenant_id") => {
    const { error, count } = await sb.from(t).delete({ count: "exact" }).eq(col, P);
    console.log(`${t}: ${error ? "ERR " + error.message : `${count} deleted`}`);
  };
  const { count } = await sb.from("website_pages").delete({ count: "exact" }).eq("tenant_id", P).is("website_id", null);
  console.log(`orphan pages: ${count} deleted`);
  await del("website_funnel_edges");
  await del("website_funnels");
  const { count: left } = await sb.from("website_pages").select("*", { count: "exact", head: true }).eq("tenant_id", P);
  console.log(`pages remaining on tenant: ${left}`);
})();
