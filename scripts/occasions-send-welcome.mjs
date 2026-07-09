// Send the REAL Occasions welcome email (snippet + control-panel link + bookmark note) to a given
// address, for a given registered domain/key. Uses the platform's verified sender + decrypted Resend key.
// Mirrors buildWelcomeEmail() in lib/server/occasion-widget.ts.
// Run: node --env-file=.env.local scripts/occasions-send-welcome.mjs info@gtaluxuryhomes.ca gtaluxuryhomes.ca ocw_bbd392b797314654b7ff
import { createClient } from "@supabase/supabase-js";
import crypto from "node:crypto";

const TENANT = "d723a086-eac0-4b61-8742-25313370d0b7";
const APP_BASE = "https://app.aibizconnect.app";
const NAVY = "#1e3a8a";
const TO = process.argv[2] || "info@gtaluxuryhomes.ca";
const DOMAIN = process.argv[3] || "gtaluxuryhomes.ca";
const KEY = process.argv[4] || "ocw_bbd392b797314654b7ff";
const snippet = `<script src="${APP_BASE}/api/occasions-widget/embed?k=${KEY}" async></script>`;
const manageUrl = `${APP_BASE}/tools/occasions/manage?k=${KEY}`;
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
function getKey() { const raw = process.env.SETTINGS_ENCRYPTION_KEY; const buf = /^[0-9a-fA-F]{64}$/.test(raw) ? Buffer.from(raw, "hex") : Buffer.from(raw, "base64"); return buf; }
function decryptSecret(b64) { const p = Buffer.from(b64, "base64"); const d = crypto.createDecipheriv("aes-256-gcm", getKey(), p.subarray(0, 12)); d.setAuthTag(p.subarray(12, 28)); return Buffer.concat([d.update(p.subarray(28)), d.final()]).toString("utf8"); }

const { data: settings } = await sb.from("tenant_email_settings").select("sender_email, sender_name").eq("tenant_id", TENANT).eq("status", "verified").maybeSingle();
const { data: sec } = await sb.from("tenant_secrets").select("encrypted_payload").eq("tenant_id", TENANT).eq("provider", "resend").maybeSingle();
const apiKey = JSON.parse(decryptSecret(sec.encrypted_payload)).api_key;

const subject = `Your Occasions widget for ${DOMAIN} 🎉`;
const html = `
  <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#0f172a;max-width:560px;margin:0 auto">
    <h1 style="font-size:20px;margin:0 0 6px">You're all set 🎉</h1>
    <p style="color:#475569;font-size:14px;line-height:1.5;margin:0 0 18px">Festive occasions are ready for <b style="color:${NAVY}">${esc(DOMAIN)}</b>. Add them to your site in one step:</p>
    <p style="color:#0f172a;font-size:13px;font-weight:600;margin:0 0 8px">1 · Copy this snippet and paste it just before <code style="background:#f1f5f9;padding:1px 5px;border-radius:4px">&lt;/head&gt;</code> on your website:</p>
    <div style="background:#0f172a;color:#e2e8f0;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:12px;line-height:1.5;padding:14px 16px;border-radius:10px;word-break:break-all;margin:0 0 18px">${esc(snippet)}</div>
    <p style="color:#0f172a;font-size:13px;font-weight:600;margin:0 0 8px">2 · Manage your occasions — choose holidays, sales banners, and animations:</p>
    <p style="margin:0 0 10px"><a href="${manageUrl}" style="display:inline-block;background:${NAVY};color:#fff;text-decoration:none;font-size:14px;font-weight:600;padding:10px 18px;border-radius:10px">Open my Occasions control panel →</a></p>
    <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:13px 16px;margin:0 0 18px">
      <p style="color:#1e3a8a;font-size:13px;font-weight:700;margin:0 0 5px">🔖 Bookmark this — it's your private control panel</p>
      <p style="color:#1e40af;font-size:12px;line-height:1.5;margin:0 0 7px">This is your permanent link to manage your occasions any time — next week, next month, any holiday. <b>Bookmark it now, and keep this email handy</b> so you can always get back in:</p>
      <div style="background:#ffffff;border:1px solid #dbeafe;border-radius:7px;padding:8px 10px;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:11px;color:#1e3a8a;word-break:break-all"><a href="${manageUrl}" style="color:#1e3a8a;text-decoration:none">${esc(manageUrl)}</a></div>
    </div>
    <p style="color:#94a3b8;font-size:12px;line-height:1.5;margin:0">Holidays and seasonal animations appear automatically on the right dates — only on your registered site.</p>
    <hr style="margin:22px 0;border:none;border-top:1px solid #e2e8f0"/>
    <p style="color:#94a3b8;font-size:11px;margin:0">You're receiving this because you registered ${esc(DOMAIN)} for the free AIBizConnect Occasions widget.</p>
  </div>`;
const text = `You're all set! Festive occasions are ready for ${DOMAIN}.

1) Copy this snippet and paste it just before </head> on your website:

${snippet}

2) Manage your occasions — choose holidays, sales banners, and animations — at your control panel:
${manageUrl}

🔖 BOOKMARK THAT LINK. It's your private control panel and your permanent access to manage your occasions any time. Bookmark it now and keep this email handy so you can always get back in.

You're receiving this because you registered ${DOMAIN} for the free AIBizConnect Occasions widget.`;

const res = await fetch("https://api.resend.com/emails", {
  method: "POST",
  headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
  body: JSON.stringify({ from: `${settings.sender_name} <${settings.sender_email}>`, to: TO, subject, html, text }),
});
const body = await res.json().catch(() => ({}));
console.log("Sent to", TO, "— Resend HTTP", res.status, JSON.stringify(body));
