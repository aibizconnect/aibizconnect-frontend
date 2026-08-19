// Check whether the platform tenant can send transactional email (verified identity + Resend key).
import { createClient } from "@supabase/supabase-js";

const TENANT = "d723a086-eac0-4b61-8742-25313370d0b7";
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const { data: settings } = await sb.from("tenant_email_settings").select("sender_email, sender_name, status").eq("tenant_id", TENANT).maybeSingle();
console.log("tenant_email_settings:", settings || "(none)");

// integration secret presence (don't print the key)
const { data: integ } = await sb.from("tenant_integrations").select("provider, status").eq("tenant_id", TENANT).eq("provider", "resend").maybeSingle();
console.log("resend integration row:", integ || "(none)");
