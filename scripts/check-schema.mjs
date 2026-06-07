import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n").filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, "")]; })
);
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

// tenant_domains: is it the new multi-row shape?
for (const c of ["id", "tenant_id", "owner_user_id", "website_id", "subdomain", "custom_domain", "payer", "paid_by_tenant_id"]) {
  const { error } = await sb.from("tenant_domains").select(c).limit(1);
  console.log(`tenant_domains.${c}: ${error ? "MISSING" : "present"}`);
}
// entitlement tables present?
for (const t of ["tenant_feature_policies", "user_feature_entitlements", "billing_responsibilities"]) {
  const { error } = await sb.from(t).select("*", { head: true, count: "exact" });
  console.log(`${t}: ${error ? "NOT applied" : "exists"}`);
}
