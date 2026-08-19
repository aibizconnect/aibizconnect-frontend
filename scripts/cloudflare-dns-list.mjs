// Read-only: list all DNS records on the aibizconnect.app Cloudflare zone, so we can review what's
// removable. Uses the platform Cloudflare token (env or tenant_secrets 'cloudflare_platform').
import { createClient } from "@supabase/supabase-js";
import crypto from "node:crypto";

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
function getKey() { const raw = process.env.SETTINGS_ENCRYPTION_KEY; return /^[0-9a-fA-F]{64}$/.test(raw) ? Buffer.from(raw, "hex") : Buffer.from(raw, "base64"); }
function dec(b64) { const p = Buffer.from(b64, "base64"); const d = crypto.createDecipheriv("aes-256-gcm", getKey(), p.subarray(0, 12)); d.setAuthTag(p.subarray(12, 28)); return Buffer.concat([d.update(p.subarray(28)), d.final()]).toString("utf8"); }

let token = process.env.CLOUDFLARE_API_TOKEN, zoneId = process.env.CLOUDFLARE_ZONE_ID;
if (!token || !zoneId) {
  const { data } = await sb.from("tenant_secrets").select("encrypted_payload").eq("provider", "cloudflare_platform").maybeSingle();
  if (!data) { console.error("No cloudflare_platform secret in tenant_secrets and no env token — can't list via API."); process.exit(1); }
  const s = JSON.parse(dec(data.encrypted_payload));
  token = s.api_token; zoneId = s.zone_id;
}
console.log("Zone id:", zoneId, "\n");

const out = [];
for (let page = 1; page < 10; page++) {
  const res = await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records?per_page=100&page=${page}`, { headers: { Authorization: `Bearer ${token}` } });
  const json = await res.json();
  if (!json.success) { console.error("CF error:", JSON.stringify(json.errors)); process.exit(1); }
  out.push(...json.result);
  if (json.result.length < 100) break;
}
out.sort((a, b) => (a.type + a.name).localeCompare(b.type + b.name));
console.log(`${out.length} records:\n`);
for (const r of out) {
  console.log(`${r.type.padEnd(6)} ${r.name.padEnd(40)} -> ${String(r.content).slice(0, 70)}  ${r.proxied ? "[proxied]" : ""}${r.comment ? "  // " + r.comment : ""}`);
}
