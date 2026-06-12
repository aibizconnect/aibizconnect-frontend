import { getTwilioCreds, sendSms } from "../lib/server/twilio";
import { createSupabaseServiceClient } from "../lib/supabase/service";
const ALI = "214ca58a-c76f-48d6-97ec-3f040db3b81f";
(async () => {
  const c = await getTwilioCreds(ALI);
  if (!c) { console.log("no creds"); return; }
  const auth = "Basic " + Buffer.from(`${c.account_sid}:${c.auth_token}`).toString("base64");
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${c.account_sid}/IncomingPhoneNumbers.json?PageSize=10`, { headers: { Authorization: auth } });
  const j: any = await res.json().catch(() => ({}));
  if (!res.ok) { console.log(`list failed ${res.status}: ${j?.message}`); return; }
  const nums = (j?.incoming_phone_numbers ?? []).filter((n: any) => n.capabilities?.sms);
  console.log(`SMS-capable numbers: ${nums.map((n: any) => n.phone_number).join(", ") || "NONE"}`);
  if (nums.length === 1) {
    // Exactly one — save it as the from-number and fire the test Ali asked for.
    const sb = createSupabaseServiceClient();
    const { data } = await sb.from("tenant_integrations").select("config").eq("tenant_id", ALI).eq("provider", "twilio").maybeSingle();
    const config = { ...((data as any)?.config ?? {}), from_number: nums[0].phone_number };
    await sb.from("tenant_integrations").update({ config, updated_at: new Date().toISOString() }).eq("tenant_id", ALI).eq("provider", "twilio");
    console.log(`saved from_number=${nums[0].phone_number}`);
    const r = await sendSms(ALI, { to: "+14167277111", body: "AIBizConnect test - your Twilio SMS channel is live. Hour-before appointment reminders will arrive like this." });
    console.log(`send: ${JSON.stringify(r)}`);
  }
})();
