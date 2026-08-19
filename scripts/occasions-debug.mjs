// Debug: check what "today" the server sees and if Father's Day should render
import { createClient } from "@supabase/supabase-js";

const KEY = process.argv[2] || "ocw_3eb5c0909e9c4297ba0c";
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const { data } = await sb.from("occasion_widget_sites").select("key, domain, occasions").eq("key", KEY).maybeSingle();
if (!data) { console.error("No widget row for", KEY); process.exit(1); }

const now = new Date();
console.log("SERVER TIME:", now.toISOString(), `(${now.toLocaleDateString()})`);
console.log("WIDGET:", data.domain);

// Debug the Father's Day logic
const cfg = data.occasions;
const fathersday = cfg?.banners?.["us-fathers-day"];
console.log("\nFather's Day banner config:", JSON.stringify(fathersday, null, 2));
if (fathersday) {
  console.log("  enabled?", fathersday.enabled);
  if (fathersday.startDate) {
    const s = new Date(fathersday.startDate + "T00:00:00");
    const e = new Date((fathersday.endDate || fathersday.startDate) + "T23:59:59");
    console.log("  Window: start=", s.toISOString(), "end=", e.toISOString());
    console.log("  Today UTC:", now.toISOString());
    console.log("  Within window?", now >= s && now <= e);
  }
}
