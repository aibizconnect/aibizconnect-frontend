// One-off: print the tenant's non-secret Twilio integration config so we can confirm
// inbound-SMS matching (To number → from_number) will resolve. No secrets printed.
import { createClient } from "@supabase/supabase-js";

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const { data, error } = await sb.from("tenant_integrations").select("tenant_id, provider, config, status").eq("provider", "twilio");
if (error) { console.error("ERR", error.message); process.exit(1); }
for (const r of data ?? []) {
  const c = r.config ?? {};
  console.log(JSON.stringify({
    tenant_id: r.tenant_id,
    status: r.status,
    from_number: c.from_number ?? null,
    messaging_service_sid: c.messaging_service_sid ?? null,
    status_callback_url: c.status_callback_url ?? null,
    config_keys: Object.keys(c),
  }, null, 2));
}
if (!data?.length) console.log("No twilio integration rows found.");
