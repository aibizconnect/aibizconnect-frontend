/**
 * Occasions Widget — region categorization (Global / Canada / United States / My custom).
 *
 * ADDITIVE + lock-safe: this maps each LOCKED `OCCASION_CATALOG` id (lib/occasions.ts) to a
 * user-facing region WITHOUT editing the locked engine. The catalog's own `category`
 * ("us"|"ca"|"cultural"|"other") groups by where a holiday originated; this regroups by who
 * actually wants to show it:
 *   - Global   = broadly observed / cross-cultural (New Year, Valentine's, Christmas, the
 *                cultural new years, Diwali/Eid/Hanukkah, Black Friday…). The default.
 *   - Canada   = Canada-only statutory days (Canada Day, Canadian Thanksgiving, …).
 *   - US       = US-only federal days (July 4, US Thanksgiving, Memorial/Labor/MLK, …).
 *   - custom   = tenant-created occasions (cfg.custom[]).
 *
 * Pure module (no server/client deps) so both the dashboard UI and server can import it.
 */

export type WidgetRegion = "global" | "ca" | "us" | "custom";

export const REGION_META: Record<WidgetRegion, { label: string; tone: "brand" | "danger" | "neutral" | "warning" }> = {
  global: { label: "Global", tone: "brand" },
  ca: { label: "Canada", tone: "danger" },
  us: { label: "United States", tone: "neutral" },
  custom: { label: "My custom", tone: "warning" },
};

/** Catalog id → region. Anything not listed defaults to "global". */
export const REGION_BY_ID: Record<string, WidgetRegion> = {
  // ── US-only federal days ──────────────────────────────────────────────
  "us-mlk": "us",
  "us-memorial-day": "us",
  "us-independence-day": "us",
  "us-labor-day": "us",
  "us-thanksgiving": "us",
  // ── Canada-only statutory days ────────────────────────────────────────
  "ca-family-day": "ca",
  "ca-victoria-day": "ca",
  "ca-canada-day": "ca",
  "ca-civic-holiday": "ca",
  "ca-labour-day": "ca",
  "ca-thanksgiving": "ca",
  "ca-remembrance": "ca",
  "ca-boxing-day": "ca",
  // ── Everything else is Global (explicit for clarity) ──────────────────
  "us-new-year": "global",
  "us-valentines": "global",
  "us-st-patricks": "global",
  "us-easter": "global",
  "us-mothers-day": "global",
  "us-fathers-day": "global",
  "us-halloween": "global",
  "us-christmas": "global",
  "cultural-chinese-new-year": "global",
  "cultural-nowruz": "global",
  "cultural-indian-new-year": "global",
  "cultural-rosh-hashanah": "global",
  "other-cinco-de-mayo": "global",
  "other-diwali": "global",
  "other-eid": "global",
  "other-hanukkah": "global",
  "other-pride": "global",
  "other-black-friday": "global",
  "other-cyber-monday": "global",
};

export function regionOf(catalogId: string): WidgetRegion {
  return REGION_BY_ID[catalogId] ?? "global";
}

/** The filter chips, in display order. */
export const REGION_CHIPS: { key: WidgetRegion | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "global", label: "Global" },
  { key: "ca", label: "Canada" },
  { key: "us", label: "United States" },
  { key: "custom", label: "My custom" },
];
