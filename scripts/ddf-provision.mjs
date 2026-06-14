// One-shot: configure the CREA DDF feed for the tenant + sync recent listings into idx_listings.
// Run: DDF_USER=.. DDF_PASS=.. node --env-file=.env.local scripts/ddf-provision.mjs [days] [maxPages]
import { createHash, randomBytes, createCipheriv } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const TENANT = process.env.TENANT_ID || "d723a086-eac0-4b61-8742-25313370d0b7";
const BASE = "https://data.crea.ca";
const USER = process.env.DDF_USER, PASS = process.env.DDF_PASS;
const DAYS = Number(process.argv[2] || 30);
const MAX_PAGES = Number(process.argv[3] || 80);
const PAGE = 100;
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const md5 = (s) => createHash("md5").update(s).digest("hex");

// — encryption matching lib/server/encryption.ts (AES-256-GCM, base64 of iv|tag|ct) —
function encKey() { const raw = process.env.SETTINGS_ENCRYPTION_KEY; return /^[0-9a-fA-F]{64}$/.test(raw) ? Buffer.from(raw, "hex") : Buffer.from(raw, "base64"); }
function encryptSecret(plain) { const iv = randomBytes(12); const c = createCipheriv("aes-256-gcm", encKey(), iv); const ct = Buffer.concat([c.update(plain, "utf8"), c.final()]); return Buffer.concat([iv, c.getAuthTag(), ct]).toString("base64"); }

// — CREA RETS —
let cookie = null;
function parseChallenge(h) { const o = {}; for (const m of h.replace(/^Digest\s+/i, "").matchAll(/(\w+)=(?:"([^"]*)"|([^,]*))/g)) o[m[1]] = (m[2] ?? m[3] ?? "").trim(); return o; }
function digestHeader(method, uri, ch) { const { realm = "", nonce = "", qop = "auth", opaque } = ch; const cn = randomBytes(8).toString("hex"), nc = "00000001"; const ha1 = md5(`${USER}:${realm}:${PASS}`), ha2 = md5(`${method}:${uri}`); const resp = md5(`${ha1}:${nonce}:${nc}:${cn}:${qop}:${ha2}`); let s = `Digest username="${USER}", realm="${realm}", nonce="${nonce}", uri="${uri}", qop=${qop}, nc=${nc}, cnonce="${cn}", response="${resp}", algorithm=MD5`; if (opaque) s += `, opaque="${opaque}"`; return s; }
async function get(path) { const url = BASE + path; const h = { Accept: "*/*" }; if (cookie) h.Cookie = cookie; let r = await fetch(url, { headers: h }); if (r.status === 401) { const wa = r.headers.get("www-authenticate") || ""; if (/digest/i.test(wa)) { h.Authorization = digestHeader("GET", path, parseChallenge(wa)); r = await fetch(url, { headers: h }); } } const sc = r.headers.get("set-cookie"); if (sc) { const s = sc.match(/X-SESSIONID=[^;]+/i); if (s) cookie = s[0]; } return { status: r.status, body: await r.text() }; }

const num = (v) => { const n = Number(v); return Number.isFinite(n) ? n : null; };
const txt = (v) => { if (v == null) return null; const s = String(v).trim(); return s === "" ? null : s; };
const firstNum = (v) => { const m = String(v ?? "").match(/\d[\d,]*/); return m ? Number(m[0].replace(/,/g, "")) : null; };
const splitCity = (raw) => { const m = String(raw ?? "").match(/^(.*?)\s*\(([^)]+)\)\s*$/); return m ? { city: m[1].trim(), community: m[2].trim() } : { city: txt(raw), community: null }; };
function mapRow(r) {
  const { city, community } = splitCity(r.City);
  const lease = txt(r.Lease);
  return {
    tenant_id: TENANT, source: "ddf", source_key: String(r.ListingKey), mls_number: txt(r.ListingId), status: "Active",
    property_type: txt(r.PropertyType), list_price: (num(r.ListPrice) || null) ?? firstNum(r.Lease), currency: "CAD",
    address_street: txt(r.UnparsedAddress), address_unit: txt(r.UnitNumber), address_city: city, address_province: txt(r.StateOrProvince),
    address_postal_code: txt(r.PostalCode), address_country: txt(r.Country) ?? "CA", latitude: num(r.Latitude), longitude: num(r.Longitude),
    bedrooms: num(r.BedroomsTotal), bathrooms: num(r.BathroomsTotal), sqft_total: firstNum(r.BuildingAreaTotal), lot_size_sqft: firstNum(r.LotSizeArea),
    year_built: num(r.YearBuilt), public_remarks: txt(r.PublicRemarks), listing_brokerage_name: txt(r.ListOfficeName), listing_agent_name: txt(r.ListAgentFullName),
    community, transaction_type: lease ? "For Lease" : "For Sale", photos_count: num(r.PhotosCount), more_info_url: txt(r.MoreInformationLink),
    modification_timestamp: (() => { const d = new Date(String(r.ModificationTimestamp)); return isNaN(d) ? new Date().toISOString() : d.toISOString(); })(),
    raw_data: { PhotosChangeTimestamp: r.PhotosChangeTimestamp ?? null, PhotosCount: r.PhotosCount ?? null }, updated_at: new Date().toISOString(),
  };
}

// 1) configure the feed (encrypted creds, active)
await sb.from("idx_feeds").upsert({ tenant_id: TENANT, source: "ddf", method: "rets", endpoint: BASE, encrypted_credentials: encryptSecret(JSON.stringify({ username: USER, password: PASS })), config: { provinces: ["Ontario"] }, status: "active", terms_accepted: true, updated_at: new Date().toISOString() }, { onConflict: "tenant_id,source" });
console.log("feed configured (active).");

// 2) sync recent listings
const login = await get("/Login.svc/Login");
console.log("login:", login.body.match(/ReplyText="([^"]*)"/)?.[1]);
const since = new Date(Date.now() - DAYS * 864e5).toISOString().replace(/\.\d{3}Z$/, "Z");
console.log(`syncing listings updated since ${since} (max ${MAX_PAGES} pages)…`);
let offset = 1, page = 0, total = 0;
while (page < MAX_PAGES) {
  const args = new URLSearchParams({ SearchType: "Property", Class: "Property", QueryType: "DMQL2", Format: "COMPACT-Decoded", Query: `(LastUpdated=${since})`, Count: "1", Limit: String(PAGE), Offset: String(offset), Culture: "en-CA" });
  const s = await get(`/Search.svc/Search?${args.toString()}`);
  const cols = (s.body.match(/<COLUMNS>([\s\S]*?)<\/COLUMNS>/i)?.[1] ?? "").split("\t");
  const data = [...s.body.matchAll(/<DATA>([\s\S]*?)<\/DATA>/gi)];
  if (!data.length) break;
  const rows = data.map((d) => { const v = d[1].split("\t"); const o = {}; cols.forEach((c, i) => { if (c.trim()) o[c.trim()] = (v[i] ?? "").replace(/&amp;/g, "&").trim(); }); return mapRow(o); }).filter((r) => r.source_key && r.source_key !== "undefined");
  const { error } = await sb.from("idx_listings").upsert(rows, { onConflict: "tenant_id,source,source_key" });
  if (error) { console.log("upsert error:", error.message); break; }
  total += rows.length; page++; offset += data.length;
  process.stdout.write(`  page ${page}: +${rows.length} (total ${total})\r`);
  if (data.length < PAGE) break;
}
await get("/Logout.svc/Logout");
console.log(`\nsynced ${total} listings.`);

// 3) sync state + summary
await sb.from("idx_sync_state").upsert({ tenant_id: TENANT, source: "ddf", last_modification_ts: new Date().toISOString(), last_run_at: new Date().toISOString(), status: "success", counts: { created: total } }, { onConflict: "tenant_id,source" });
const { count } = await sb.from("idx_listings").select("id", { count: "exact", head: true }).eq("tenant_id", TENANT).is("inactive_at", null);
const munis = await sb.rpc("idx_municipalities", { p_tenant: TENANT });
console.log(`\nTOTAL live listings: ${count}`);
console.log("Top municipalities:", (munis.data ?? []).slice(0, 12).map((m) => `${m.municipality} (${m.n})`).join(", "));
