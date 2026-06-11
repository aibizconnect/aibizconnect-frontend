// Why does the abc-consultation booking page show everything? Inspect connections + live busy.
import { createClient } from "@supabase/supabase-js";

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
const T = "d723a086-eac0-4b61-8742-25313370d0b7";

(async () => {
  const { data: cals } = await sb.from("tenant_calendars").select("id,name,slug,start_hour,end_hour,duration_min,timezone").eq("tenant_id", T);
  console.log("calendars:", JSON.stringify(cals, null, 1));
  for (const c of cals ?? []) {
    const { data: conns } = await sb.from("tenant_calendar_connections").select("provider,account_email,external_calendar_id,status,updated_at").eq("tenant_id", T).eq("calendar_id", c.id);
    console.log(`connections for ${c.slug}:`, JSON.stringify(conns ?? [], null, 1));
    if ((conns ?? []).length) {
      const { getAllBusy } = await import("../lib/server/calendar-busy");
      const from = new Date(); const to = new Date(); to.setDate(to.getDate() + 7);
      const busy = await getAllBusy(T, c.id, from.toISOString(), to.toISOString());
      console.log(`getAllBusy(${c.slug}) next 7 days → ${busy.length} intervals`, busy.slice(0, 8).map((b) => `${b.provider}: ${new Date(b.start).toLocaleString()} – ${new Date(b.end).toLocaleTimeString()}`));
    }
  }
})();
