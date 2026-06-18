// What's the email-sending state for the tenant? Run: node --env-file=.env.local scripts/email-state.mjs
import { createClient } from "@supabase/supabase-js";
const TENANT = "d723a086-eac0-4b61-8742-25313370d0b7";
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const { data: es } = await sb.from("tenant_email_settings").select("sender_name, sender_email, esp_provider, status, dns_records_required").eq("tenant_id", TENANT);
console.log("tenant_email_settings rows:", es?.length ?? 0);
for (const r of es ?? []) {
  console.log(`  • ${r.sender_email} (${r.sender_name}) — esp=${r.esp_provider} — STATUS=${r.status}`);
  for (const d of r.dns_records_required ?? []) console.log(`      ${d.type} ${d.name} = ${String(d.value).slice(0,40)}  [${d.status}]`);
}
const { data: sec } = await sb.from("tenant_secrets").select("provider").eq("tenant_id", TENANT);
console.log("tenant_secrets providers:", (sec ?? []).map((s) => s.provider).join(", ") || "(none)");
const { data: ints } = await sb.from("tenant_integrations").select("provider, status").eq("tenant_id", TENANT);
console.log("tenant_integrations:", (ints ?? []).map((i) => `${i.provider}=${i.status}`).join(", ") || "(none)");
console.log("global RESEND_API_KEY present in this env:", !!process.env.RESEND_API_KEY);
