// Reconcile the placeholder admin user_id to the REAL Supabase auth user id (sub)
// after admin@aibizconnect.app signs up via /login. Updates the owner rows in
// tenant_users so the real login owns both AIBizConnect tenants.
//
// Find the Supabase user id: Supabase dashboard -> Authentication -> Users, or it
// is the `sub` in the JWT after sign-in.
//
// Usage: node scripts/link-admin-supabase-user.mjs <SUPABASE_USER_UUID>

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = {};
for (const l of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split("\n")) {
  const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}

const PLACEHOLDER = "0fb27063-3a54-4aa0-9577-bde6182e1456"; // from bootstrap
const NEW_SUB = process.argv[2];
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
if (!NEW_SUB || !UUID_RE.test(NEW_SUB) || NEW_SUB === PLACEHOLDER) {
  console.error("Usage: node scripts/link-admin-supabase-user.mjs <real-supabase-user-uuid>");
  process.exit(1);
}

const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

async function main() {
  const { data, error } = await sb
    .from("tenant_users")
    .update({ user_id: NEW_SUB })
    .eq("user_id", PLACEHOLDER)
    .select("tenant_id, role, status");
  if (error) throw new Error(error.message);
  console.log(`Reconciled ${data.length} membership row(s) to Supabase user ${NEW_SUB}:`);
  console.log(JSON.stringify(data, null, 2));
  console.log("\nThe real admin@aibizconnect.app login now owns both tenants.");
}
main().catch((e) => { console.error("FAILED:", e.message); process.exit(1); });
