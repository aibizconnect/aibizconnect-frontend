// Inspect a widget registration row by domain (email, key, created_at).
import { createClient } from "@supabase/supabase-js";

const DOMAIN = process.argv[2] || "gtaluxuryhomes.ca";
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const { data } = await sb.from("occasion_widget_sites").select("key, name, email, domain, active, verified, created_at, updated_at").eq("domain", DOMAIN).maybeSingle();
console.log(JSON.stringify(data, null, 2));
if (data?.key) console.log("\nControl-panel (manage) link:\n  https://app.aibizconnect.app/tools/occasions/manage?k=" + data.key);
