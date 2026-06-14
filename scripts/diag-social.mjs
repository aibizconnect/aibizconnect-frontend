// One-off: list connected social accounts for the tenant (non-secret fields only).
import { createClient } from "@supabase/supabase-js";
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const TENANT = "d723a086-eac0-4b61-8742-25313370d0b7";
const { data, error } = await sb.from("tenant_social_accounts")
  .select("provider, account_name, account_username, account_type, status, token_expires_at, created_at")
  .eq("tenant_id", TENANT).order("created_at", { ascending: false });
if (error) { console.error("ERR", error.message); process.exit(1); }
if (!data?.length) { console.log("No social accounts connected yet."); process.exit(0); }
for (const r of data) console.log(JSON.stringify(r));
console.log(`\n${data.length} connected account(s).`);
