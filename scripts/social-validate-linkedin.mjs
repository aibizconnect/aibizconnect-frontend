// Non-destructive: decrypt the tenant's LinkedIn token and call userinfo to confirm it's still valid.
// Run: node --env-file=.env.local scripts/social-validate-linkedin.mjs
import { createDecipheriv } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
const TENANT = "d723a086-eac0-4b61-8742-25313370d0b7";
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

function encKey() { const raw = process.env.SETTINGS_ENCRYPTION_KEY; return /^[0-9a-fA-F]{64}$/.test(raw) ? Buffer.from(raw, "hex") : Buffer.from(raw, "base64"); }
function decryptSecret(b64) {
  const raw = Buffer.from(b64, "base64");
  const iv = raw.subarray(0, 12), tag = raw.subarray(12, 28), ct = raw.subarray(28);
  const d = createDecipheriv("aes-256-gcm", encKey(), iv); d.setAuthTag(tag);
  return Buffer.concat([d.update(ct), d.final()]).toString("utf8");
}

const { data } = await sb.from("tenant_social_accounts").select("external_id, token_expires_at, encrypted_tokens, scopes").eq("tenant_id", TENANT).eq("provider", "linkedin").maybeSingle();
if (!data) { console.log("no linkedin account"); process.exit(0); }
console.log("external_id (urn person):", data.external_id);
console.log("token_expires_at:", data.token_expires_at ?? "(none stored)");
console.log("scopes:", (data.scopes ?? []).join(", "));
let tokens;
try { tokens = JSON.parse(decryptSecret(data.encrypted_tokens)); }
catch (e) { console.log("DECRYPT FAILED:", e.message); process.exit(0); }
console.log("has access_token:", !!tokens.access_token, "| has refresh_token:", !!tokens.refresh_token);

const res = await fetch("https://api.linkedin.com/v2/userinfo", { headers: { Authorization: `Bearer ${tokens.access_token}` } });
const body = await res.text();
console.log(`\nuserinfo HTTP ${res.status}:`, body.slice(0, 300));
console.log(res.ok ? "\n=> TOKEN IS LIVE — posting should work." : "\n=> TOKEN REJECTED — needs reconnect (this is the 'not wired').");
