// Domain switch preflight + activator for aibizconnect.app.
//
//   node --env-file=.env.local scripts/domain-switch.mjs            # check the platform hosts (read-only)
//   node --env-file=.env.local scripts/domain-switch.mjs check foo.com
//   node --env-file=.env.local scripts/domain-switch.mjs activate --yes   # do the switch (needs tokens)
//
// `check` needs NO tokens — it probes public DNS + the live HTTP response and (if a Vercel token
// is present) the project attach state. `activate` registers the apex + www on the Vercel project
// and creates their DNS on the Cloudflare zone; it requires VERCEL_API_TOKEN (+ Cloudflare creds
// for the in-zone DNS) and only writes when you pass --yes.

const VERCEL = "https://api.vercel.com";
const CF = "https://api.cloudflare.com/client/v4";
const PROJECT = process.env.VERCEL_PROJECT_ID || "prj_JUqbcW5p53tWlKuzIJwU0HTdGmny";
const TEAM = process.env.VERCEL_TEAM_ID || "team_Dkju1FizEtaUwOaKAlv5mYln";
const VTOK = process.env.VERCEL_API_TOKEN;
const CFTOK = process.env.CLOUDFLARE_API_TOKEN;
const CFZONE = process.env.CLOUDFLARE_ZONE_ID;
const ZONES = (process.env.CLOUDFLARE_PLATFORM_ZONES || "aibizconnect.app,aibizconnect.ca").split(",").map((z) => z.trim().toLowerCase());
const APEX_IP = process.env.VERCEL_APEX_IP || "76.76.21.21";
const q = TEAM ? `?teamId=${TEAM}` : "";

const isApex = (h) => ZONES.includes(h.toLowerCase());
const inZone = (h) => ZONES.some((z) => h === z || h.endsWith(`.${z}`));
const ic = { ok: "✓", pending: "…", fail: "✗", unknown: "?" };

async function doh(name, type) {
  try {
    const r = await fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(name)}&type=${type}`, { headers: { accept: "application/dns-json" } });
    const j = await r.json();
    return (j.Answer ?? []).map((a) => String(a.data).replace(/\.$/, ""));
  } catch { return []; }
}

async function httpProbe(host) {
  try {
    const r = await fetch(`https://${host}`, { redirect: "manual" });
    const title = (await r.text()).match(/<title>([^<]*)<\/title>/i)?.[1]?.trim() || "(no title)";
    const vercel = !!(r.headers.get("x-vercel-id") || r.headers.get("x-vercel-cache"));
    return { status: r.status, title, vercel, location: r.headers.get("location") };
  } catch (e) { return { status: 0, title: `(unreachable: ${e.message})`, vercel: false }; }
}

async function vercelGet(host) {
  if (!VTOK) return { token: false };
  try {
    const r = await fetch(`${VERCEL}/v9/projects/${PROJECT}/domains/${host}${q}`, { headers: { Authorization: `Bearer ${VTOK}` } });
    if (r.status === 404) return { token: true, registered: false };
    const j = await r.json();
    const cfg = await fetch(`${VERCEL}/v6/domains/${host}/config${q}`, { headers: { Authorization: `Bearer ${VTOK}` } }).then((x) => x.json()).catch(() => ({}));
    return { token: true, registered: true, verified: !!j.verified, misconfigured: cfg.misconfigured };
  } catch (e) { return { token: true, error: e.message }; }
}

async function check(host) {
  console.log(`\n=== ${host} ===`);
  const a = await doh(host, "A");
  const cname = await doh(host, "CNAME");
  const http = await httpProbe(host);
  const v = await vercelGet(host);

  const wantsApex = isApex(host);
  const dnsTargetOk = wantsApex ? a.includes(APEX_IP) : (http.vercel || cname.some((c) => /vercel/.test(c)));
  const line = (state, label, detail) => console.log(`  ${ic[state]} ${label}${detail ? `  — ${detail}` : ""}`);

  line(a.length || cname.length ? "ok" : "fail", "DNS resolves", [...a, ...cname].join(", ") || "no record");
  line(http.status ? "ok" : "fail", `HTTP ${http.status || "—"}`, http.location ? `→ ${http.location}` : http.title);
  line(http.vercel ? "ok" : (http.status ? "fail" : "unknown"), "Served by our Vercel deployment", http.vercel ? "yes" : "NO — still the old origin");
  if (!v.token) line("unknown", "Attached to Vercel project", "VERCEL_API_TOKEN not set — can't check");
  else if (v.error) line("unknown", "Attached to Vercel project", v.error);
  else {
    line(v.registered ? "ok" : "fail", "Attached to Vercel project", v.registered ? "" : "NOT attached — host won't serve");
    if (v.registered) line(v.verified ? "ok" : "pending", "Vercel ownership verified", v.verified ? "" : "verify pending");
    if (v.registered && v.misconfigured === true) line("pending", "Vercel sees correct DNS", "misconfigured");
  }
  if (wantsApex) line(a.includes(APEX_IP) ? "ok" : "pending", `Apex A → ${APEX_IP}`, a.includes(APEX_IP) ? "" : `currently: ${a.join(", ") || "none"}`);

  const ready = http.vercel && (!v.token || v.registered);
  console.log(`  ▶ ${ready ? "READY (serving from our deployment)" : "NOT YET ours"}`);
  return ready;
}

async function cfList(name) {
  if (!CFTOK || !CFZONE) return [];
  const r = await fetch(`${CF}/zones/${CFZONE}/dns_records?name=${encodeURIComponent(name)}`, { headers: { Authorization: `Bearer ${CFTOK}` } });
  const j = await r.json();
  return j.result || [];
}
async function cfCreate(body) {
  const r = await fetch(`${CF}/zones/${CFZONE}/dns_records`, { method: "POST", headers: { Authorization: `Bearer ${CFTOK}`, "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const j = await r.json();
  return j.success ? { ok: true } : { ok: false, error: j.errors?.[0]?.message };
}

async function activateHost(host) {
  console.log(`\n--- activating ${host} ---`);
  if (!VTOK) { console.log("  ✗ VERCEL_API_TOKEN missing — cannot attach. Aborting."); return false; }
  // Attach to Vercel
  const add = await fetch(`${VERCEL}/v10/projects/${PROJECT}/domains${q}`, {
    method: "POST", headers: { Authorization: `Bearer ${VTOK}`, "Content-Type": "application/json" }, body: JSON.stringify({ name: host }),
  });
  const aj = await add.json().catch(() => ({}));
  if (add.ok) console.log(`  ✓ attached to Vercel (verified=${!!aj.verified})`);
  else if (aj.error?.code === "domain_already_in_use") console.log("  ✓ already attached to this project");
  else { console.log(`  ✗ Vercel attach failed: ${aj.error?.message || add.status}`); }

  // DNS in our zone
  if (!CFTOK || !CFZONE) { console.log("  … CLOUDFLARE token/zone not set — create DNS manually (apex A → " + APEX_IP + ", www CNAME → cname.vercel-dns.com)"); return false; }
  if (isApex(host)) {
    const existing = (await cfList(host)).filter((r) => r.type === "A" && r.content !== APEX_IP);
    for (const r of existing) await fetch(`${CF}/zones/${CFZONE}/dns_records/${r.id}`, { method: "DELETE", headers: { Authorization: `Bearer ${CFTOK}` } });
    const has = (await cfList(host)).some((r) => r.type === "A" && r.content === APEX_IP);
    const res = has ? { ok: true } : await cfCreate({ type: "A", name: host, content: APEX_IP, proxied: false, ttl: 1 });
    console.log(res.ok ? `  ✓ apex A → ${APEX_IP}` : `  ✗ CF A failed: ${res.error}`);
  } else if (inZone(host)) {
    const label = host.replace(/\.(aibizconnect\.(app|ca))$/, "");
    const has = (await cfList(host)).some((r) => r.type === "CNAME");
    const res = has ? { ok: true } : await cfCreate({ type: "CNAME", name: label, content: "cname.vercel-dns.com", proxied: false, ttl: 1 });
    console.log(res.ok ? "  ✓ CNAME → cname.vercel-dns.com" : `  ✗ CF CNAME failed: ${res.error}`);
  }
  return true;
}

const [cmd, arg] = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const yes = process.argv.includes("--yes");
const HOSTS = ["aibizconnect.app", "www.aibizconnect.app", "app.aibizconnect.app"];

if (cmd === "activate") {
  if (!yes) { console.log("Refusing to write without --yes. This attaches aibizconnect.app + www to Vercel and rewrites their DNS."); process.exit(1); }
  for (const h of ["aibizconnect.app", "www.aibizconnect.app"]) await activateHost(h);
  console.log("\nRe-checking…");
  for (const h of HOSTS) await check(h);
} else if (cmd === "check") {
  await check(arg || "aibizconnect.app");
} else {
  console.log("Preflight for the aibizconnect.app switch (read-only).");
  let allReady = true;
  for (const h of HOSTS) allReady = (await check(h)) && allReady;
  console.log(`\n${allReady ? "All hosts serve from our deployment." : "Run `activate --yes` (with tokens set) to switch the apex + www."}`);
}
