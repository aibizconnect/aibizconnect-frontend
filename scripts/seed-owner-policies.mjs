import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n").filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, "")]; })
);
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const OWNERS = ["214ca58a-c76f-48d6-97ec-3f040db3b81f", "d723a086-eac0-4b61-8742-25313370d0b7"];
const POLICIES = [
  ["custom_domain", "optional_paid_by_tenant"], ["extra_website", "optional_paid_by_tenant"],
  ["email_sending", "included_for_all"], ["social_publishing", "included_for_all"],
  ["ai_provider_byok", "optional_paid_by_user"], ["analytics", "included_for_all"],
  ["agent_seats", "optional_paid_by_tenant"],
];

for (const t of OWNERS) {
  const rows = POLICIES.map(([k, p]) => ({ tenant_id: t, feature_key: k, policy: p, default_enabled: p === "included_for_all" }));
  const { error } = await sb.from("tenant_feature_policies").upsert(rows, { onConflict: "tenant_id,feature_key" });
  const { count } = await sb.from("tenant_feature_policies").select("*", { count: "exact", head: true }).eq("tenant_id", t);
  console.log(`${t.slice(0, 8)}: ${error ? "ERR " + error.message : "ok"}, policies=${count}`);
}
