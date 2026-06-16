// Read-only: list all tenants so we can identify the test tenant vs the protected platform tenant.
// Run: node --env-file=.env.local scripts/list-tenants.mjs
const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SECRET_KEY;
if (!url || !key) { console.log("Missing Supabase URL / service-role key in env."); process.exit(0); }
const res = await fetch(`${url}/rest/v1/tenants?select=*&limit=100`, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
const rows = await res.json();
if (!Array.isArray(rows)) { console.log("Query error:", JSON.stringify(rows).slice(0, 400)); process.exit(0); }
console.log(`columns: ${Object.keys(rows[0] || {}).join(", ")}\n`);
console.log(`${rows.length} tenant(s):\n`);
const f = (t, ...keys) => { for (const k of keys) if (t[k] != null && t[k] !== "") return t[k]; return ""; };
const sorted = rows.sort((a, b) => String(f(b, "created_at", "inserted_at")).localeCompare(String(f(a, "created_at", "inserted_at"))));
for (const t of sorted) {
  console.log(`• id=${t.id}`);
  console.log(`   name:    ${f(t, "name", "business_name", "display_name", "company_name")}`);
  console.log(`   created: ${f(t, "created_at", "inserted_at")}   owner: ${f(t, "owner_email", "owner_id", "created_by")}`);
}
