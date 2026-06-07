import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n").filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, "")]; })
);
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const { data } = await sb.from("agent_runs")
  .select("plan_hash, dry_run, status, domain, action_count, created_at")
  .order("created_at", { ascending: false }).limit(5);
console.log("recent agent_runs:", JSON.stringify(data, null, 2));
const byDomain = {};
for (const d of ["email", "social", "website"]) {
  const { count } = await sb.from("agent_runs").select("*", { count: "exact", head: true }).eq("domain", d);
  byDomain[d] = count;
}
console.log("rows by domain:", JSON.stringify(byDomain));
