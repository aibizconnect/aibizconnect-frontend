import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { promises as dns } from "node:dns";
import { randomUUID } from "node:crypto";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n").filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, "")]; })
);
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const TID = "214ca58a-c76f-48d6-97ec-3f040db3b81f";
const DOMAIN = "demo-verify.example.com";

// 1) insert a custom-domain row (demo; bypasses entitlement for the flow test)
const ins = await sb.from("tenant_domains").insert({ tenant_id: TID, custom_domain: DOMAIN, custom_domain_status: "pending_dns", payer: "tenant" }).select("id").single();
if (ins.error) { console.log("insert err:", ins.error.message); process.exit(0); }
const id = ins.data.id;

// 2) issue + persist challenge token (proves the new column works)
const token = `abc-verify=${randomUUID()}`;
const up = await sb.from("tenant_domains").update({ verification_token: token }).eq("id", id);
console.log("token persisted:", up.error ? "ERR " + up.error.message : "ok");
console.log("challenge -> TXT _aibizconnect." + DOMAIN + " = " + token);

// 3) verify (real DNS lookup; expected: not found for a domain we don't control)
let active = false, note = "";
try {
  const recs = await dns.resolveTxt("_aibizconnect." + DOMAIN);
  active = recs.map((r) => r.join("")).some((v) => v.includes(token));
  note = active ? "matched -> would activate" : "TXT present but no match";
} catch { note = "TXT not found yet (expected — DNS not set) -> stays pending_dns"; }
console.log("verify result:", active ? "ACTIVE" : "not verified:", note);

// 4) cleanup
await sb.from("tenant_domains").delete().eq("id", id);
console.log("cleaned up demo row");
