// Live CREA DDF connectivity probe — Digest login + a tiny COMPACT search.
// Creds come from env (DDF_USER / DDF_PASS); never hardcoded/committed.
import { createHash, randomBytes } from "node:crypto";

const BASE = (process.env.DDF_BASE || "https://data.crea.ca").replace(/\/+$/, "");
const USER = process.env.DDF_USER || "";
const PASS = process.env.DDF_PASS || "";
const md5 = (s) => createHash("md5").update(s).digest("hex");
let cookie = null;

function parseChallenge(h) {
  const out = {};
  for (const m of h.replace(/^Digest\s+/i, "").matchAll(/(\w+)=(?:"([^"]*)"|([^,]*))/g)) out[m[1]] = (m[2] ?? m[3] ?? "").trim();
  return out;
}
function digestHeader(method, uri, ch) {
  const { realm = "", nonce = "", qop = "auth", opaque } = ch;
  const cnonce = randomBytes(8).toString("hex"); const nc = "00000001";
  const ha1 = md5(`${USER}:${realm}:${PASS}`); const ha2 = md5(`${method}:${uri}`);
  const response = md5(`${ha1}:${nonce}:${nc}:${cnonce}:${qop}:${ha2}`);
  let s = `Digest username="${USER}", realm="${realm}", nonce="${nonce}", uri="${uri}", qop=${qop}, nc=${nc}, cnonce="${cnonce}", response="${response}", algorithm=MD5`;
  if (opaque) s += `, opaque="${opaque}"`;
  return s;
}
async function get(path) {
  const url = BASE + path; const headers = { Accept: "*/*" };
  if (cookie) headers.Cookie = cookie;
  let res = await fetch(url, { headers, redirect: "manual" });
  if (res.status === 401) {
    const wa = res.headers.get("www-authenticate") || "";
    if (/digest/i.test(wa)) { headers.Authorization = digestHeader("GET", path, parseChallenge(wa)); res = await fetch(url, { headers, redirect: "manual" }); }
  }
  const sc = res.headers.get("set-cookie");
  if (sc) { const sid = sc.match(/X-SESSIONID=[^;]+/i); if (sid) cookie = sid[0]; }
  return { status: res.status, body: await res.text() };
}

const login = await get("/Login.svc/Login");
const rc = login.body.match(/<RETS\s+ReplyCode="(\d+)"\s+ReplyText="([^"]*)"/i);
console.log(`LOGIN: HTTP ${login.status} | RETS ${rc?.[1]} ${rc?.[2] ?? ""} | cookie=${cookie ? "yes" : "no"}`);
console.log(login.body.slice(0, 400).replace(/\s+/g, " "));

const SELECT = "ListingKey,ListingId,ListPrice,City,StateOrProvince,PostalCode,UnparsedAddress,StreetNumber,StreetName,BedroomsTotal,BathroomsTotalInteger,LivingArea,PropertyType,PropertySubType,TransactionType,StandardStatus,MlsStatus,PublicRemarks,ListOfficeName,ListAgentFullName,Latitude,Longitude,YearBuilt,ModificationTimestamp,PhotosChangeTimestamp";
async function trySearch(query, select) {
  const o = { SearchType: "Property", Class: "Property", QueryType: "DMQL2", Format: "COMPACT-Decoded", Query: query, Count: "1", Limit: "2", Offset: "1", Culture: "en-CA" };
  if (select) o.Select = select;
  const args = new URLSearchParams(o);
  const s = await get(`/Search.svc/Search?${args.toString()}`);
  const reply = s.body.match(/<RETS\s+ReplyCode="(\d+)"\s+ReplyText="([^"]*)"/i);
  const count = s.body.match(/<COUNT\s+Records="(\d+)"/i)?.[1];
  const data = [...s.body.matchAll(/<DATA>([\s\S]*?)<\/DATA>/gi)];
  const nCols = (s.body.match(/<COLUMNS>([\s\S]*?)<\/COLUMNS>/i)?.[1] ?? "").split("\t").filter(Boolean).length;
  console.log(`  ${select ? "[+Select] " : ""}${query}  ->  RETS ${reply?.[1]} ${reply?.[2] ?? ""} | COUNT=${count ?? "-"} | DATA=${data.length} | COLS=${nCols}`);
  return { ok: reply?.[1] === "0", body: s.body, data };
}

if (login.status === 200) {
  console.log("\n=== query syntax probes ===");
  // (a) incremental query format probes
  await trySearch("(LastUpdated=2026-06-13T00:00:00Z)");
  await trySearch("(LastUpdated=2026-06-13T00:00:00)");
  await trySearch("(LastUpdated=2026-06-13T00:00:00Z+)");
  // (b) field retrieval: single-ID (default cols) vs ID=* with Select
  await trySearch("(ID=29879466)");
  await trySearch("(ID=*)", SELECT);
  // === END-TO-END: pull recent listings, map inline like mapResoRecord, print normalized ===
  console.log("\n=== NORMALIZED (recent TRREB listings, mapped) ===");
  const o = new URLSearchParams({ SearchType: "Property", Class: "Property", QueryType: "DMQL2", Format: "COMPACT-Decoded", Query: "(LastUpdated=2026-06-13T00:00:00Z)", Count: "1", Limit: "5", Offset: "1", Culture: "en-CA" });
  const s = await get(`/Search.svc/Search?${o.toString()}`);
  const cols = (s.body.match(/<COLUMNS>([\s\S]*?)<\/COLUMNS>/i)?.[1] ?? "").split("\t");
  const firstNum = (v) => { const m = String(v ?? "").match(/\d[\d,]*/); return m ? Number(m[0].replace(/,/g, "")) : null; };
  const splitCity = (raw) => { const m = String(raw ?? "").match(/^(.*?)\s*\(([^)]+)\)\s*$/); return m ? { city: m[1].trim(), community: m[2].trim() } : { city: String(raw ?? "").trim() || null, community: null }; };
  for (const d of [...s.body.matchAll(/<DATA>([\s\S]*?)<\/DATA>/gi)]) {
    const vals = d[1].split("\t"); const r = {}; cols.forEach((c, i) => { if (c.trim()) r[c.trim()] = (vals[i] ?? "").trim(); });
    const { city, community } = splitCity(r.City);
    console.log(`  ${r.ListingId} | $${Number(r.ListPrice).toLocaleString()} | ${r.BedroomsTotal}bd/${r.BathroomsTotal}ba | ${firstNum(r.BuildingAreaTotal) ?? "?"} sqft | ${city}${community ? ` › ${community}` : ""} | ${r.UnparsedAddress} | ${r.ListOfficeName} | mod ${new Date(r.ModificationTimestamp).toISOString()}`);
  }
  await get("/Logout.svc/Logout");
}
