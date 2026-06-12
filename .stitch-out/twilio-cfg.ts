import { createSupabaseServiceClient } from "../lib/supabase/service";
const ALI = "214ca58a-c76f-48d6-97ec-3f040db3b81f";
(async () => {
  const sb = createSupabaseServiceClient();
  const { data } = await sb.from("tenant_integrations").select("provider, config").eq("tenant_id", ALI).eq("provider", "twilio");
  console.log(JSON.stringify(data));
})();
