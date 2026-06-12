// Which tenants have live send channels? (emailReady = verified identity + Resend key;
// twilioReady = stored creds). Names from tenant_settings business_name where present.
import { createClient } from "@supabase/supabase-js";
import { emailReady } from "../lib/server/email-send";
import { twilioReady } from "../lib/server/twilio";

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
(async () => {
  const { data: emailRows } = await sb.from("tenant_email_settings").select("tenant_id, sender_email, status");
  const { data: twilioRows } = await sb.from("tenant_integrations").select("tenant_id, status").eq("provider", "twilio");
  const ids = [...new Set([...(emailRows ?? []).map((r: any) => r.tenant_id), ...(twilioRows ?? []).map((r: any) => r.tenant_id)])];
  for (const t of ids) {
    const e = await emailReady(t);
    const tw = await twilioReady(t);
    const er = (emailRows ?? []).find((r: any) => r.tenant_id === t) as any;
    console.log(`${t}  email: ${e.ok ? `READY (${e.identity?.sender_email})` : `no (${e.reason}${er ? `, row status=${er.status} ${er.sender_email}` : ""})`}  twilio: ${tw ? "READY" : "no"}`);
  }
  if (!ids.length) console.log("no tenants with email settings or twilio rows");
})();
