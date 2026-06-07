import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n").filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, "")]; })
);
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const TID = "214ca58a-c76f-48d6-97ec-3f040db3b81f";

let { data: pending } = await sb.from("agent_approvals").select("id, domain, role, gated_action_ids, reason, status").eq("tenant_id", TID).eq("status", "pending").order("created_at", { ascending: false });
console.log("pending approvals:", JSON.stringify(pending, null, 2));

if (pending?.length) {
  // simulate the decide action (deny -> clears it from pending)
  const id = pending[0].id;
  await sb.from("agent_approvals").update({ status: "denied", decided_at: new Date().toISOString() }).eq("id", id).eq("status", "pending");
  const { count: stillPending } = await sb.from("agent_approvals").select("*", { count: "exact", head: true }).eq("tenant_id", TID).eq("status", "pending");
  const { count: denied } = await sb.from("agent_approvals").select("*", { count: "exact", head: true }).eq("tenant_id", TID).eq("status", "denied");
  console.log(`after deny -> pending=${stillPending}, denied=${denied}`);
}
