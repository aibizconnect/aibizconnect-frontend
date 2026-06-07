// Bootstrap the two OWNER tenants (aibizconnect.app + aibizconnect.ca) and an
// admin membership. Mirrors the backend's createTenant(): insert into `tenants`,
// then add the owner to `tenant_users`. Idempotent by slug.
//
// NOTE: there is no real identity/credential layer yet — `user_id` is just an
// identifier. We generate ONE admin user_id (representing admin@aibizconnect.app)
// unless ADMIN_USER_ID is provided. SAVE the printed user_id; it's what you'll put
// in JWT `sub` / x-user-id to act as this admin until real auth is built.
//
// Usage: node scripts/bootstrap-owner-tenants.mjs            (report-only)
//        node scripts/bootstrap-owner-tenants.mjs --commit   (writes to DB)

import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const env = {};
for (const l of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split("\n")) {
  const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}

const COMMIT = process.argv.includes("--commit");
const ADMIN_USER_ID = process.env.ADMIN_USER_ID || randomUUID();

const TENANTS = [
  { name: "AIBizConnect Platform", slug: "aibizconnect-app", domain: "aibizconnect.app" },
  { name: "AIBizConnect Consulting", slug: "aibizconnect-ca", domain: "aibizconnect.ca" },
];

const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

async function ensureTenant(t) {
  const { data: existing } = await sb.from("tenants").select("id").eq("slug", t.slug).maybeSingle();
  if (existing) return { ...t, id: existing.id, created: false };
  if (!COMMIT) return { ...t, id: "(dry — not created)", created: false };
  const { data, error } = await sb.from("tenants").insert({ name: t.name, slug: t.slug }).select("id").single();
  if (error) throw new Error(`create tenant ${t.slug}: ${error.message}`);
  const { error: uErr } = await sb.from("tenant_users").insert({
    tenant_id: data.id, user_id: ADMIN_USER_ID, role: "owner", status: "active",
  });
  if (uErr) throw new Error(`add owner to ${t.slug}: ${uErr.message}`);
  return { ...t, id: data.id, created: true };
}

async function main() {
  if (!COMMIT) console.log("*** REPORT ONLY — pass --commit to write ***\n");
  console.log("Admin user_id (SAVE THIS — represents admin@aibizconnect.app):", ADMIN_USER_ID, "\n");
  const out = [];
  for (const t of TENANTS) out.push(await ensureTenant(t));
  console.log(JSON.stringify({ adminUserId: ADMIN_USER_ID, tenants: out }, null, 2));
}
main().catch((e) => { console.error("FAILED:", e.message); process.exit(1); });
