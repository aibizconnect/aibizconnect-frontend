// Read-only: list email-related DNS records on the platform Cloudflare zone.
// Run: node --env-file=.env.local scripts/cf-dns-check.mjs
const token = process.env.CLOUDFLARE_API_TOKEN;
const zoneId = process.env.CLOUDFLARE_ZONE_ID;
if (!token || !zoneId) {
  console.log("CLOUDFLARE_API_TOKEN / CLOUDFLARE_ZONE_ID not in env (.env.local).");
  console.log("They may be stored as the encrypted platform secret instead (tenant_secrets / cloudflare_platform).");
  process.exit(0);
}
const res = await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records?per_page=300`, {
  headers: { Authorization: `Bearer ${token}` },
});
const json = await res.json();
if (!json.success) { console.log("Cloudflare API error:", JSON.stringify(json.errors)); process.exit(0); }
const all = json.result || [];
const emailish = all.filter((r) =>
  ["TXT", "MX", "CNAME"].includes(r.type) &&
  /spf|dkim|dmarc|_domainkey|resend|amazonses|feedback-smtp|mail|send|email|mx/i.test(`${r.name} ${r.content}`)
);
console.log(`Zone has ${all.length} records total. Email-related:\n`);
if (!emailish.length) console.log("  (none — no SPF/DKIM/DMARC/MX yet)");
for (const r of emailish) console.log(`  ${r.type.padEnd(6)} ${r.name}  ->  ${String(r.content).slice(0, 90)}`);
