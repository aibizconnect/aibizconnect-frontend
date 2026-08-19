// Definitive test of the platform tenant's transactional email path (replicates emailReady + sendEmail).
// Decrypts the Resend key from tenant_secrets and attempts a real send, printing Resend's response.
// Run: node --env-file=.env.local scripts/occasions-email-test.mjs aibusinessconnect2@gmail.com
import { createClient } from "@supabase/supabase-js";
import crypto from "node:crypto";

const TENANT = "d723a086-eac0-4b61-8742-25313370d0b7";
const TO = process.argv[2] || "aibusinessconnect2@gmail.com";
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

function getKey() {
  const raw = process.env.SETTINGS_ENCRYPTION_KEY;
  if (!raw) throw new Error("SETTINGS_ENCRYPTION_KEY not set in env");
  const buf = /^[0-9a-fA-F]{64}$/.test(raw) ? Buffer.from(raw, "hex") : Buffer.from(raw, "base64");
  if (buf.length !== 32) throw new Error("SETTINGS_ENCRYPTION_KEY wrong length");
  return buf;
}
function decryptSecret(payloadB64) {
  const payload = Buffer.from(payloadB64, "base64");
  const iv = payload.subarray(0, 12), tag = payload.subarray(12, 28), ct = payload.subarray(28);
  const d = crypto.createDecipheriv("aes-256-gcm", getKey(), iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(ct), d.final()]).toString("utf8");
}

// 1) verified sender
const { data: settings } = await sb.from("tenant_email_settings").select("sender_email, sender_name, status").eq("tenant_id", TENANT).eq("status", "verified").maybeSingle();
console.log("verified sender:", settings || "(NONE — emailReady would fail)");

// 2) resend key from tenant_secrets
const { data: sec } = await sb.from("tenant_secrets").select("encrypted_payload").eq("tenant_id", TENANT).eq("provider", "resend").maybeSingle();
if (!sec) { console.error("NO tenant_secrets row for resend — emailReady fails -> no email sent. THIS is the bug."); process.exit(1); }
let apiKey;
try {
  const decrypted = JSON.parse(decryptSecret(sec.encrypted_payload));
  apiKey = decrypted.api_key;
  console.log("resend key present:", apiKey ? `yes (${String(apiKey).slice(0,6)}…, len ${String(apiKey).length})` : "NO api_key field");
} catch (e) { console.error("decrypt failed:", e.message); process.exit(1); }
if (!apiKey || !settings) { console.error("Cannot send: missing key or sender."); process.exit(1); }

// 3) real send
const from = `${settings.sender_name} <${settings.sender_email}>`;
const res = await fetch("https://api.resend.com/emails", {
  method: "POST",
  headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
  body: JSON.stringify({ from, to: TO, subject: "Occasions email path TEST ✅", html: "<p>If you can read this, the platform Resend send path works.</p>" }),
});
const body = await res.json().catch(() => ({}));
console.log("\nResend HTTP", res.status);
console.log("Resend response:", JSON.stringify(body, null, 2));
