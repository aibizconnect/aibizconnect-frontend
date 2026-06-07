// Cycle 3 — attach a user to a tenant with a role (TEMPLATE).
//
// Targets a `tenant_users` membership table that DOES NOT EXIST in this Supabase
// yet (see docs/cycle3-bootstrap-and-agent-endpoint.md -> "DDL (quarantined)").
// Therefore this is REPORT-ONLY unless --commit AND the table exists. It does NOT
// create the table (no DDL), does NOT fabricate ids, and uses a symbolic tenant.
//
// Usage (report-only): node scripts/attach-admin-to-tenant.mjs <TENANT_UUID> <USER_UUID>
// Usage (live):        node scripts/attach-admin-to-tenant.mjs <TENANT_UUID> <USER_UUID> --commit

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
function loadEnv(f) {
  const o = {};
  try { for (const l of readFileSync(join(root, f), "utf8").split("\n")) { const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/); if (m) o[m[1]] = m[2].replace(/^["']|["']$/g, ""); } } catch {}
  return o;
}
const env = { ...loadEnv(".env"), ...loadEnv(".env.local") };

const ARGS = process.argv.slice(2);
const COMMIT = ARGS.includes("--commit");
const [TENANT_ID, USER_ID] = ARGS.filter((a) => !a.startsWith("--"));
const ROLE = process.env.MEMBER_ROLE || "admin"; // superadmin|admin|editor|viewer
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

if (!TENANT_ID || !USER_ID || !UUID_RE.test(TENANT_ID) || !UUID_RE.test(USER_ID)) {
  console.error("Usage: node scripts/attach-admin-to-tenant.mjs <TENANT_UUID> <USER_UUID> [--commit]");
  console.error("(Both must be real UUIDs. Symbolic <...> values are rejected.)");
  process.exit(1);
}

const membership = { tenant_id: TENANT_ID, user_id: USER_ID, role: ROLE };

async function main() {
  if (!COMMIT) {
    console.log("REPORT ONLY — would upsert membership into `tenant_users`:");
    console.log(JSON.stringify(membership, null, 2));
    console.log("\nNOTE: `tenant_users` is not in the current schema. Create it via the DDL queue first, then re-run with --commit.");
    return;
  }
  const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  const { error } = await sb.from("tenant_users").upsert(membership, { onConflict: "tenant_id,user_id" });
  if (error) throw new Error(`attach failed (does tenant_users exist?): ${error.message}`);
  console.log("ATTACHED:", JSON.stringify(membership, null, 2));
}

main().catch((e) => { console.error("FAILED:", e.message); process.exit(1); });
