import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n").filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, "")]; })
);
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const TID = "214ca58a-c76f-48d6-97ec-3f040db3b81f";

// 1) flip ON
let r = await sb.from("tenant_brand_memory").upsert({ tenant_id: TID, design_system_enabled: true, updated_at: new Date().toISOString() }, { onConflict: "tenant_id" });
console.log("set ON:", r.error ? "ERR " + r.error.message : "ok");
let { data } = await sb.from("tenant_brand_memory").select("design_system_enabled").eq("tenant_id", TID).single();
console.log("read:", data?.design_system_enabled);

// 2) flip OFF (restore — keep live site classic per Ali)
r = await sb.from("tenant_brand_memory").upsert({ tenant_id: TID, design_system_enabled: false, updated_at: new Date().toISOString() }, { onConflict: "tenant_id" });
({ data } = await sb.from("tenant_brand_memory").select("design_system_enabled").eq("tenant_id", TID).single());
console.log("restored OFF:", data?.design_system_enabled);

// 3) tenant_domains table sanity
const td = await sb.from("tenant_domains").select("tenant_id", { count: "exact", head: true });
console.log("tenant_domains:", td.error ? "ERR " + td.error.message : "ok (exists)");
