// LOCAL-ONLY: un-pause the aibizconnect.ca widget site, verify its live feed, and check whether the
// embed snippet is actually installed on the live page. Run:
//   node --env-file=.env.local scripts/occasions-fix-abc.mjs
import { createClient } from "@supabase/supabase-js";
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const KEY = "ocw_4a1be2208ff14ca0bffb";

const { error } = await sb.from("occasion_widget_sites").update({ active: true }).eq("key", KEY);
console.log("un-pause:", error ? error.message : "OK → active=true");

const ld = new Date().toISOString().slice(0, 10);
const feed = await (await fetch(`https://app.aibizconnect.app/api/occasions-widget/active?k=${KEY}&host=aibizconnect.ca&d=${ld}`)).json();
console.log("live feed:", JSON.stringify(feed));

for (const url of ["https://aibizconnect.ca", "https://www.aibizconnect.ca"]) {
  try {
    const r = await fetch(url, { redirect: "follow" });
    const html = await r.text();
    console.log(`${url} → HTTP ${r.status} | embed snippet present: ${html.includes("occasions-widget/embed")} | this key: ${html.includes(KEY)} | html ${html.length}b`);
  } catch (e) { console.log(`${url} → ${e.message}`); }
}
