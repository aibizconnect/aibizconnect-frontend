import { createClient } from "@supabase/supabase-js";
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
const T = "d723a086-eac0-4b61-8742-25313370d0b7";
(async () => {
  await sb.from("tenant_appointments").delete().eq("tenant_id", T).eq("email", "reminder-test@example.com");
  await sb.from("tenant_contacts").delete().eq("tenant_id", T).eq("email", "reminder-test@example.com");
  console.log("cleaned");
})();
