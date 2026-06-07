import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n").filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, "")]; })
);
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const slug = "zzz-onboard-" + randomUUID().slice(0, 8);
const ins = await sb.from("tenants").insert({ name: "ZZZ Onboarding Test", slug }).select("id").single();
if (ins.error) { console.log("tenant insert err:", ins.error.message); process.exit(0); }
const tid = ins.data.id;
console.log("temp tenant:", tid, "slug:", slug);

async function provision() {
  const r = await fetch("http://localhost:3000/api/internal/provision-tenant", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tenantId: tid }),
  });
  return r.json();
}

console.log("provision #1:", JSON.stringify((await provision()).result));
const { count: pol } = await sb.from("tenant_feature_policies").select("*", { count: "exact", head: true }).eq("tenant_id", tid);
const { data: doms } = await sb.from("tenant_domains").select("subdomain").eq("tenant_id", tid);
console.log("policies:", pol, "| subdomain:", doms?.map((d) => d.subdomain).join(","));
console.log("provision #2 (idempotent):", JSON.stringify((await provision()).result));

// cleanup
await sb.from("tenant_domains").delete().eq("tenant_id", tid);
await sb.from("tenant_feature_policies").delete().eq("tenant_id", tid);
await sb.from("tenants").delete().eq("id", tid);
console.log("cleaned up");
