import { createSupabaseServiceClient } from "../lib/supabase/service";
const T = { consulting: "214ca58a-c76f-48d6-97ec-3f040db3b81f", platform: "d723a086-eac0-4b61-8742-25313370d0b7" };
(async () => {
  const sb = createSupabaseServiceClient();
  for (const [name, id] of Object.entries(T)) {
    const { data, error } = await sb.from("tenant_integrations").select("provider, config, status, updated_at").eq("tenant_id", id);
    console.log(`\n${name} (${id.slice(0, 8)}…): ${error ? "ERR " + error.message : ""}`);
    for (const r of (data ?? []) as any[]) console.log(`  ${r.provider}  status=${r.status ?? "-"}  config=${JSON.stringify(r.config)?.slice(0, 140)}  updated=${r.updated_at}`);
  }
  const { data: sec, error: e2 } = await sb.from("tenant_integration_secrets").select("tenant_id, provider, secret_key").in("tenant_id", Object.values(T));
  console.log(`\nsecrets: ${e2 ? "ERR " + e2.message : ""}`);
  for (const r of (sec ?? []) as any[]) console.log(`  ${r.tenant_id.slice(0, 8)}…  ${r.provider}  ${r.secret_key}`);
})();
