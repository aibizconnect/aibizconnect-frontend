#!/usr/bin/env node
/**
 * Daily domain security scan — detects injected/deceptive "agentic-web" markup and email leaks
 * across all owned domains. Standalone (no deps; Node 18+ global fetch). Exit code 1 if any
 * findings, 0 if all clean. Run: `node scripts/security-scan.mjs` (or `--json`).
 *
 * What it flags (the 2026-07-11 incident signature + kin) — see docs/A2A-SECURITY.md:
 *  - fake OAuth discovery: authorization_endpoint / token_endpoint / jwks_uri / oauth-server / oauth-resource
 *  - Web Bot Auth theater: a `webbotauth` block or a placeholder `…SYSTEM_KEY` in markup
 *  - fake agentic commerce: agentic-commerce / x402_header_support / agent_discount_allowed / acp_verification
 *  - privileged WebMCP tool: request_system_audit / window.webmcp / navigator.modelContext / registerTool
 *  - fake API-catalog / mcp-card / agent-skills discovery blocks + their <link rel> pointers
 *  - contact-email leak: info@ali.realtor on a NON-real-estate domain
 *
 * NOTE: our LEGITIMATE A2A surface (/llms.txt, /.well-known/agent-card.json + catalogue.json, a real
 * MCP endpoint with working OAuth) is NOT flagged — those resolve, enforce auth, and hold no secrets.
 * Do not "kill our own code": the distinguisher is fake/non-resolving/secret-in-markup. (memory: a2a-real-vs-injected)
 */

const REALTOR_DOMAINS = new Set([
  "ali.realtor", "the4sale.com", "the4sale.net", "gtaluxuryhomes.ca", "on-dreamhomes.com", "alibolourchi.com",
]);

const DOMAINS = [
  "ali.realtor", "the4sale.com", "the4sale.net", "gtaluxuryhomes.ca", "on-dreamhomes.com",
  "alibolourchi.com", "bolourchi.com", "aibizconnect.ca", "aibizconnect.app", "lead-loop.co", "webtechies.net",
];

// Each: [label, regex]. Case-insensitive.
const INJECTION_SIGNATURES = [
  ["fake-oauth-endpoint", /authorization_endpoint|token_endpoint|jwks_uri/i],
  ["fake-oauth-block", /id="oauth-server"|id="oauth-resource"|#oauth-server|#oauth-resource/i],
  ["webbotauth-theater", /id="webbotauth"|rel="author"[^>]*#webbotauth/i],
  ["placeholder-system-key", /[A-Z0-9_]{4,}_SYSTEM_KEY/],
  ["fake-agentic-commerce", /agentic-commerce|x402_header_support|agent_discount_allowed|acp_verification/i],
  ["privileged-webmcp-tool", /request_system_audit/i],
  ["webmcp-registration", /window\.webmcp|navigator\.modelContext|registerTool/i],
  ["fake-api-catalog", /rel="api-catalog"|id="api-catalog"|#api-catalog/i],
  ["fake-mcp-card", /id="mcp-card"|#mcp-card/i],
  ["fake-agent-skills", /id="agent-skills"|#agent-skills/i],
  ["fake-indieauth-link", /rel="indieauth-metadata"/i],
];

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36";

async function fetchHtml(domain) {
  const url = `https://${domain}/?secscan=${Date.now()}`;
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA }, redirect: "follow", signal: AbortSignal.timeout(25000) });
    return { status: res.status, html: await res.text() };
  } catch (e) {
    return { status: 0, html: "", error: String(e?.message || e) };
  }
}

function scanOne(domain, html) {
  const findings = [];
  for (const [label, re] of INJECTION_SIGNATURES) if (re.test(html)) findings.push(label);
  // Email leak: info@ali.realtor only allowed on real-estate domains.
  if (!REALTOR_DOMAINS.has(domain) && /info@ali\.realtor/i.test(html)) findings.push("email-leak:info@ali.realtor");
  return findings;
}

async function main() {
  const asJson = process.argv.includes("--json");
  const results = [];
  for (const d of DOMAINS) {
    const { status, html, error } = await fetchHtml(d);
    if (error || !html) { results.push({ domain: d, status, fetchError: error || "empty" }); continue; }
    results.push({ domain: d, status, findings: scanOne(d, html) });
  }
  const flagged = results.filter((r) => (r.findings && r.findings.length) || r.fetchError);
  if (asJson) {
    console.log(JSON.stringify({ scannedAt: new Date().toISOString(), total: results.length, flagged: flagged.length, results }, null, 2));
  } else {
    console.log(`Domain security scan — ${new Date().toISOString()}`);
    for (const r of results) {
      if (r.fetchError) console.log(`  ⚠ ${r.domain.padEnd(22)} fetch-error: ${r.fetchError}`);
      else if (r.findings.length) console.log(`  ⛔ ${r.domain.padEnd(22)} ${r.findings.join(", ")}`);
      else console.log(`  ✓ ${r.domain.padEnd(22)} clean`);
    }
    console.log(flagged.length ? `\n${flagged.length} domain(s) need attention.` : `\nAll ${results.length} domains clean.`);
  }
  process.exit(flagged.some((r) => r.findings && r.findings.length) ? 1 : 0);
}

main();
