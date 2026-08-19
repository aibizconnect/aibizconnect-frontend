#!/usr/bin/env node
/**
 * Daily traffic anomaly scan — detects volume floods and single-country surges across all owned
 * zones. Sibling of security-scan.mjs: standalone (no deps, Node 18+ global fetch), exit 1 on any
 * finding, 0 if normal. Run: `node scripts/traffic-anomaly-scan.mjs` (or `--json`).
 *
 * WHY THIS EXISTS
 * From 2026-08-13 to 2026-08-18 a single source country (SG) sent 804,534 requests — 69.7% of all
 * traffic across the portfolio, peaking at 87.3% of one day's requests, concentrated on the two
 * real-estate listing sites. Cloudflare classified only 14 of those as threats, so the WAF stayed
 * quiet, and security-scan.mjs reported "all 11 domains clean" every morning because page markup
 * never changed. Al found out five days late, by hand.
 *
 * That is the gap this closes: markup integrity and traffic volume are different questions, and
 * only the first was being asked.
 *
 * WHAT IT CANNOT DO
 * All zones are on the Cloudflare **Free** plan, so `firewallEventsAdaptive` (per-request data:
 * attacking IPs, paths, user-agents, WAF actions) returns "zone does not have access to the path".
 * Only daily country rollups via httpRequests1dGroups are available. So this answers "how much,
 * from where, to which domain" — never "who" or "what did they ask for". Upgrading a zone to Pro
 * would unlock the per-request detail.
 *
 * TOKEN: needs Zone → Analytics → Read (zone-scoped policy, not the account-scoped one — the
 * account variant does NOT grant this dataset). Read from CLOUDFLARE_ANALYTICS_TOKEN in env, or
 * from seo-geo-platform/.dev.vars.
 */

import { readFileSync } from "node:fs";

const DEV_VARS = "C:\\server\\projects\\seo-geo-analysis\\seo-geo-platform\\.dev.vars";
const GRAPHQL = "https://api.cloudflare.com/client/v4/graphql";
const JSON_OUT = process.argv.includes("--json");

/** Days of history to build the baseline from. */
const WINDOW_DAYS = 14;
/** A country must exceed this share of a day's total to be called a surge. */
const SHARE_THRESHOLD = 0.40;
/** ...and this multiple of its own recent median. */
const SPIKE_MULTIPLE = 3;
/** Floor so low-traffic domains don't trip on noise (10 requests -> 40 is not an attack). */
const MIN_REQUESTS = 10_000;
/** Total-volume flood: the day's total vs the median day. */
const TOTAL_SPIKE_MULTIPLE = 3;

function token() {
  if (process.env.CLOUDFLARE_ANALYTICS_TOKEN) return process.env.CLOUDFLARE_ANALYTICS_TOKEN;
  const raw = readFileSync(DEV_VARS, "utf8").replace(/\r\n?/g, "\n");
  for (const line of raw.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#") || !t.includes("=")) continue;
    const [k, ...rest] = t.split("=");
    if (k.trim() === "CLOUDFLARE_ANALYTICS_TOKEN") {
      return rest.join("=").trim().replace(/^["']|["']$/g, "");
    }
  }
  throw new Error("No CLOUDFLARE_ANALYTICS_TOKEN in env or .dev.vars");
}

async function gql(tok, query, variables) {
  const res = await fetch(GRAPHQL, {
    method: "POST",
    headers: { Authorization: `Bearer ${tok}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
    signal: AbortSignal.timeout(60_000),
  });
  const body = await res.json();
  if (body.errors?.length) throw new Error(body.errors[0].message);
  return body.data;
}

const ZONES_Q = `query { viewer { zones(filter:{}) { zoneTag } } }`;
const TRAFFIC_Q = `query($tag:String!,$s:Date!,$e:Date!){viewer{zones(filter:{zoneTag:$tag}){
  httpRequests1dGroups(filter:{date_geq:$s,date_leq:$e},limit:100,orderBy:[date_ASC]){
    dimensions{date}
    sum{requests threats countryMap{clientCountryName requests threats}}
  }}}}`;

const median = (xs) => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

async function main() {
  const tok = token();

  // Zone list from the API, so a new domain is covered the day it is added.
  const zoneRes = await fetch("https://api.cloudflare.com/client/v4/zones?per_page=50", {
    headers: { Authorization: `Bearer ${tok}` },
    signal: AbortSignal.timeout(60_000),
  }).then((r) => r.json());
  if (!zoneRes.success) throw new Error("zone list failed: " + JSON.stringify(zoneRes.errors).slice(0, 200));
  const zones = zoneRes.result.map((z) => ({ tag: z.id, name: z.name }));

  const today = new Date();
  const end = new Date(today.getTime() - 86400_000);            // yesterday: today is partial
  const start = new Date(end.getTime() - (WINDOW_DAYS - 1) * 86400_000);
  const iso = (d) => d.toISOString().slice(0, 10);
  const latestDay = iso(end);

  // date -> country -> requests ; plus per-zone latest-day totals
  const byDayCountry = new Map();
  const dayTotals = new Map();
  const zoneLatest = [];

  for (const z of zones) {
    let data;
    try {
      data = await gql(tok, TRAFFIC_Q, { tag: z.tag, s: iso(start), e: latestDay });
    } catch (e) {
      console.error(`  ! ${z.name}: ${e.message.slice(0, 120)}`);
      continue;
    }
    const groups = data.viewer.zones?.[0]?.httpRequests1dGroups ?? [];
    for (const g of groups) {
      const date = g.dimensions.date;
      dayTotals.set(date, (dayTotals.get(date) ?? 0) + g.sum.requests);
      if (!byDayCountry.has(date)) byDayCountry.set(date, new Map());
      const cm = byDayCountry.get(date);
      for (const c of g.sum.countryMap ?? []) {
        cm.set(c.clientCountryName, (cm.get(c.clientCountryName) ?? 0) + c.requests);
      }
      if (date === latestDay) {
        zoneLatest.push({ name: z.name, requests: g.sum.requests, threats: g.sum.threats });
      }
    }
  }

  if (!dayTotals.size) {
    console.error("No traffic data returned — check the token's zone-scoped Analytics Read permission.");
    process.exit(2);
  }

  const priorDays = [...dayTotals.keys()].filter((d) => d !== latestDay).sort();
  const latestCountries = byDayCountry.get(latestDay) ?? new Map();
  const latestTotal = dayTotals.get(latestDay) ?? 0;
  const findings = [];

  // 1. Single-country surge.
  for (const [country, reqs] of latestCountries) {
    const history = priorDays.map((d) => byDayCountry.get(d)?.get(country) ?? 0);
    const base = median(history);
    const share = latestTotal ? reqs / latestTotal : 0;
    const spiked = reqs >= Math.max(MIN_REQUESTS, base * SPIKE_MULTIPLE);
    if (reqs >= MIN_REQUESTS && share >= SHARE_THRESHOLD && spiked) {
      findings.push({
        type: "country-surge",
        country,
        requests: reqs,
        sharePct: +(share * 100).toFixed(1),
        medianBaseline: Math.round(base),
        multiple: base ? +(reqs / base).toFixed(1) : null,
      });
    }
  }

  // 2. Overall flood, even if spread across countries.
  const totalBase = median(priorDays.map((d) => dayTotals.get(d) ?? 0));
  if (totalBase && latestTotal >= totalBase * TOTAL_SPIKE_MULTIPLE && latestTotal >= MIN_REQUESTS) {
    findings.push({
      type: "volume-flood",
      requests: latestTotal,
      medianBaseline: Math.round(totalBase),
      multiple: +(latestTotal / totalBase).toFixed(1),
    });
  }

  if (JSON_OUT) {
    console.log(JSON.stringify({ day: latestDay, latestTotal, findings, zones: zoneLatest }, null, 2));
  } else {
    console.log(`Traffic anomaly scan — ${latestDay} (baseline: previous ${priorDays.length} days)`);
    console.log(`  total requests: ${latestTotal.toLocaleString()}  (median day: ${Math.round(totalBase).toLocaleString()})`);
    const top = [...latestCountries.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
    console.log("  top countries: " + top.map(([c, n]) => `${c} ${n.toLocaleString()}`).join(" · "));
    if (!findings.length) {
      console.log("\n  No anomaly. Traffic is within normal range.");
    } else {
      console.log("");
      for (const f of findings) {
        if (f.type === "country-surge") {
          console.log(`  ** SURGE: ${f.country} sent ${f.requests.toLocaleString()} requests — ${f.sharePct}% of all traffic`);
          console.log(`     baseline median ${f.medianBaseline.toLocaleString()}/day → ${f.multiple}x normal`);
        } else {
          console.log(`  ** FLOOD: ${f.requests.toLocaleString()} requests vs median ${f.medianBaseline.toLocaleString()} → ${f.multiple}x normal`);
        }
      }
      const busiest = zoneLatest.sort((a, b) => b.requests - a.requests).slice(0, 4);
      console.log("\n     busiest domains that day: " + busiest.map((z) => `${z.name} ${z.requests.toLocaleString()}`).join(" · "));
      console.log("\n     NOTE: low threat counts do NOT mean benign. The Aug 2026 surge was 804k requests");
      console.log("     with 14 threats — scraping, not intrusion. Cloudflare Free cannot show paths or IPs.");
    }
  }

  process.exit(findings.length ? 1 : 0);
}

main().catch((e) => {
  console.error("Traffic anomaly scan failed:", e.message);
  process.exit(2);
});
