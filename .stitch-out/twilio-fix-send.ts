import { createSupabaseServiceClient } from "../lib/supabase/service";
import { sendSms } from "../lib/server/twilio";
const ALI = "214ca58a-c76f-48d6-97ec-3f040db3b81f";
(async () => {
  const sb = createSupabaseServiceClient();
  const { error } = await sb.from("tenant_integrations").upsert(
    { tenant_id: ALI, provider: "twilio", status: "connected", config: { from_number: "+18502045136" }, updated_at: new Date().toISOString() },
    { onConflict: "tenant_id,provider" },
  );
  if (error) { console.log("upsert failed:", error.message); return; }
  console.log("config row upserted (from_number=+18502045136)");
  const r = await sendSms(ALI, { to: "+14167277111", body: "AIBizConnect test - your Twilio SMS channel is live. Hour-before appointment reminders will arrive like this." });
  console.log("send:", JSON.stringify(r));
})();
