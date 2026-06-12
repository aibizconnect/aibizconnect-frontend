// Reproduce the Settings page server loads for Ali's real tenant to find the thrown error.
const T = "214ca58a-c76f-48d6-97ec-3f040db3b81f";
(async () => {
  const steps: [string, () => Promise<unknown>][] = [
    ["socialProviderReady sweep", async () => {
      const { socialProviderReady, PROVIDERS } = await import("../lib/server/social" as string) as any;
      const out: Record<string, boolean> = {};
      for (const p of Object.keys(PROVIDERS)) out[p] = await socialProviderReady(p);
      return out;
    }],
    ["tenant_social_accounts query", async () => {
      const { createSupabaseServiceClient } = await import("../lib/supabase/service");
      const sb = createSupabaseServiceClient();
      const { data, error } = await sb.from("tenant_social_accounts").select("id").eq("tenant_id", T);
      if (error) throw new Error(error.message);
      return `${(data ?? []).length} rows`;
    }],
    ["getTwilioSettings core", async () => {
      const { getTwilioCreds, twilioReady } = await import("../lib/server/twilio");
      return { creds: !!(await getTwilioCreds(T)), ready: await twilioReady(T) };
    }],
    ["encryptionReady", async () => {
      const { encryptionReady } = await import("../lib/server/encryption");
      return encryptionReady();
    }],
  ];
  for (const [name, fn] of steps) {
    try { console.log(`OK  ${name}:`, JSON.stringify(await fn())); }
    catch (e: any) { console.log(`ERR ${name}: ${e?.message}`); }
  }
})();
