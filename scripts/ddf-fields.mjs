// Probe live CREA DDF: dump the COLUMNS list + show which fields a COMMERCIAL listing actually populates.
// Run: DDF_USER=.. DDF_PASS=.. node scripts/ddf-fields.mjs
import { createHash, randomBytes } from "node:crypto";
const BASE = "https://data.crea.ca";
const USER = process.env.DDF_USER, PASS = process.env.DDF_PASS;
const md5 = (s) => createHash("md5").update(s).digest("hex");
let cookie = null;
function parseChallenge(h) { const o = {}; for (const m of h.replace(/^Digest\s+/i, "").matchAll(/(\w+)=(?:"([^"]*)"|([^,]*))/g)) o[m[1]] = (m[2] ?? m[3] ?? "").trim(); return o; }
function digestHeader(method, uri, ch) { const { realm = "", nonce = "", qop = "auth", opaque } = ch; const cn = randomBytes(8).toString("hex"), nc = "00000001"; const ha1 = md5(`${USER}:${realm}:${PASS}`), ha2 = md5(`${method}:${uri}`); const resp = md5(`${ha1}:${nonce}:${nc}:${cn}:${qop}:${ha2}`); let s = `Digest username="${USER}", realm="${realm}", nonce="${nonce}", uri="${uri}", qop=${qop}, nc=${nc}, cnonce="${cn}", response="${resp}", algorithm=MD5`; if (opaque) s += `, opaque="${opaque}"`; return s; }
async function get(path) { const url = BASE + path; const h = { Accept: "*/*" }; if (cookie) h.Cookie = cookie; let r = await fetch(url, { headers: h }); if (r.status === 401) { const wa = r.headers.get("www-authenticate") || ""; if (/digest/i.test(wa)) { h.Authorization = digestHeader("GET", path, parseChallenge(wa)); r = await fetch(url, { headers: h }); } } const sc = r.headers.get("set-cookie"); if (sc) { const s = sc.match(/X-SESSIONID=[^;]+/i); if (s) cookie = s[0]; } return await r.text(); }

const login = await get("/Login.svc/Login");
console.log("login:", login.match(/ReplyText="([^"]*)"/)?.[1] ?? login.slice(0, 120));
const since = new Date(Date.now() - 14 * 864e5).toISOString().replace(/\.\d{3}Z$/, "Z");
const args = new URLSearchParams({ SearchType: "Property", Class: "Property", QueryType: "DMQL2", Format: "COMPACT-Decoded", Query: `(LastUpdated=${since})`, Count: "1", Limit: "100", Offset: "1", Culture: "en-CA" });
const body = await get(`/Search.svc/Search?${args.toString()}`);
const cols = (body.match(/<COLUMNS>([\s\S]*?)<\/COLUMNS>/i)?.[1] ?? "").split("\t").map((c) => c.trim());
if (cols.filter(Boolean).length === 0) { console.log("NO COLUMNS — body head:\n", body.slice(0, 700)); process.exit(0); }
const rows = [...body.matchAll(/<DATA>([\s\S]*?)<\/DATA>/gi)].map((d) => { const v = d[1].split("\t"); const o = {}; cols.forEach((c, i) => { if (c) o[c] = (v[i] ?? "").trim(); }); return o; });

// All field names that look commercial/lot/zoning/unit related
const interesting = cols.filter((c) => /zon|unit|lot|frontage|business|commercial|use|acre|floor|cap|noi|tenan|lease|building|land/i.test(c));
console.log("CANDIDATE FIELDS:", interesting.join(", "));

// Find a commercial-type record and print its NON-EMPTY fields
const COMM = ["retail", "office", "industrial", "business", "multi-family", "multi family", "hospitality", "agriculture"];
const comm = rows.filter((r) => COMM.includes(String(r.PropertyType ?? "").toLowerCase()));
console.log(`\n${comm.length} commercial of ${rows.length} pulled. Non-empty fields on up to 3 commercial records:`);
for (const r of comm.slice(0, 3)) {
  console.log(`\n— ${r.PropertyType} · ${r.City} · ${r.ListPrice || r.Lease} —`);
  console.log(Object.entries(r).filter(([, v]) => v && v !== "" && v !== "0").map(([k, v]) => `${k}=${String(v).slice(0, 40)}`).join(" | "));
}
await get("/Logout.svc/Logout");
