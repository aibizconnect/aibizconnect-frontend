// LOCAL-ONLY read-only diagnostic: list occasion_widget_sites + what the LIVE active feed returns
// for each, so we can see why a banner is/isn't rendering. Run:
//   node --env-file=.env.local scripts/occasions-diag.mjs
import { createClient } from "@supabase/supabase-js";

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const BASE = (process.env.APP_BASE_URL || "https://app.aibizconnect.app").replace(/\/+$/, "");

const { data, error } = await sb
  .from("occasion_widget_sites")
  .select("key,domain,active,owner_type,source,ghl_location_id,badge,occasions,created_at")
  .order("created_at", { ascending: false })
  .limit(25);
if (error) { console.error("DB error:", error.message); process.exit(1); }

const ld = new Date().toISOString().slice(0, 10);
console.log(`Today (UTC date) = ${ld}\n${data.length} site(s):\n`);

for (const r of data) {
  const occ = r.occasions || {};
  const enabled = Object.entries(occ.banners || {}).filter(([, e]) => e && e.enabled)
    .map(([id, e]) => `${id}${e.startDate ? ` [${e.startDate}..${e.endDate || e.startDate}]` : " (natural dates)"}${e.fly ? " ✈" : ""}`);
  const customs = (occ.custom || []).filter((c) => c.enabled)
    .map((c) => `"${c.name}" [${c.startDate}..${c.endDate || c.startDate}]${c.fly ? " ✈" : ""}`);
  const anim = Object.entries(occ.animations || {}).filter(([, v]) => v && v.enabled).map(([k]) => k);

  console.log(`■ ${r.domain}`);
  console.log(`  key=${r.key}  active=${r.active}  owner=${r.owner_type || "public"}  src=${r.source || "-"}  badge=${r.badge}`);
  console.log(`  enabled holidays: ${enabled.join(" | ") || "(none)"}`);
  if (customs.length) console.log(`  enabled customs: ${customs.join(" | ")}`);
  console.log(`  animations on: ${anim.join(", ") || "(none)"}   position=${occ.bannerStyle?.position || "top-center(default)"}`);

  try {
    const url = `${BASE}/api/occasions-widget/active?k=${encodeURIComponent(r.key)}&host=${encodeURIComponent(r.domain)}&d=${ld}`;
    const res = await fetch(url);
    const j = await res.json();
    const bn = j.banners || [];
    console.log(`  LIVE FEED → banners=${bn.length} animation=${j.animation || "-"} badge=${j.badge}`);
    if (bn.length) console.log(`    showing now: ${bn.map((b) => b.name + (b.fly ? " ✈" : "")).join(", ")}`);
  } catch (e) { console.log(`  LIVE FEED error: ${e.message}`); }
  console.log("");
}
