// Re-trigger an Occasions Widget registration on the DEPLOYED endpoint so it re-sends the welcome
// email (with the snippet + control-panel link) to the on-file address. Verifies the email path.
// Run: node --env-file=.env.local scripts/occasions-widget-resend.mjs gtaluxuryhomes.ca info@gtaluxuryhomes.ca Ali

const DOMAIN = process.argv[2] || "gtaluxuryhomes.ca";
const EMAIL = process.argv[3] || "info@gtaluxuryhomes.ca";
const NAME = process.argv[4] || "Ali";
const secret = process.env.OCCASIONS_WIDGET_SECRET;
if (!secret) { console.error("OCCASIONS_WIDGET_SECRET not set in env"); process.exit(1); }

const res = await fetch("https://app.aibizconnect.app/api/occasions-widget/register", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ secret, domain: DOMAIN, email: EMAIL, name: NAME, source: "verify_resend" }),
});
const body = await res.json().catch(() => ({}));
console.log("HTTP", res.status);
console.log(JSON.stringify(body, null, 2));
