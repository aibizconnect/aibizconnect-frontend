"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { getSiteSettings, saveSiteSettings } from "../actions";
import SiteOccasions from "@/components/site/SiteOccasions";
import {
  ANIMATIONS, catalogByCategory, CATEGORY_LABELS, CATEGORY_ORDER, DEFAULT_EFFECT_SETTINGS, BANNER_POSITIONS,
  type OccasionsConfig, type AnimationKind, type EffectSettings, type BannerSettings, type ActiveState,
  type CustomBanner, type AnimSchedule, type OccasionCategory,
} from "@/lib/occasions";

// 🔓 RE-OPENED (Ali, 2026-06-21 — D-405): polish the Occasions panel to match the website design
// and surface explicit start/end show-windows. The live RENDERER (SiteOccasions) + animation
// behaviour are unchanged; this is panel presentation + the start/end window only.
const PATTERNS: BannerSettings["pattern"][] = ["solid", "glow", "pulse", "dashed", "neon"];
const ANIM_GLYPH: Record<string, string> = Object.fromEntries(ANIMATIONS.map((a) => [a.key, a.glyph ?? (a.key === "santa" ? "🎅" : a.key === "sunrays" ? "☀" : a.key === "fireworks" ? "🎆" : "✨")]));
const fmt = (dt: Date) => dt.toLocaleDateString(undefined, { month: "short", day: "numeric" });
const today = () => new Date().toISOString().slice(0, 10);

const NAVY = "#1e3a8a";
const dateInp = "rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-700 focus:border-[#1e3a8a] focus:outline-none focus:ring-1 focus:ring-[#1e3a8a]";
const card = "rounded-2xl border border-slate-200 bg-white shadow-sm";

function Switch({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" role="switch" aria-checked={on} onClick={() => onChange(!on)}
      className={`relative h-6 w-11 flex-none rounded-full transition ${on ? "bg-[#1e3a8a]" : "bg-slate-300"}`}>
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? "left-[22px]" : "left-0.5"}`} />
    </button>
  );
}

/** ONE global control — drives every animation AND the fly-across. No location (random). */
function AnimControls({ s, onChange }: { s: EffectSettings | undefined; onChange: (p: Partial<EffectSettings>) => void }) {
  const v = { ...DEFAULT_EFFECT_SETTINGS, ...(s ?? {}) };
  const Range = ({ k, label, min, max }: { k: "size" | "speed" | "randomness" | "density"; label: string; min: number; max: number }) => (
    <label className="flex items-center gap-3 text-xs text-slate-600">
      <span className="w-20 font-medium text-slate-500">{label}</span>
      <input type="range" min={min} max={max} value={(v as any)[k]} onChange={(e) => onChange({ [k]: Number(e.target.value) } as any)} className="h-1.5 flex-1 accent-[#1e3a8a]" />
      <span className="w-7 text-right tabular-nums text-slate-400">{(v as any)[k]}</span>
    </label>
  );
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <Range k="size" label="Size" min={10} max={48} />
      <Range k="speed" label="Speed" min={1} max={10} />
      <Range k="density" label="Density" min={5} max={100} />
      <Range k="randomness" label="Randomness" min={0} max={100} />
    </div>
  );
}

/** ONE shared banner appearance (colour / position / width / pattern). */
function BannerStyle({ s, onChange }: { s: BannerSettings | undefined; onChange: (p: Partial<BannerSettings>) => void }) {
  const v = s ?? {};
  const wrap = "flex items-center gap-1.5 text-xs text-slate-600";
  const sel = "flex-1 rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs focus:border-[#1e3a8a] focus:outline-none";
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
      <label className={wrap}>Background
        <input type="color" value={v.bg ?? NAVY} onChange={(e) => onChange({ bg: e.target.value })} className="h-7 w-9 cursor-pointer rounded border border-slate-300" /></label>
      <label className={wrap}>Text
        <input type="color" value={v.textColor ?? "#ffffff"} onChange={(e) => onChange({ textColor: e.target.value })} className="h-7 w-9 cursor-pointer rounded border border-slate-300" /></label>
      <label className={wrap}>Pattern
        <select value={v.pattern ?? "solid"} onChange={(e) => onChange({ pattern: e.target.value as any })} className={`${sel} capitalize`}>
          {PATTERNS.map((p) => <option key={p} value={p}>{p}</option>)}</select></label>
      <label className={wrap}>Position
        <select value={v.position ?? "top-center"} onChange={(e) => onChange({ position: e.target.value as any })} className={sel}>
          {BANNER_POSITIONS.map((p) => <option key={p} value={p}>{p.replace("-", " ")}</option>)}</select></label>
      <label className={wrap}>Width
        <input type="number" min={0} placeholder="auto" value={v.widthPx ?? ""} onChange={(e) => onChange({ widthPx: e.target.value ? Number(e.target.value) : undefined })} className="w-16 rounded-lg border border-slate-300 px-2 py-1.5 text-xs" /></label>
      <label className={`${wrap} justify-start`}>Dismissible
        <input type="checkbox" checked={v.dismissible !== false} onChange={(e) => onChange({ dismissible: e.target.checked })} className="h-4 w-4 accent-[#1e3a8a]" /></label>
    </div>
  );
}

/** Static-banner vs fly-across chooser. */
function ShowAs({ fly, onChange }: { fly?: boolean; onChange: (fly: boolean) => void }) {
  return (
    <div className="inline-flex overflow-hidden rounded-lg border border-slate-200 text-xs">
      <button type="button" onClick={() => onChange(false)} className={`px-3 py-1.5 font-medium transition ${!fly ? "bg-[#1e3a8a] text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}>Banner</button>
      <button type="button" onClick={() => onChange(true)} className={`px-3 py-1.5 font-medium transition ${fly ? "bg-[#1e3a8a] text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}>✈ Fly across</button>
    </div>
  );
}

/** A small From → To date range row (reused by animations, holiday banners, custom occasions). */
function DateRange({ from, to, onFrom, onTo, hint }: { from: string; to: string; onFrom: (v: string) => void; onTo: (v: string) => void; hint?: string }) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
      <span className="font-medium text-slate-500">Show</span>
      <label className="flex items-center gap-1">from <input type="date" value={from} onChange={(e) => onFrom(e.target.value)} className={dateInp} /></label>
      <label className="flex items-center gap-1">to <input type="date" value={to} onChange={(e) => onTo(e.target.value)} className={dateInp} /></label>
      {hint && <span className="text-slate-400">{hint}</span>}
    </div>
  );
}

const sectionBtn = "flex w-full items-center justify-between px-5 py-3.5 text-left";
const PreviewBtn = ({ onClick, label = "Preview" }: { onClick: () => void; label?: string }) => (
  <button type="button" onClick={onClick} className="inline-flex items-center gap-1 rounded-lg bg-[#1e3a8a] px-3 py-1.5 text-xs font-medium text-white transition hover:opacity-90">▶ {label}</button>
);

/**
 * Website → Settings → Occasions. ONE global control bar (top) drives all animations + the
 * fly-across; ONE shared banner appearance (top). Below: Animations (toggle list), Holiday
 * banners (each = on/off + message + show-window + Banner/Fly), and Custom occasions.
 */
export default function OccasionsPanel({ tenantId, websiteId }: { tenantId: string; websiteId?: string }) {
  const year = useMemo(() => new Date().getFullYear(), []);
  const groups = useMemo(() => catalogByCategory(year), [year]);
  const [cfg, setCfg] = useState<OccasionsConfig>({ settings: {}, bannerStyle: {}, animations: {}, banners: {}, custom: [] });
  const [loaded, setLoaded] = useState(false);
  const [open, setOpen] = useState<Record<string, boolean>>({ animations: true });
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [preview, setPreview] = useState<ActiveState | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Ali D-400: occasions are chosen PER WEBSITE. websiteId scopes the read/write to that
    // website's brand row (website_brand_settings).
    getSiteSettings(tenantId, websiteId).then((s) => { setCfg(s.occasions ?? { settings: {}, bannerStyle: {}, animations: {}, banners: {}, custom: [] }); setLoaded(true); }).catch(() => setLoaded(true));
  }, [tenantId, websiteId]);

  const persist = (next: OccasionsConfig) => {
    setCfg(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => { saveSiteSettings(tenantId, { occasions: next }, websiteId).then(() => setSavedAt(Date.now())).catch(() => {}); }, 500);
  };
  const setGlobal = (p: Partial<EffectSettings>) => persist({ ...cfg, settings: { ...(cfg.settings ?? {}), ...p } });
  const setStyle = (p: Partial<BannerSettings>) => persist({ ...cfg, bannerStyle: { ...(cfg.bannerStyle ?? {}), ...p } });

  const setAnim = (k: AnimationKind, patch: Partial<AnimSchedule>) =>
    persist({ ...cfg, animations: { ...(cfg.animations ?? {}), [k]: { ...(cfg.animations?.[k] ?? {}), ...patch } } });
  const toggleAnim = (k: AnimationKind, on: boolean) => setAnim(k, { enabled: on, always: cfg.animations?.[k]?.always ?? true });

  const setBanner = (id: string, patch: any) => persist({ ...cfg, banners: { ...(cfg.banners ?? {}), [id]: { ...(cfg.banners?.[id] ?? {}), ...patch } } });

  const addCustom = () => persist({ ...cfg, custom: [...(cfg.custom ?? []), { id: `c${Date.now()}`, name: "New occasion", startDate: today(), endDate: null, enabled: true, message: "Special offer!" }] });
  const setCustom = (id: string, patch: Partial<CustomBanner>) => persist({ ...cfg, custom: (cfg.custom ?? []).map((c) => c.id === id ? { ...c, ...patch } : c) });
  const delCustom = (id: string) => persist({ ...cfg, custom: (cfg.custom ?? []).filter((c) => c.id !== id) });

  const previewAnim = (animation: AnimationKind) => setPreview({ animation, settings: cfg.settings, banners: [] });
  const previewBanner = (name: string, message: string, fly?: boolean, style?: BannerSettings) => setPreview({ settings: cfg.settings, banners: [{ id: "preview", name, fly, banner: { ...(cfg.bannerStyle ?? {}), ...(style ?? {}), message } }] });

  if (!loaded) return <div className="py-12 text-center text-sm text-slate-400">Loading occasions…</div>;

  const activeAnimCount = ANIMATIONS.filter((a) => cfg.animations?.[a.key]?.enabled).length;
  const activeBannerCount = Object.values(cfg.banners ?? {}).filter((b) => b?.enabled).length + (cfg.custom ?? []).filter((c) => c.enabled).length;

  return (
    <div className="mx-auto max-w-3xl">
      {/* ── HEADER BAND (on-brand) ── */}
      <div className="mb-5 overflow-hidden rounded-2xl bg-gradient-to-br from-[#1e3a8a] to-[#2563eb] p-5 text-white shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Occasions &amp; Celebrations</h2>
            <p className="mt-1 max-w-md text-sm text-white/80">Add festive animations and dated banners to delight visitors — schedule exactly when each appears.</p>
          </div>
          <span className="shrink-0 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-medium">{savedAt ? "Saved ✓" : "Autosaves"}</span>
        </div>
        <div className="mt-4 flex gap-2 text-[11px]">
          <span className="rounded-full bg-white/15 px-2.5 py-1">{activeAnimCount} animation{activeAnimCount === 1 ? "" : "s"} on</span>
          <span className="rounded-full bg-white/15 px-2.5 py-1">{activeBannerCount} banner{activeBannerCount === 1 ? "" : "s"} on</span>
        </div>
      </div>

      {/* ── SHARED CONTROLS ── */}
      <div className={`mb-5 ${card} p-5`}>
        <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Animation &amp; flight controls <span className="font-normal normal-case text-slate-300">— shared by all effects</span></div>
        <AnimControls s={cfg.settings} onChange={setGlobal} />
        <div className="my-4 h-px bg-slate-100" />
        <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Banner appearance <span className="font-normal normal-case text-slate-300">— shared default</span></div>
        <BannerStyle s={cfg.bannerStyle} onChange={setStyle} />
      </div>

      {/* ── ANIMATIONS ── */}
      <section className={`mb-4 ${card}`}>
        <button onClick={() => setOpen((o) => ({ ...o, animations: !o.animations }))} className={sectionBtn}>
          <span className="flex items-center gap-2 text-sm font-semibold text-slate-800">✨ Animations<span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-normal text-slate-500">{activeAnimCount} on</span></span>
          <span className="text-slate-400">{open.animations ? "▾" : "▸"}</span>
        </button>
        {open.animations && (
          <div className="border-t border-slate-100">
            {ANIMATIONS.map((an) => {
              const a = cfg.animations?.[an.key];
              const on = !!a?.enabled;
              return (
                <div key={an.key} className="border-t border-slate-50 px-5 py-3 first:border-t-0">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-medium text-slate-700">{ANIM_GLYPH[an.key]} {an.label}</div>
                    <div className="flex items-center gap-2">
                      {on && <PreviewBtn onClick={() => previewAnim(an.key)} label="" />}
                      <Switch on={on} onChange={(v) => toggleAnim(an.key, v)} />
                    </div>
                  </div>
                  {on && (
                    <div className="mt-2.5 flex flex-wrap items-center gap-2 rounded-xl bg-slate-50 px-3 py-2.5 text-xs text-slate-600">
                      <span className="font-medium text-slate-500">When</span>
                      <select value={a?.always === false ? "range" : "always"} onChange={(e) => setAnim(an.key, e.target.value === "always" ? { always: true } : { always: false, startDate: a?.startDate ?? today(), endDate: a?.endDate ?? today() })} className={dateInp}>
                        <option value="always">Always on</option><option value="range">Specific dates</option>
                      </select>
                      {a?.always === false && (
                        <>
                          <input type="date" value={a?.startDate ?? ""} onChange={(e) => setAnim(an.key, { startDate: e.target.value })} className={dateInp} />
                          <span className="text-slate-400">→</span>
                          <input type="date" value={a?.endDate ?? ""} onChange={(e) => setAnim(an.key, { endDate: e.target.value })} className={dateInp} />
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── HOLIDAY BANNERS ── */}
      <div className="mb-2 px-1 text-sm font-semibold text-slate-800">Holiday banners</div>
      {CATEGORY_ORDER.map((cat) => (
        <section key={cat} className={`mb-3 ${card}`}>
          <button onClick={() => setOpen((o) => ({ ...o, [cat]: !o[cat] }))} className={sectionBtn}>
            <span className="text-sm font-semibold text-slate-800">{CATEGORY_LABELS[cat]}</span>
            <span className="text-slate-400">{open[cat] ? "▾" : "▸"}</span>
          </button>
          {open[cat] && (
            <div className="border-t border-slate-100">
              {groups[cat].map(({ occ, date }) => {
                const b = cfg.banners?.[occ.id];
                const on = !!b?.enabled;
                return (
                  <div key={occ.id} className="border-b border-slate-50 px-5 py-3 last:border-0">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-slate-700">{occ.name}</div>
                        <div className="text-[11px] text-slate-400">
                          {b?.startDate ? `${fmt(new Date(b.startDate + "T00:00:00"))} – ${fmt(new Date((b.endDate || b.startDate) + "T00:00:00"))}` : (occ.variable && b?.date ? fmt(new Date(b.date + "T00:00:00")) : fmt(date))}
                          {occ.variable && !b?.startDate ? " · date varies" : ""}
                        </div>
                      </div>
                      <Switch on={on} onChange={(v) => setBanner(occ.id, { enabled: v, message: b?.message || occ.welcome })} />
                    </div>
                    {on && (
                      <div className="mt-2.5 flex flex-col gap-2.5 rounded-xl bg-slate-50 p-3">
                        <input value={b?.message ?? occ.welcome} onChange={(e) => setBanner(occ.id, { message: e.target.value })} placeholder={occ.welcome} className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm" />
                        {occ.variable && (
                          <label className="flex items-center gap-2 text-xs text-slate-600">Exact date this year
                            <input type="date" value={b?.date ?? ""} onChange={(e) => setBanner(occ.id, { date: e.target.value || null })} className={dateInp} /></label>
                        )}
                        <DateRange from={b?.startDate ?? ""} to={b?.endDate ?? ""}
                          onFrom={(v) => setBanner(occ.id, { startDate: v || null })} onTo={(v) => setBanner(occ.id, { endDate: v || null })}
                          hint="leave blank = default holiday dates" />
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <ShowAs fly={b?.fly} onChange={(fly) => setBanner(occ.id, { fly })} />
                          <PreviewBtn onClick={() => previewBanner(occ.name, b?.message || occ.welcome, b?.fly, b?.style)} />
                        </div>
                        <details className="text-[11px]">
                          <summary className="cursor-pointer font-semibold uppercase tracking-wide text-slate-400">Appearance (overrides shared)</summary>
                          <div className="mt-2"><BannerStyle s={{ ...(cfg.bannerStyle ?? {}), ...(b?.style ?? {}) }} onChange={(p) => setBanner(occ.id, { style: { ...(b?.style ?? {}), ...p } })} /></div>
                        </details>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      ))}

      {/* ── CUSTOM ── */}
      <section className={`mb-3 ${card}`}>
        <div className="flex items-center justify-between px-5 py-3">
          <span className="text-sm font-semibold text-slate-800">Custom occasions</span>
          <button onClick={addCustom} className="rounded-lg border border-[#1e3a8a] px-3 py-1.5 text-xs font-medium text-[#1e3a8a] transition hover:bg-[#1e3a8a]/5">+ Add occasion</button>
        </div>
        <div className="border-t border-slate-100">
          {(cfg.custom ?? []).length === 0 && <p className="px-5 py-6 text-center text-xs text-slate-400">Add a sale, grand opening, or anniversary — a dated banner that shows in your chosen window.</p>}
          {(cfg.custom ?? []).map((c) => (
            <div key={c.id} className="flex flex-col gap-2.5 border-b border-slate-50 px-5 py-3.5 last:border-0">
              <div className="flex items-center gap-2">
                <input value={c.name} onChange={(e) => setCustom(c.id, { name: e.target.value })} className="flex-1 rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm font-medium" />
                <Switch on={c.enabled} onChange={(v) => setCustom(c.id, { enabled: v })} />
                <button onClick={() => delCustom(c.id)} className="rounded-lg p-1.5 text-red-500 hover:bg-red-50" title="Delete">🗑</button>
              </div>
              <input value={c.message ?? ""} onChange={(e) => setCustom(c.id, { message: e.target.value })} placeholder="Banner text" className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm" />
              <DateRange from={c.startDate} to={c.endDate ?? ""} onFrom={(v) => setCustom(c.id, { startDate: v })} onTo={(v) => setCustom(c.id, { endDate: v || null })} />
              <div className="flex flex-wrap items-center justify-between gap-2">
                <ShowAs fly={c.fly} onChange={(fly) => setCustom(c.id, { fly })} />
                <PreviewBtn onClick={() => previewBanner(c.name, c.message || c.name, c.fly, c.style)} />
              </div>
              <details className="text-[11px]">
                <summary className="cursor-pointer font-semibold uppercase tracking-wide text-slate-400">Appearance (overrides shared)</summary>
                <div className="mt-2"><BannerStyle s={{ ...(cfg.bannerStyle ?? {}), ...(c.style ?? {}) }} onChange={(p) => setCustom(c.id, { style: { ...(c.style ?? {}), ...p } })} /></div>
              </details>
            </div>
          ))}
        </div>
      </section>

      {preview && (
        <>
          <SiteOccasions preview={preview} />
          <button onClick={() => setPreview(null)} className="fixed bottom-6 left-1/2 z-[2147483600] -translate-x-1/2 rounded-full bg-slate-900 px-5 py-2.5 text-sm font-medium text-white shadow-lg">■ Stop preview</button>
        </>
      )}
    </div>
  );
}
