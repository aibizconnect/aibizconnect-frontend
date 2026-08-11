/**
 * Shared config contract for the embeddable Listings block (the "GHL block"): the loader script's
 * data-* attributes, the /embed/listings/<tenantId> query string, and the config page's live
 * preview all speak this one shape, so a snippet and a preview can never drift apart.
 *
 * Per-agent by construction: `tenantId` selects the agent's OWN DDF/IDX feed (idx_feeds row), so
 * every embed only ever renders listings synced against that agent's credentials.
 */

export interface BlockFilter {
  class?: string;          // property class: Residential | Condo & Other | Commercial
  t?: string;              // transaction type: For Sale | For Lease
  city?: string;
  municipality?: string;
  community?: string;
  min?: number;            // min price
  max?: number;            // max price
  beds?: number;
  baths?: number;
  use?: string;            // commercial property use
  sqft?: number;           // min building sqft
}

export interface BlockOptions {
  count: number;           // cards per page (1–24)
  columns: number;         // grid columns (1–4)
  sort: string;            // newest | price_asc | price_desc
  showSearch: boolean;     // visitor-editable filter bar
  showSort: boolean;
  showFavorites: boolean;
  showBadges: boolean;
  showAttribution: boolean;
  showDisclaimer: boolean;
  detail: boolean;         // open listing detail inside the block (vs. link to the site page)
  accent?: string;         // overrides the tenant brand colour
  heading?: string;
}

export const DEFAULT_OPTIONS: BlockOptions = {
  count: 6, columns: 3, sort: "newest",
  showSearch: true, showSort: true, showFavorites: true,
  showBadges: true, showAttribution: true, showDisclaimer: true,
  detail: true,
};

/** Filter keys carried on the wire, in snippet/query order. */
export const FILTER_KEYS = ["class", "t", "city", "municipality", "community", "min", "max", "beds", "baths", "use", "sqft"] as const;
const NUMERIC_FILTERS = new Set(["min", "max", "beds", "baths", "sqft"]);

const bool = (v: string | undefined, dflt: boolean): boolean =>
  v == null || v === "" ? dflt : !/^(0|false|no|off)$/i.test(v);

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/** Parse a query string / data-* bag into a filter + options pair. Unknown keys are ignored. */
export function parseBlockConfig(get: (key: string) => string | undefined): { filter: BlockFilter; options: BlockOptions } {
  const filter: BlockFilter = {};
  for (const k of FILTER_KEYS) {
    const raw = get(k)?.trim();
    if (!raw) continue;
    if (NUMERIC_FILTERS.has(k)) {
      const n = Number(raw);
      if (Number.isFinite(n)) (filter as Record<string, unknown>)[k] = n;
    } else {
      (filter as Record<string, unknown>)[k] = raw;
    }
  }
  const sort = get("sort")?.trim() || DEFAULT_OPTIONS.sort;
  const options: BlockOptions = {
    count: clamp(Number(get("count")) || DEFAULT_OPTIONS.count, 1, 24),
    columns: clamp(Number(get("columns")) || DEFAULT_OPTIONS.columns, 1, 4),
    sort: ["newest", "price_asc", "price_desc"].includes(sort) ? sort : DEFAULT_OPTIONS.sort,
    showSearch: bool(get("search"), DEFAULT_OPTIONS.showSearch),
    showSort: bool(get("sortui"), DEFAULT_OPTIONS.showSort),
    showFavorites: bool(get("favorites"), DEFAULT_OPTIONS.showFavorites),
    showBadges: bool(get("badges"), DEFAULT_OPTIONS.showBadges),
    showAttribution: bool(get("attribution"), DEFAULT_OPTIONS.showAttribution),
    showDisclaimer: bool(get("disclaimer"), DEFAULT_OPTIONS.showDisclaimer),
    detail: bool(get("detail"), DEFAULT_OPTIONS.detail),
    accent: get("accent")?.trim() || undefined,
    heading: get("heading")?.trim() || undefined,
  };
  return { filter, options };
}

/** Serialize a config back to the embed query string (only non-default values travel). */
export function blockConfigToQuery(filter: BlockFilter, options: Partial<BlockOptions>): URLSearchParams {
  const q = new URLSearchParams();
  for (const k of FILTER_KEYS) {
    const v = (filter as Record<string, unknown>)[k];
    if (v != null && v !== "") q.set(k, String(v));
  }
  const flags: [keyof BlockOptions, string][] = [
    ["showSearch", "search"], ["showSort", "sortui"], ["showFavorites", "favorites"],
    ["showBadges", "badges"], ["showAttribution", "attribution"], ["showDisclaimer", "disclaimer"], ["detail", "detail"],
  ];
  for (const [key, param] of flags) {
    const v = options[key] as boolean | undefined;
    if (v != null && v !== DEFAULT_OPTIONS[key]) q.set(param, v ? "1" : "0");
  }
  if (options.count != null && options.count !== DEFAULT_OPTIONS.count) q.set("count", String(options.count));
  if (options.columns != null && options.columns !== DEFAULT_OPTIONS.columns) q.set("columns", String(options.columns));
  if (options.sort && options.sort !== DEFAULT_OPTIONS.sort) q.set("sort", options.sort);
  if (options.accent) q.set("accent", options.accent);
  if (options.heading) q.set("heading", options.heading);
  return q;
}
