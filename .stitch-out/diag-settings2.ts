// Probe the remaining Settings card cores for Ali's real tenant.
const T = "214ca58a-c76f-48d6-97ec-3f040db3b81f";
(async () => {
  const steps: [string, () => Promise<unknown>][] = [
    ["getKycStatus", async () => { const { getKycStatus } = await import("../lib/server/kyc"); return await getKycStatus(T); }],
    ["kycProviderReady", async () => { const { kycProviderReady } = await import("../lib/server/kyc"); return await kycProviderReady(); }],
    ["shopify list core", async () => {
      const { createSupabaseServiceClient } = await import("../lib/supabase/service");
      const sb = createSupabaseServiceClient();
      const { data, error } = await sb.from("tenant_shopify_stores").select("id").eq("tenant_id", T);
      if (error) throw new Error(error.message);
      return `${(data ?? []).length} rows`;
    }],
    ["payments secrets", async () => {
      const { getIntegrationSecret } = await import("../lib/server/integrations");
      return { stripe: !!(await getIntegrationSecret(T, "stripe").catch(() => null)), paypal: !!(await getIntegrationSecret(T, "paypal").catch(() => null)) };
    }],
    ["business profile rows", async () => {
      const { createSupabaseServiceClient } = await import("../lib/supabase/service");
      const sb = createSupabaseServiceClient();
      const { data, error } = await sb.from("tenant_settings").select("setting_key").eq("tenant_id", T).limit(30);
      if (error) throw new Error(error.message);
      return (data ?? []).map((r: any) => r.setting_key).join(",") || "none";
    }],
    ["tenant exists", async () => {
      const { createSupabaseServiceClient } = await import("../lib/supabase/service");
      const sb = createSupabaseServiceClient();
      const { data } = await sb.from("tenants").select("id,name").eq("id", T).maybeSingle();
      return data ?? "NO ROW in tenants table";
    }],
  ];
  for (const [name, fn] of steps) {
    try { console.log(`OK  ${name}:`, JSON.stringify(await fn())); }
    catch (e: any) { console.log(`ERR ${name}: ${e?.message}`); }
  }
})();
