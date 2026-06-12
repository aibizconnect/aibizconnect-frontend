import { createSupabaseServiceClient } from "../lib/supabase/service";
(async () => {
  const sb = createSupabaseServiceClient();
  for (const t of ["tenant_integrations", "tenant_secrets", "tenant_settings", "tenant_shopify_stores"]) {
    const { count, error } = await sb.from(t).select("*", { head: true, count: "exact" });
    console.log(`${t}: ${error ? "ERR " + error.message : `exists (${count} rows)`}`);
  }
  const { data, error } = await sb.from("tenant_integrations").select("tenant_id, provider, status").limit(10);
  console.log("rows:", JSON.stringify(data), error?.message ?? "");
})();
