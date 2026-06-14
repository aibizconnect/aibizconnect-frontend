import { createHash, randomBytes } from "node:crypto";
import type { FeedAdapter, FeedRuntime, PullResult, NormalizedListing } from "./adapter";
import { mapResoRecord } from "./adapter";

/**
 * CREA DDF® adapter — RETS 1.7.2 over HTTPS (confirmed from CREA's official Technical Documentation
 * + sample code, 2026-06-14). NOT REST/OData.
 *
 *   Login   GET {base}/Login.svc/Login        (HTTP Digest, realm "CREA.Distribution") -> X-SESSIONID cookie
 *   Search  GET {base}/Search.svc/Search?SearchType=Property&Class=Property&QueryType=DMQL2
 *             &Format=COMPACT-Decoded&Query=(LastUpdated=<RETSDateTime>)   (COMPACT = RESO Data Dictionary 1.0)
 *           master list via Query=(ID=*); reconcile removals against it.
 *   Object  GET {base}/Object.svc/GetObject?Resource=Property&ID=<key>:*&Type=LargePhoto   (photos; not in COMPACT)
 *   Logout  GET {base}/Logout.svc/Logout
 *
 * Production base = https://data.crea.ca. COMPACT field names are RESO Data Dictionary, so mapResoRecord
 * applies. Photos are fetched separately (PhotosChangeTimestamp gates a refresh) and cached to R2 — that
 * pipeline (and any live-response quirks) finalize against Ali's real credentials.
 */

const md5 = (s: string) => createHash("md5").update(s).digest("hex");
const MAX_PAGES = 50;
const PAGE_LIMIT = 100;

function parseChallenge(h: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of h.replace(/^Digest\s+/i, "").matchAll(/(\w+)=(?:"([^"]*)"|([^,]*))/g)) out[m[1]] = (m[2] ?? m[3] ?? "").trim();
  return out;
}
function digestHeader(user: string, pass: string, method: string, uri: string, ch: Record<string, string>, nc: string, cnonce: string): string {
  const { realm = "", nonce = "", qop = "auth", opaque } = ch;
  const ha1 = md5(`${user}:${realm}:${pass}`);
  const ha2 = md5(`${method}:${uri}`);
  const response = md5(`${ha1}:${nonce}:${nc}:${cnonce}:${qop}:${ha2}`);
  let s = `Digest username="${user}", realm="${realm}", nonce="${nonce}", uri="${uri}", qop=${qop}, nc=${nc}, cnonce="${cnonce}", response="${response}", algorithm=MD5`;
  if (opaque) s += `, opaque="${opaque}"`;
  return s;
}
function decodeEntities(s: string): string {
  return s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'");
}
/** Parse a RETS COMPACT payload (<COLUMNS> + <DATA>, tab-delimited) into field records. */
function parseCompact(xml: string): Record<string, string>[] {
  const delim = xml.match(/<DELIMITER\s+value="(\d+)"/i)?.[1] ?? "09";
  const sep = String.fromCharCode(parseInt(delim, 10));
  const cols = (xml.match(/<COLUMNS>([\s\S]*?)<\/COLUMNS>/i)?.[1] ?? "").split(sep);
  const records: Record<string, string>[] = [];
  for (const m of xml.matchAll(/<DATA>([\s\S]*?)<\/DATA>/gi)) {
    const vals = m[1].split(sep);
    const rec: Record<string, string> = {};
    for (let i = 0; i < cols.length; i++) { const k = cols[i].trim(); if (k) rec[k] = decodeEntities(vals[i] ?? "").trim(); }
    records.push(rec);
  }
  return records;
}
function retsReplyCode(xml: string): { code: string; text: string } {
  const m = xml.match(/<RETS\s+ReplyCode="(\d+)"\s+ReplyText="([^"]*)"/i);
  return { code: m?.[1] ?? "?", text: m?.[2] ?? "" };
}

export function createDdfAdapter(rt: FeedRuntime): FeedAdapter {
  const base = (rt.endpoint ?? "https://data.crea.ca").replace(/\/+$/, "");
  const user = String(rt.credentials?.username ?? "");
  const pass = String(rt.credentials?.password ?? rt.credentials?.token ?? "");
  const ready = !!base && !!user && !!pass;
  let cookie: string | null = null;

  // GET with Digest (auto re-challenges) + the X-SESSIONID session cookie.
  async function get(path: string): Promise<{ status: number; body: string }> {
    const url = base + path;
    const uri = path; // Digest uri = request path
    const headers: Record<string, string> = { Accept: "*/*" };
    if (cookie) headers.Cookie = cookie;
    let res = await fetch(url, { headers });
    if (res.status === 401) {
      const wa = res.headers.get("www-authenticate") ?? "";
      if (/digest/i.test(wa)) {
        const ch = parseChallenge(wa);
        const cnonce = randomBytes(8).toString("hex");
        headers.Authorization = digestHeader(user, pass, "GET", uri, ch, "00000001", cnonce);
        res = await fetch(url, { headers });
      }
    }
    const sc = res.headers.get("set-cookie");
    if (sc) { const sid = sc.match(/X-SESSIONID=[^;]+/i)?.[0]; if (sid) cookie = sid; }
    return { status: res.status, body: await res.text() };
  }

  async function login(): Promise<{ ok: boolean; error?: string }> {
    const r = await get("/Login.svc/Login");
    const reply = retsReplyCode(r.body);
    if (r.status === 200 && reply.code === "0") return { ok: true };
    return { ok: false, error: `Login failed (HTTP ${r.status}, RETS ${reply.code} ${reply.text})` };
  }
  async function logout(): Promise<void> { try { await get("/Logout.svc/Logout"); } catch { /* */ } }

  function searchPath(query: string, offset: number): string {
    const args = new URLSearchParams({
      SearchType: "Property", Class: "Property", QueryType: "DMQL2", Format: "COMPACT-Decoded",
      Query: query, Count: "1", Limit: String(PAGE_LIMIT), Offset: String(offset), Culture: "en-CA",
    });
    return `/Search.svc/Search?${args.toString()}`;
  }

  return {
    async verify() {
      if (!ready) return { ok: false, error: "Add your CREA DDF username and password first." };
      const lg = await login();
      if (!lg.ok) return { ok: false, error: lg.error };
      const r = await get(searchPath("(LastUpdated=2999-01-01T00:00:00Z)", 1)); // count-only-ish, empty set
      await logout();
      return { ok: r.status === 200, error: r.status === 200 ? undefined : `Search probe HTTP ${r.status}` };
    },

    async pullModifiedSince(sinceIso: string | null): Promise<PullResult> {
      if (!ready) return { listings: [], complete: true }; // flag-safe no-op until wired
      const lg = await login();
      if (!lg.ok) throw new Error(lg.error);
      // CREA wants RETSDateTime without millis; (LastUpdated=X) means ">= X" (no "+" suffix — that 20206s).
      const since = (sinceIso ?? "1970-01-01T00:00:00Z").replace(/\.\d{1,3}Z$/, "Z").replace(/(\d{2}:\d{2}:\d{2})$/, "$1Z");
      const query = `(LastUpdated=${since})`;
      const listings: NormalizedListing[] = [];
      let maxTs = sinceIso ?? null;
      let offset = 1, pages = 0, complete = true;
      try {
        while (pages < MAX_PAGES) {
          const { status, body } = await get(searchPath(query, offset));
          if (status !== 200) break;
          const records = parseCompact(body);
          if (!records.length) break;
          for (const r of records) {
            const l = mapResoRecord(r);
            // COMPACT carries no photo URLs — photos arrive via GetObject; keep PhotosChangeTimestamp for the refresh gate.
            (l.raw as Record<string, unknown>) = { ...r, _photosChangeTs: r.PhotosChangeTimestamp ?? null };
            l.media = [];
            listings.push(l);
            if (!maxTs || l.modificationTimestamp > maxTs) maxTs = l.modificationTimestamp;
          }
          pages += 1;
          if (records.length < PAGE_LIMIT) break;
          offset += records.length;
          if (pages >= MAX_PAGES) { complete = false; break; }
        }
      } finally { await logout(); }
      return { listings, nextSince: maxTs, complete };
    },
  };
}
