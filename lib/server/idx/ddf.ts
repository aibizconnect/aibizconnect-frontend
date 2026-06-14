import type { FeedAdapter, FeedRuntime, PullResult, NormalizedListing } from "./adapter";
import { mapResoRecord } from "./adapter";

/**
 * CREA DDF® adapter (G4, D-346 — REST/OData first). RESO Web API shape: GET {endpoint}/Property
 * with $filter on ModificationTimestamp, $orderby, $top paging, $expand=Media; bearer/token auth.
 *
 * WIRE POINT: the exact DDF base URL, auth header, resource name and any field quirks land with
 * Ali's credentials (~2026-06-15). Until then this no-ops safely (no endpoint/creds → empty pull),
 * so the scaffold is flag-safe. The RESO field mapping (mapResoRecord) is already correct.
 *
 * TODO(live): per D-348, pipe each Media URL through lib/media/ingest.ingestExternalImage to cache
 * to R2 (sourceType 'idx_ddf') and store the R2 url — DDF terms require provider-served images.
 */

const PAGE_SIZE = 200;
const MAX_PAGES_PER_RUN = 25;

function authHeaders(creds: Record<string, unknown> | null | undefined): Record<string, string> {
  if (!creds) return {};
  if (creds.token) return { Authorization: `Bearer ${creds.token}` };
  if (creds.api_key) return { Authorization: `Bearer ${creds.api_key}` };
  if (creds.bearer) return { Authorization: `Bearer ${creds.bearer}` };
  return {};
}

export function createDdfAdapter(rt: FeedRuntime): FeedAdapter {
  const ready = !!rt.endpoint && !!rt.credentials && Object.keys(rt.credentials).length > 0;
  const base = (rt.endpoint ?? "").replace(/\/+$/, "");
  const headers = { Accept: "application/json", ...authHeaders(rt.credentials) };

  async function fetchPage(url: string): Promise<{ records: any[]; next: string | null }> {
    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error(`DDF ${res.status}`);
    const json: any = await res.json().catch(() => ({}));
    const records: any[] = json?.value ?? json?.Property ?? (Array.isArray(json) ? json : []);
    const next: string | null = json?.["@odata.nextLink"] ?? null;
    return { records, next };
  }

  return {
    async verify() {
      if (!ready) return { ok: false, error: "Add the DDF endpoint and credentials first." };
      try { const { records } = await fetchPage(`${base}/Property?$top=1&$expand=Media`); return { ok: true, sample: records.length }; }
      catch (e: any) { return { ok: false, error: e?.message ?? "DDF connection failed." }; }
    },
    async pullModifiedSince(sinceIso: string | null): Promise<PullResult> {
      if (!ready) return { listings: [], complete: true }; // flag-safe no-op until wired
      const filter = sinceIso ? `&$filter=${encodeURIComponent(`ModificationTimestamp gt ${sinceIso}`)}` : "";
      let url = `${base}/Property?$orderby=ModificationTimestamp&$top=${PAGE_SIZE}&$expand=Media${filter}`;
      const listings: NormalizedListing[] = [];
      let maxTs = sinceIso ?? null;
      let pages = 0;
      while (url && pages < MAX_PAGES_PER_RUN) {
        const { records, next } = await fetchPage(url);
        for (const r of records) {
          const l = mapResoRecord(r);
          listings.push(l);
          if (!maxTs || l.modificationTimestamp > maxTs) maxTs = l.modificationTimestamp;
        }
        pages += 1;
        url = next ?? "";
      }
      return { listings, nextSince: maxTs, complete: !url };
    },
  };
}
