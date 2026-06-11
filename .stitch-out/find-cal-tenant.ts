import { createClient } from "@supabase/supabase-js";
const supa = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
(async () => {
  const { data } = await supa.from("tenant_calendars").select("tenant_id,name").limit(3);
  console.log(JSON.stringify(data));
  const { data: a } = await supa.from("tenant_appointments").select("tenant_id,start_at,status").limit(3);
  console.log("appointment rows:", JSON.stringify(a));
})();
