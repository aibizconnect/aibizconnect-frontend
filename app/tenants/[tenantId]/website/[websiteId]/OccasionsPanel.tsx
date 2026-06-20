"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { getSiteSettings, saveSiteSettings } from "../actions";
import SiteOccasions from "@/components/site/SiteOccasions";
import {
  ANIMATIONS, catalogByCategory, CATEGORY_LABELS, CATEGORY_ORDER, DEFAULT_EFFECT_SETTINGS, BANNER_POSITIONS,
  type OccasionsConfig, type AnimationKind, type EffectSettings, type BannerSettings, type ActiveState,
  type CustomBanner, type AnimSchedule, type OccasionCategory,
} from "@/lib/occasions";

// 🔒 LOCKED (Ali, 2026-06-05) — Occasions UI is frozen; do NOT change layout/controls
// without Ali's explicit say-so to re-open. See src/docs/occasions-LOCKED.md.
const PATTERNS: BannerSettings["pattern"][] = ["solid", "glow", "pulse", "dashed", "neon"];
const ANIM_GLYPH: Record<string, string> = Object.fromEntries(ANIMATIONS.map((a) => [a.key, a.glyph ?? (a.key === "santa" ? "🎅" : a.key === "sunrays" ? "☀" : a.key === "fireworks" ? "🎆" : "✨")]));
const fmt = (dt: Date) => dt.toLocaleDateString(undefined, { month: "short", day: "numeric" });
const today = () => new Date().toISOString().slice(0, 10);

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
    <label className="flex items-center gap-2 text-[11px] text-slate-600">
      <span className="w-20">{label}</span>
      <input type="range" min={min} max={max} value={(v as any)[k]} onChange={(e) => onChange({ [k]: Number(e.target.value) } as any)} className="h-1 flex-1 accent-[#1e3a8a]" />
      <span className="w-7 text-right text-slate-400">{(v as any)[k]}</span>
    </label>
  );
  return (
    <div className="grid grid-cols-1 gap-2 rounded-lg border border-slate-200 bg-white p-3 sm:grid-cols-2">
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
  return (
    <div className="grid grid-cols-2 gap-2 rounded-lg border border-slate-200 bg-white p-3 text-[11px] text-slate-600 sm:grid-cols-3">
      <label className="flex items-center gap-1">Background
        <input type="color" value={v.bg ?? "#1e3a8a"} onChange={(e) => onChange({ bg: e.target.value })} className="h-6 w-8 cursor-pointer rounded border border-slate-300" /></label>
      <label className="flex items-center gap-1">Text
        <input type="color" value={v.textColor ?? "#ffffff"} onChange={(e) => onChange({ textColor: e.target.value })} className="h-6 w-8 cursor-pointer rounded border border-slate-300" /></label>
      <label className="flex items-center gap-1">Pattern
        <select value={v.pattern ?? "solid"} onChange={(e) => onChange({ pattern: e.target.value as any })} className="flex-1 rounded border border-slate-300 px-1.5 py-1 capitalize">
          {PATTERNS.map((p) => <option key={p} value={p}>{p}</option>)}</select></label>
      <label className="flex items-center gap-1">Position
        <select value={v.position ?? "top-center"} onChange={(e) => onChange({ position: e.target.value as any })} className="flex-1 rounded border border-slate-300 px-1.5 py-1">
          {BANNER_POSITIONS.map((p) => <option key={p} value={p}>{p.replace("-", " ")}</option>)}</select></label>
      <label className="flex items-center gap-1">Width(px)
        <input type="number" min={0} placeholder="auto" value={v.widthPx ?? ""} onChange={(e) => onChange({ widthPx: e.target.value ? Number(e.target.value) : undefined })} className="w-16 rounded border border-slate-300 px-1.5 py-1" /></label>
      <label className="flex items-center gap-2">Dismissible
        <input type="checkbox" checked={v.dismissible !== false} onChange={(e) => onChange({ dismissible: e.target.checked })} /></label>
    </div>
  );
}

/** Static-banner vs fly-across chooser. */
function ShowAs({ fly, onChange }: { fly?: boolean; onChange: (fly: boolean) => void }) {
  return (
    <div className="flex overflow-hidden rounded-lg border border-slate-200 text-[11px]">
      <button type="button" onClick={() => onChange(false)} className={`px-3 py-1 ${!fly ? "bg-[#1e3a8a] text-white" : "bg-white text-slate-600"}`}>Banner</button>
      <button type="button" onClick={() => onChange(true)} className={`px-3 py-1 ${fly ? "bg-[#1e3a8a] text-white" : "bg-white text-slate-600"}`}>🛩️ Fly across</button>
    </div>
  );
}

/**
 * Website → Settings → Occasions. ONE global control bar (top) drives all animations + the
 * fly-across; ONE shared banner appearance (top). Below: Animations (toggle list), Holiday
 * banners (each = on/off + message + Banner/Fly), and Custom occasions.
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
    // website's brand row (website_brand_settings). UI/controls unchanged (Occasions lock holds).
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

  if (!loaded) return <div className="py-10 text-center text-sm text-slate-400">Loading occasions…</div>;

  return (
    <div className="max-w-3xl">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">Occasions</h2>
        <span className="text-xs text-slate-400">{savedAt ? "Saved ✓" : "Autosaves"}</span>
      </div>

      {/* ── SHARED CONTROLS (top) ── */}
      <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Animation & flight controls (shared)</div>
      <div className="mb-3"><AnimControls s={cfg.settings} onChange={setGlobal} /></div>
      <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Banner appearance (shared)</div>
      <div className="mb-5"><BannerStyle s={cfg.bannerStyle} onChange={setStyle} /></div>

      {/* ── ANIMATIONS (toggle list) ── */}
      <section className="mb-4 rounded-xl border border-slate-200 bg-white">
        <button onClick={() => setOpen((o) => ({ ...o, animations: !o.animations }))} className="flex w-full items-center justify-between px-4 py-3 text-left">
          <span className="text-sm font-semibold text-slate-800">Animations</span>
          <span className="text-slate-400">{open.animations ? "▾" : "▸"}</span>
        </button>
        {open.animations && (
          <div className="border-t border-slate-100">
            {ANIMATIONS.map((an) => {
              const a = cfg.animations?.[an.key];
              const on = !!a?.enabled;
              return (
                <div key={an.key} className="border-t border-slate-50 px-4 py-2.5 first:border-t-0">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-medium text-slate-700">{ANIM_GLYPH[an.key]} {an.label}</div>
                    <div className="flex items-center gap-2">
                      {on && <button type="button" onClick={() => previewAnim(an.key)} className="rounded-lg bg-[#1e3a8a] px-2.5 py-1 text-[11px] font-medium text-white">▶</button>}
                      <Switch on={on} onChange={(v) => toggleAnim(an.key, v)} />
                    </div>
                  </div>
                  {on && (
                    <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg bg-slate-50 p-2.5 text-xs text-slate-600">
                      <span>When:</span>
                      <select value={a?.always === false ? "range" : "always"} onChange={(e) => setAnim(an.key, e.target.value === "always" ? { always: true } : { always: false, startDate: a?.startDate ?? today(), endDate: a?.endDate ?? today() })}
                        className="rounded border border-slate-300 px-2 py-1 text-xs">
                        <option value="always">Always</option><option value="range">Date range</option>
                      </select>
                      {a?.always === false && (
                        <>
                          <input type="date" value={a?.startDate ?? ""} onChange={(e) => setAnim(an.key, { startDate: e.target.value })} className="rounded border border-slate-300 px-2 py-1 text-xs" />
                          <span>→</span>
                          <input type="date" value={a?.endDate ?? ""} onChange={(e) => setAnim(an.key, { endDate: e.target.value })} className="rounded border border-slate-300 px-2 py-1 text-xs" />
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
      <div className="mb-1.5 text-sm font-semibold text-slate-800">Holiday banners</div>
      {CATEGORY_ORDER.map((cat) => (
        <section key={cat} className="mb-3 rounded-xl border border-slate-200 bg-white">
          <button onClick={() => setOpen((o) => ({ ...o, [cat]: !o[cat] }))} className="flex w-full items-center justify-between px-4 py-3 text-left">
            <span className="text-sm font-semibold text-slate-800">{CATEGORY_LABELS[cat]}</span>
            <span className="text-slate-400">{open[cat] ? "▾" : "▸"}</span>
          </button>
          {open[cat] && (
            <div className="border-t border-slate-100">
              {groups[cat].map(({ occ, date }) => {
                const b = cfg.banners?.[occ.id];
                const on = !!b?.enabled;
                return (
                  <div key={occ.id} className="border-b border-slate-50 px-4 py-2.5 last:border-0">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-slate-700">{occ.name}</div>
                        <div className="text-[11px] text-slate-400">{occ.variable && b?.date ? fmt(new Date(b.date + "T00:00:00")) : fmt(date)}{occ.variable ? " · date varies" : ""}</div>
                      </div>
                      <Switch on={on} onChange={(v) => setBanner(occ.id, { enabled: v, message: b?.message || occ.welcome })} />
                    </div>
                    {on && (
                      <div className="mt-2 flex flex-col gap-2 rounded-lg bg-slate-50 p-2.5">
                        <input value={b?.message ?? occ.welcome} onChange={(e) => setBanner(occ.id, { message: e.target.value })} placeholder={occ.welcome} className="rounded border border-slate-300 px-2 py-1 text-sm" />
                        {occ.variable && (
                          <label className="flex items-center gap-2 text-xs text-slate-600">Exact date this year:
                            <input type="date" value={b?.date ?? ""} onChange={(e) => setBanner(occ.id, { date: e.target.value || null })} className="rounded border border-slate-300 px-2 py-1 text-xs" /></label>
                        )}
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <ShowAs fly={b?.fly} onChange={(fly) => setBanner(occ.id, { fly })} />
                          <button type="button" onClick={() => previewBanner(occ.name, b?.message || occ.welcome, b?.fly, b?.style)} className="rounded-lg bg-[#1e3a8a] px-3 py-1 text-xs font-medium text-white">▶ Preview</button>
                        </div>
                        <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Appearance (overrides shared)</div>
                        <BannerStyle s={{ ...(cfg.bannerStyle ?? {}), ...(b?.style ?? {}) }} onChange={(p) => setBanner(occ.id, { style: { ...(b?.style ?? {}), ...p } })} />
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
      <section className="mb-3 rounded-xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between px-4 py-2.5">
          <span className="text-sm font-semibold text-slate-800">Custom Occasions</span>
          <button onClick={addCustom} className="rounded-lg border border-[#1e3a8a] px-2.5 py-1 text-xs font-medium text-[#1e3a8a] hover:bg-[#1e3a8a]/5">+ Add occasion</button>
        </div>
        <div className="border-t border-slate-100">
          {(cfg.custom ?? []).length === 0 && <p className="px-4 py-4 text-center text-xs text-slate-400">Add sales, grand openings, anniversaries… a dated banner.</p>}
          {(cfg.custom ?? []).map((c) => (
            <div key={c.id} className="flex flex-col gap-2 border-b border-slate-50 px-4 py-3 last:border-0">
              <div className="flex items-center justify-between gap-2">
                <input value={c.name} onChange={(e) => setCustom(c.id, { name: e.target.value })} className="flex-1 rounded border border-slate-300 px-2 py-1 text-sm font-medium" />
                <Switch on={c.enabled} onChange={(v) => setCustom(c.id, { enabled: v })} />
                <button onClick={() => delCustom(c.id)} className="rounded p-1 text-red-500 hover:bg-red-50">🗑</button>
              </div>
              <input value={c.message ?? ""} onChange={(e) => setCustom(c.id, { message: e.target.value })} placeholder="Banner text" className="rounded border border-slate-300 px-2 py-1 text-sm" />
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                <label className="flex items-center gap-1">From <input type="date" value={c.startDate} onChange={(e) => setCustom(c.id, { startDate: e.target.value })} className="rounded border border-slate-300 px-2 py-1 text-xs" /></label>
                <label className="flex items-center gap-1">To <input type="date" value={c.endDate ?? ""} onChange={(e) => setCustom(c.id, { endDate: e.target.value || null })} className="rounded border border-slate-300 px-2 py-1 text-xs" /></label>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <ShowAs fly={c.fly} onChange={(fly) => setCustom(c.id, { fly })} />
                <button type="button" onClick={() => previewBanner(c.name, c.message || c.name, c.fly, c.style)} className="rounded-lg bg-[#1e3a8a] px-3 py-1 text-xs font-medium text-white">▶ Preview</button>
              </div>
              <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Appearance (overrides shared)</div>
              <BannerStyle s={{ ...(cfg.bannerStyle ?? {}), ...(c.style ?? {}) }} onChange={(p) => setCustom(c.id, { style: { ...(c.style ?? {}), ...p } })} />
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
