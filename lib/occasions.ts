/**
 * 🔒 LOCKED (Ali, 2026-06-05) — do NOT change behavior/structure without Ali's explicit
 * say-so to re-open Occasions. See src/docs/occasions-LOCKED.md.
 *
 * Occasions Engine. TWO independent things:
 *   1. ANIMATIONS — the ambient "flying" effects (snow, santa, hearts, confetti, lanterns,
 *      leaves, butterflies, sun rays, petals, shamrocks, pumpkins). One global settings panel.
 *      Scheduled on their own (always, or a date range). Powered by Ali's snow + Santa scripts.
 *   2. HOLIDAY BANNERS — US / Canadian / Cultural New Years / Other Celebrations. Each is just
 *      a dated BANNER ("Happy New Year!"). No animation attached.
 * Plus tenant custom banner occasions. Persisted to theme.site.occasions (no migration).
 */

export type OccasionCategory = "us" | "ca" | "cultural" | "other";

// ── the animation list (the "flying things") — NO fireworks ───────────────────
export type AnimationKind =
  | "snow" | "santa" | "fireworks" | "hearts" | "confetti" | "lanterns"
  | "leaves" | "butterflies" | "sunrays" | "petals" | "shamrocks" | "pumpkins";
export type AnimationEngine = "emoji" | "sprite" | "glow" | "fireworks";
export interface AnimationDef { key: AnimationKind; label: string; engine: AnimationEngine; glyph?: string; glyphs?: string[]; rise?: boolean; }

export const ANIMATIONS: AnimationDef[] = [
  { key: "snow", label: "Snowfall", engine: "emoji", glyph: "❄️" },
  { key: "santa", label: "Santa flying", engine: "sprite" },
  { key: "fireworks", label: "Fireworks", engine: "fireworks" },
  { key: "hearts", label: "Hearts floating", engine: "emoji", glyph: "❤️", glyphs: ["❤️", "💖", "💗", "💕", "🩷", "❣️"], rise: true },
  { key: "confetti", label: "Confetti", engine: "emoji", glyph: "🎊" },
  { key: "lanterns", label: "Floating lanterns", engine: "emoji", glyph: "🏮", rise: true },
  { key: "leaves", label: "Leaves falling", engine: "emoji", glyph: "🍂" },
  { key: "butterflies", label: "Butterflies", engine: "emoji", glyph: "🦋", rise: true },
  { key: "sunrays", label: "Sun rays", engine: "glow" },
  { key: "petals", label: "Petals", engine: "emoji", glyph: "🌸" },
  { key: "shamrocks", label: "Shamrocks", engine: "emoji", glyph: "☘️" },
  { key: "pumpkins", label: "Pumpkins", engine: "emoji", glyph: "🎃" },
];
export const ANIM_BY_KEY: Record<AnimationKind, AnimationDef> = Object.fromEntries(ANIMATIONS.map((a) => [a.key, a])) as any;

export type EffectLocation = "full" | "top" | "middle" | "bottom" | "left" | "right" | "center";

/** ONE shared settings panel for the animations. */
export interface EffectSettings {
  size?: number; speed?: number; randomness?: number; density?: number; location?: EffectLocation;
}
export const DEFAULT_EFFECT_SETTINGS: Required<Omit<EffectSettings, "location">> & { location: EffectLocation } = {
  size: 22, speed: 5, randomness: 60, density: 40, location: "full",
};

/** Per-animation schedule (fixed list, keyed by animation; nothing is added/removed). */
export interface AnimSchedule {
  enabled?: boolean;
  always?: boolean;              // run all year
  startDate?: string;            // else a date range YYYY-MM-DD
  endDate?: string;
}

export type BannerPosition =
  | "top-left" | "top-center" | "top-right"
  | "middle-left" | "center" | "middle-right"
  | "bottom-left" | "bottom-center" | "bottom-right";

/** Banner styling. */
export interface BannerSettings {
  message?: string;
  position?: BannerPosition;
  widthPx?: number;        // fixed width in px (blank = auto-fit the text)
  bg?: string;             // background colour (hex)
  textColor?: string;      // text colour (hex)
  dismissible?: boolean;
  pattern?: "solid" | "glow" | "pulse" | "dashed" | "neon";
}
export const BANNER_POSITIONS: BannerPosition[] = [
  "top-left", "top-center", "top-right", "middle-left", "center", "middle-right", "bottom-left", "bottom-center", "bottom-right",
];

/** A holiday's banner config (keyed by catalog id) — on/off + message + date override + how to
 *  show it (static banner vs fly-across). `style` optionally OVERRIDES the shared appearance for
 *  just this occasion (any field left unset falls back to the shared bannerStyle). */
export interface BannerEntry { enabled?: boolean; message?: string; date?: string | null; fly?: boolean; style?: BannerSettings; }

/** Custom dated banner occasion. */
export interface CustomBanner { id: string; name: string; startDate: string; endDate?: string | null; enabled: boolean; message?: string; fly?: boolean; style?: BannerSettings; }

/** Persisted shape on theme.site.occasions. */
export interface OccasionsConfig {
  settings?: EffectSettings;                          // ONE global control (size/speed/density/randomness/location) — drives animations AND the fly-across
  bannerStyle?: BannerSettings;                       // ONE shared banner appearance (colour/position/width/pattern)
  animations?: Partial<Record<AnimationKind, AnimSchedule>>; // the flying things (fixed list)
  banners?: Record<string, BannerEntry>;             // holiday banners, keyed by catalog id
  custom?: CustomBanner[];                            // custom banner occasions
}

// ── date helpers ──────────────────────────────────────────────────────────────
const d = (y: number, m: number, day: number) => new Date(y, m - 1, day);
const addDays = (b: Date, n: number) => new Date(b.getFullYear(), b.getMonth(), b.getDate() + n);
const around = (dt: Date, pb = 1, pa = 1) => ({ start: addDays(dt, -pb), end: addDays(dt, pa) });
const span = (s: Date, e: Date) => ({ start: s, end: e });
function nthWeekday(y: number, month: number, weekday: number, n: number): Date {
  if (n === -1) { const last = new Date(y, month, 0); const back = (last.getDay() - weekday + 7) % 7; return new Date(y, month - 1, last.getDate() - back); }
  const first = new Date(y, month - 1, 1); const fwd = (weekday - first.getDay() + 7) % 7; return new Date(y, month - 1, 1 + fwd + (n - 1) * 7);
}
function easter(y: number): Date {
  const a = y % 19, b = Math.floor(y / 100), c = y % 100, e = Math.floor(b / 4), f = b % 4;
  const g = Math.floor((8 * b + 13) / 25), h = (19 * a + b - e - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * f + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 19 * l) / 433), month = Math.floor((h + l - 7 * m + 90) / 25);
  const day = (h + l - 7 * m + 33 * month + 19) % 32; return new Date(y, month - 1, day);
}
const LUNAR: Record<string, Record<number, string>> = {
  "cultural-chinese-new-year": { 2025: "2025-01-29", 2026: "2026-02-17", 2027: "2027-02-06" },
  "cultural-nowruz": { 2025: "2025-03-20", 2026: "2026-03-20", 2027: "2027-03-21" },
  "cultural-indian-new-year": { 2025: "2025-04-14", 2026: "2026-04-14", 2027: "2027-04-14" },
  "cultural-rosh-hashanah": { 2025: "2025-09-22", 2026: "2026-09-11", 2027: "2027-10-02" },
  "other-diwali": { 2025: "2025-10-20", 2026: "2026-11-08", 2027: "2027-10-29" },
  "other-eid": { 2025: "2025-03-30", 2026: "2026-03-20", 2027: "2027-03-09" },
  "other-hanukkah": { 2025: "2025-12-14", 2026: "2026-12-04", 2027: "2027-12-24" },
};
function lunarWindow(id: string, fbMonth: number, fbDay: number, padB: number, padA: number) {
  return (y: number) => { const iso = LUNAR[id]?.[y]; const dt = iso ? new Date(iso + "T00:00:00") : d(y, fbMonth, fbDay); return around(dt, padB, padA); };
}

// ── holiday catalog (banners only) ────────────────────────────────────────────
export interface CatalogOccasion {
  id: string; name: string; category: OccasionCategory; welcome: string;
  window: (year: number) => { start: Date; end: Date };
  variable?: boolean;
}
export const OCCASION_CATALOG: CatalogOccasion[] = [
  // US holidays
  { id: "us-new-year", name: "New Year's Day", category: "us", welcome: "Happy New Year!", window: (y) => around(d(y, 1, 1)) },
  { id: "us-mlk", name: "Martin Luther King Jr. Day", category: "us", welcome: "MLK Jr. Day", window: (y) => around(nthWeekday(y, 1, 1, 3)) },
  { id: "us-valentines", name: "Valentine's Day", category: "us", welcome: "Happy Valentine's Day", window: (y) => around(d(y, 2, 14), 2, 1) },
  { id: "us-st-patricks", name: "St. Patrick's Day", category: "us", welcome: "Happy St. Patrick's Day", window: (y) => around(d(y, 3, 17)) },
  { id: "us-easter", name: "Easter", category: "us", welcome: "Happy Easter", window: (y) => around(easter(y), 2, 1), variable: true },
  { id: "us-mothers-day", name: "Mother's Day", category: "us", welcome: "Happy Mother's Day", window: (y) => around(nthWeekday(y, 5, 0, 2)) },
  { id: "us-fathers-day", name: "Father's Day", category: "us", welcome: "Happy Father's Day", window: (y) => around(nthWeekday(y, 6, 0, 3)) },
  { id: "us-memorial-day", name: "Memorial Day", category: "us", welcome: "Memorial Day", window: (y) => around(nthWeekday(y, 5, 1, -1)) },
  { id: "us-independence-day", name: "Independence Day", category: "us", welcome: "Happy 4th of July!", window: (y) => around(d(y, 7, 4), 1, 1) },
  { id: "us-labor-day", name: "Labor Day", category: "us", welcome: "Happy Labor Day", window: (y) => around(nthWeekday(y, 9, 1, 1)) },
  { id: "us-halloween", name: "Halloween", category: "us", welcome: "Happy Halloween", window: (y) => around(d(y, 10, 31), 6, 0) },
  { id: "us-thanksgiving", name: "Thanksgiving (US)", category: "us", welcome: "Happy Thanksgiving", window: (y) => around(nthWeekday(y, 11, 4, 4), 2, 1) },
  { id: "us-christmas", name: "Christmas", category: "us", welcome: "Merry Christmas!", window: (y) => span(d(y, 12, 1), d(y, 12, 26)) },
  // Canadian holidays
  { id: "ca-family-day", name: "Family Day", category: "ca", welcome: "Happy Family Day", window: (y) => around(nthWeekday(y, 2, 1, 3)) },
  { id: "ca-victoria-day", name: "Victoria Day", category: "ca", welcome: "Victoria Day", window: (y) => around(nthWeekday(y, 5, 1, -1)) },
  { id: "ca-canada-day", name: "Canada Day", category: "ca", welcome: "Happy Canada Day!", window: (y) => around(d(y, 7, 1), 1, 1) },
  { id: "ca-civic-holiday", name: "Civic Holiday", category: "ca", welcome: "Civic Holiday", window: (y) => around(nthWeekday(y, 8, 1, 1)) },
  { id: "ca-labour-day", name: "Labour Day", category: "ca", welcome: "Happy Labour Day", window: (y) => around(nthWeekday(y, 9, 1, 1)) },
  { id: "ca-thanksgiving", name: "Thanksgiving (CA)", category: "ca", welcome: "Happy Thanksgiving", window: (y) => around(nthWeekday(y, 10, 1, 2)) },
  { id: "ca-remembrance", name: "Remembrance Day", category: "ca", welcome: "Remembrance Day", window: (y) => around(d(y, 11, 11)) },
  { id: "ca-boxing-day", name: "Boxing Day", category: "ca", welcome: "Boxing Day", window: (y) => around(d(y, 12, 26)) },
  // Cultural new years
  { id: "cultural-chinese-new-year", name: "Chinese New Year", category: "cultural", welcome: "Happy Lunar New Year", variable: true, window: lunarWindow("cultural-chinese-new-year", 2, 18, 2, 1) },
  { id: "cultural-nowruz", name: "Persian New Year (Nowruz)", category: "cultural", welcome: "Happy Nowruz", variable: true, window: lunarWindow("cultural-nowruz", 3, 20, 1, 1) },
  { id: "cultural-indian-new-year", name: "Indian New Year", category: "cultural", welcome: "Happy New Year", variable: true, window: lunarWindow("cultural-indian-new-year", 4, 14, 1, 1) },
  { id: "cultural-rosh-hashanah", name: "Hebrew New Year (Rosh Hashanah)", category: "cultural", welcome: "Shanah Tovah", variable: true, window: lunarWindow("cultural-rosh-hashanah", 9, 16, 1, 1) },
  // Other celebrations
  { id: "other-cinco-de-mayo", name: "Cinco de Mayo", category: "other", welcome: "Happy Cinco de Mayo", window: (y) => around(d(y, 5, 5)) },
  { id: "other-diwali", name: "Diwali", category: "other", welcome: "Happy Diwali", variable: true, window: lunarWindow("other-diwali", 10, 25, 2, 2) },
  { id: "other-eid", name: "Eid", category: "other", welcome: "Eid Mubarak", variable: true, window: lunarWindow("other-eid", 4, 10, 1, 1) },
  { id: "other-hanukkah", name: "Hanukkah", category: "other", welcome: "Happy Hanukkah", variable: true, window: lunarWindow("other-hanukkah", 12, 14, 0, 8) },
  { id: "other-pride", name: "Pride Month", category: "other", welcome: "Happy Pride", window: (y) => span(d(y, 6, 1), d(y, 6, 30)) },
  { id: "other-black-friday", name: "Black Friday", category: "other", welcome: "Black Friday Sale", window: (y) => around(addDays(nthWeekday(y, 11, 4, 4), 1)) },
  { id: "other-cyber-monday", name: "Cyber Monday", category: "other", welcome: "Cyber Monday Sale", window: (y) => around(addDays(nthWeekday(y, 11, 4, 4), 4)) },
];
export const CATEGORY_LABELS: Record<OccasionCategory, string> = { us: "US Holidays", ca: "Canadian Holidays", cultural: "Cultural New Years", other: "Other Celebrations" };
export const CATEGORY_ORDER: OccasionCategory[] = ["us", "ca", "cultural", "other"];

export function catalogByCategory(year: number): Record<OccasionCategory, { occ: CatalogOccasion; date: Date }[]> {
  const g = {} as Record<OccasionCategory, { occ: CatalogOccasion; date: Date }[]>;
  for (const c of CATEGORY_ORDER) g[c] = [];
  for (const occ of OCCASION_CATALOG) g[occ.category].push({ occ, date: occ.window(year).start });
  for (const c of CATEGORY_ORDER) g[c].sort((a, b) => a.date.getTime() - b.date.getTime());
  return g;
}

// ── resolve what's active ────────────────────────────────────────────────────
export interface ActiveBanner { id: string; name: string; banner: BannerSettings; fly?: boolean; }
export interface ActiveState { animation?: AnimationKind; settings?: EffectSettings; banners: ActiveBanner[]; }

const within = (t: Date, s: Date, e: Date) => t >= s && t <= e;

export function resolveActive(cfg: OccasionsConfig | undefined, today: Date): ActiveState {
  const y = today.getFullYear();
  // Active animation = first enabled animation that's "always" or whose range includes today.
  let animation: AnimationKind | undefined;
  for (const def of ANIMATIONS) {
    const a = cfg?.animations?.[def.key];
    if (!a?.enabled) continue;
    if (a.always) { animation = def.key; break; }
    if (a.startDate) {
      const s = new Date(a.startDate + "T00:00:00"), e = new Date((a.endDate || a.startDate) + "T23:59:59");
      if (within(today, s, e)) { animation = def.key; break; }
    }
  }
  // Active holiday banners (on their date) + custom banners (in range). Appearance is the
  // ONE shared bannerStyle; per-banner only sets message + fly.
  const style = cfg?.bannerStyle ?? {};
  const banners: ActiveBanner[] = [];
  for (const occ of OCCASION_CATALOG) {
    const b = cfg?.banners?.[occ.id];
    if (!b?.enabled) continue;
    let win = occ.window(y);
    if (occ.variable && b.date) win = around(new Date(b.date + "T00:00:00"), 1, 1);
    if (within(today, win.start, win.end)) {
      banners.push({ id: occ.id, name: occ.name, fly: b.fly, banner: { ...style, ...(b.style ?? {}), message: b.message || occ.welcome } });
    }
  }
  for (const c of cfg?.custom ?? []) {
    if (!c.enabled) continue;
    const s = new Date(c.startDate + "T00:00:00"), e = new Date((c.endDate || c.startDate) + "T23:59:59");
    if (within(today, s, e)) banners.push({ id: c.id, name: c.name, fly: c.fly, banner: { ...style, ...(c.style ?? {}), message: c.message || c.name } });
  }
  return { animation, settings: cfg?.settings, banners };
}
