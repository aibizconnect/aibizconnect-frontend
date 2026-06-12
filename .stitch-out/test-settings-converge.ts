// 0050 verification: tenant_settings has the key/value shape (write+read+delete round
// trip on the test tenant) and tenant_shopify_stores exists. Self-cleaning.
import { createSupabaseServiceClient } from "../lib/supabase/service";
const TEST = "d723a086-eac0-4b61-8742-25313370d0b7";
const ALI = "214ca58a-c76f-48d6-97ec-3f040db3b81f";
const fail = (m: string) => { console.error("FAIL:", m); process.exit(1); };
(async () => {
  const sb = createSupabaseServiceClient();
  const { error: e1 } = await sb.from("tenant_settings").upsert(
    { tenant_id: TEST, setting_key: "converge_probe", setting_value: { ok: true } },
    { onConflict: "tenant_id,setting_key" });
  if (e1) fail(`settings write: ${e1.message}`);
  const { data, error: e2 } = await sb.from("tenant_settings").select("setting_value").eq("tenant_id", TEST).eq("setting_key", "converge_probe").single();
  if (e2 || !(data as any)?.setting_value?.ok) fail(`settings read: ${e2?.message}`);
  await sb.from("tenant_settings").delete().eq("tenant_id", TEST).eq("setting_key", "converge_probe");
  console.log("1. tenant_settings key/value round trip OK");
  const { error: e3 } = await sb.from("tenant_shopify_stores").select("*", { head: true, count: "exact" });
  if (e3) fail(`shopify table: ${e3.message}`);
  console.log("2. tenant_shopify_stores exists OK");
  const { error: e4 } = await sb.from("tenant_settings").select("setting_key").eq("tenant_id", ALI).limit(5);
  if (e4) fail(`Ali tenant read: ${e4.message}`);
  console.log("3. Ali's tenant reads cleanly — ALL CHECKS PASS");
})();
