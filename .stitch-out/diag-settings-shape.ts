import { createSupabaseServiceClient } from "../lib/supabase/service";
(async () => {
  const sb = createSupabaseServiceClient();
  const { data, error } = await sb.from("tenant_settings").select("*").limit(2);
  console.log("tenant_settings sample:", JSON.stringify(data), error?.message ?? "");
  for (const t of ["tenant_integrations", "tenant_secrets", "tenant_email_settings", "tenant_social_accounts", "tenant_tags", "tenant_custom_values", "tenant_scoring_rules", "tenant_onboarding"]) {
    const { error: e } = await sb.from(t).select("*", { head: true, count: "exact" });
    console.log(`${t}: ${e ? "ERR " + e.message : "exists"}`);
  }
})();
