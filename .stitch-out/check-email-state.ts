import { createSupabaseServiceClient } from "../lib/supabase/service";
import { getIntegrationSecret } from "../lib/server/integrations";
import { emailReady } from "../lib/server/email-send";
const P = "d723a086-eac0-4b61-8742-25313370d0b7";
(async () => {
  const sb = createSupabaseServiceClient();
  const { data, error } = await sb.from("tenant_email_settings").select("*").eq("tenant_id", P);
  console.log("tenant_email_settings:", error ? "ERR " + error.message : JSON.stringify(data, null, 1).slice(0, 600));
  const sec = await getIntegrationSecret(P, "resend").catch(() => null);
  console.log("resend tenant secret:", sec ? `present (key ends ${String((sec as any).api_key).slice(-4)})` : "none");
  const ready = await emailReady(P);
  console.log("emailReady:", JSON.stringify(ready));
})();
