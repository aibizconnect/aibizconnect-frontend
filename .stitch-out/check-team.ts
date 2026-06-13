import { createSupabaseServiceClient } from "../lib/supabase/service";
const P = "d723a086-eac0-4b61-8742-25313370d0b7";
(async () => {
  const sb = createSupabaseServiceClient();
  const { data, error } = await sb.from("tenant_users").select("*").eq("tenant_id", P);
  console.log("tenant_users rows:", error ? "ERR " + error.message : JSON.stringify(data, null, 1));
  // probe columns
  for (const col of ["role", "status", "assigned_only", "email", "user_id", "name"]) {
    const { error: e } = await sb.from("tenant_users").select(col).limit(1);
    console.log(`  col ${col}: ${e ? "MISSING" : "ok"}`);
  }
  const { error: orgErr } = await sb.from("organizations").select("id").limit(1);
  console.log("organizations table:", orgErr ? "MISSING" : "exists");
  const { error: tOrgErr } = await sb.from("tenants").select("organization_id").limit(1);
  console.log("tenants.organization_id:", tOrgErr ? "MISSING" : "exists");
})();
