"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { saveWidgetAction } from "./actions";
import CopyBox from "../snippet/CopyBox";
import {
  ANIMATIONS, BANNER_POSITIONS, catalogByCategory, CATEGORY_LABELS, CATEGORY_ORDER, DEFAULT_EFFECT_SETTINGS,
  type OccasionsConfig, type AnimationKind, type CustomBanner, type AnimSchedule, type EffectSettings,
} from "@/lib/occasions";

/**
 * Compact, public, key-authenticated Occasions configurator for the lead-gen widget. Lighter than
 * the in-app OccasionsPanel: animations first (snow / fireworks / hearts…), shared effect controls
 * (speed/density/size/randomness), shared banner look, holidays (banner or airplane), and custom
 * sale banners. Autosaves to occasion_widget_sites.occasions.
 */
const NAVY = "#1e3a8a";
const ANIM_GLYPH: Record<string, string> = Object.fromEntries(ANIMATIONS.map((a) => [a.key, a.glyph ?? (a.key === "santa" ? "🎅" : a.key === "fireworks" ? "🎆" : a.key === "sunrays" ? "☀" : "✨")]));
// Animations the vanilla embed renderer supports (emoji particles + fireworks). santa/sunrays = Phase 2.
const V1_ANIMS = new Set(["snow", "fireworks", "hearts", "confetti", "lanterns", "leaves", "butterflies", "petals", "shamrocks", "pumpkins"]);
const today = () => new Date().toISOString().slice(0, 10);
const inp = "rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm focus:border-[#1e3a8a] focus:outline-none focus:ring-1 focus:ring-[#1e3a8a]";

function Switch({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" role="switch" aria-checked={on} onClick={() => onChange(!on)}
      className={`relative h-6 w-11 flex-none rounded-full transition ${on ? "bg-[#1e3a8a]" : "bg-slate-300"}`}>
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? "left-[22px]" : "left-0.5"}`} />
    </button>
  );
}

function Slider({ label, value, min, max, hint, onChange }: { label: string; value: number; min: number; max: number; hint?: string; onChange: (v: number) => void }) {
  return (
    <label className="block">
      <span className="flex items-center justify-between text-xs font-medium text-slate-600">{label}<span className="font-normal text-slate-400">{value}</span></span>
      <input type="range" min={min} max={max} value={value} onChange={(e) => onChange(Number(e.target.value))} className="mt-1.5 w-full accent-[#1e3a8a]" />
      {hint && <span className="text-[11px] text-slate-400">{hint}</span>}
    </label>
  );
}

/** Per-occasion choice: a static Banner vs the fly-across Airplane (the plane tows the banner). */
function FlyChoice({ fly, onChange }: { fly: boolean; onChange: (v: boolean) => void }) {
  const btn = (active: boolean) => `rounded-md px-2.5 py-1 text-xs font-medium transition ${active ? "bg-[#1e3a8a] text-white" : "text-slate-600 hover:bg-slate-100"}`;
  return (
    <div className="flex items-center gap-2 text-xs text-slate-600">
      <span className="font-medium text-slate-500">Show as</span>
      <div className="inline-flex rounded-lg border border-slate-300 p-0.5">
        <button type="button" onClick={() => onChange(false)} className={btn(!fly)}>Banner</button>
        <button type="button" onClick={() => onChange(true)} className={btn(fly)}>✈ Airplane</button>
      </div>
    </div>
  );
}

export default function WidgetOccasionsEditor({ widgetKey, domain, snippet, initial }: { widgetKey: string; domain: string; snippet: string; initial: OccasionsConfig }) {
  const year = useMemo(() => new Date().getFullYear(), []);
  const groups = useMemo(() => catalogByCategory(year), [year]);
  const [cfg, setCfg] = useState<OccasionsConfig>({ settings: {}, bannerStyle: { bg: NAVY, textColor: "#ffffff", position: "top-center", pattern: "solid", dismissible: true }, animations: {}, banners: {}, custom: [], ...initial });
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState(true);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const persist = (next: OccasionsConfig) => {
    setCfg(next); setSaved(false);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => { saveWidgetAction(widgetKey, next).then(() => setSaved(true)).catch(() => {}); }, 600);
  };
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const setStyle = (p: Partial<NonNullable<OccasionsConfig["bannerStyle"]>>) => persist({ ...cfg, bannerStyle: { ...(cfg.bannerStyle ?? {}), ...p } });
  const setSettings = (p: Partial<EffectSettings>) => persist({ ...cfg, settings: { ...(cfg.settings ?? {}), ...p } });
  const fx = { ...DEFAULT_EFFECT_SETTINGS, ...(cfg.settings ?? {}) };
  const setBanner = (id: string, patch: any) => persist({ ...cfg, banners: { ...(cfg.banners ?? {}), [id]: { ...(cfg.banners?.[id] ?? {}), ...patch } } });
  const setAnim = (k: AnimationKind, patch: Partial<AnimSchedule>) => persist({ ...cfg, animations: { ...(cfg.animations ?? {}), [k]: { ...(cfg.animations?.[k] ?? {}), ...patch } } });
  const addCustom = () => persist({ ...cfg, custom: [...(cfg.custom ?? []), { id: `c${Date.now()}`, name: "New occasion", startDate: today(), endDate: null, enabled: true, message: "Special offer!" }] });
  const setCustom = (id: string, patch: Partial<CustomBanner>) => persist({ ...cfg, custom: (cfg.custom ?? []).map((c) => c.id === id ? { ...c, ...patch } : c) });
  const delCustom = (id: string) => persist({ ...cfg, custom: (cfg.custom ?? []).filter((c) => c.id !== id) });

  const card = "rounded-2xl border border-slate-200 bg-white shadow-sm";

  return (
    <main className="min-h-screen bg-slate-50 text-slate-800">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <span className="flex items-center gap-2"><span className="grid h-8 w-8 place-items-center rounded-lg text-white" style={{ background: NAVY }}>🎉</span><span className="text-lg font-semibold" style={{ color: NAVY }}>Occasions <span className="font-normal text-slate-400">for {domain}</span></span></span>
          <span className="text-xs text-slate-400">{saved ? "Saved ✓" : "Saving…"}</span>
        </div>
      </header>

      <div className="mx-auto max-w-3xl space-y-5 px-6 py-8">
        <section className={`${card} p-5`}>
          <div className="text-sm font-semibold text-slate-800">Your snippet</div>
          <p className="mb-3 mt-0.5 text-xs text-slate-500">Paste before <code className="rounded bg-slate-100 px-1 py-0.5">&lt;/head&gt;</code> on {domain}. Changes here go live automatically.</p>
          <CopyBox value={snippet} />
        </section>

        {/* animations — the flying effects, first so they're front and centre */}
        <section className={`${card} p-5`}>
          <div className="text-sm font-semibold text-slate-800">Animations</div>
          <p className="mb-3 mt-0.5 text-xs text-slate-500">Ambient flying effects. Toggle any on — one runs at a time (the first enabled).</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {ANIMATIONS.filter((a) => V1_ANIMS.has(a.key)).map((an) => {
              const a = cfg.animations?.[an.key]; const on = !!a?.enabled;
              return (
                <div key={an.key} className="rounded-xl border border-slate-200 px-3 py-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-700">{ANIM_GLYPH[an.key]} {an.label}</span>
                    <Switch on={on} onChange={(v) => setAnim(an.key, { enabled: v, always: a?.always ?? true })} />
                  </div>
                  {on && (
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-600">
                      <span className="font-medium text-slate-500">When</span>
                      <select value={a?.always === false ? "range" : "always"} onChange={(e) => setAnim(an.key, e.target.value === "always" ? { always: true } : { always: false, startDate: a?.startDate ?? today(), endDate: a?.endDate ?? today() })} className={inp}>
                        <option value="always">Always</option><option value="range">Dates</option>
                      </select>
                      {a?.always === false && <>
                        <input type="date" value={a?.startDate ?? ""} onChange={(e) => setAnim(an.key, { startDate: e.target.value })} className={inp} />
                        <span>→</span>
                        <input type="date" value={a?.endDate ?? ""} onChange={(e) => setAnim(an.key, { endDate: e.target.value })} className={inp} />
                      </>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* animation effects (speed · density · size · randomness) */}
        <section className={`${card} p-5`}>
          <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Animation effects</div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Slider label="Speed" value={fx.speed} min={1} max={12} hint="how fast they move" onChange={(v) => setSettings({ speed: v })} />
            <Slider label="Density" value={fx.density} min={5} max={100} hint="how many on screen" onChange={(v) => setSettings({ density: v })} />
            <Slider label="Size" value={fx.size} min={10} max={48} hint="how big each one is" onChange={(v) => setSettings({ size: v })} />
            <Slider label="Randomness" value={fx.randomness} min={0} max={100} hint="how varied they look" onChange={(v) => setSettings({ randomness: v })} />
          </div>
          <p className="mt-3 text-xs text-slate-400">Applies to the animations above (snow, hearts, confetti, fireworks…) and the airplane speed.</p>
        </section>

        {/* shared banner look */}
        <section className={`${card} p-5`}>
          <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Banner look (shared)</div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
            <label className="flex items-center gap-1.5">Background <input type="color" value={cfg.bannerStyle?.bg ?? NAVY} onChange={(e) => setStyle({ bg: e.target.value })} className="h-7 w-9 cursor-pointer rounded border border-slate-300" /></label>
            <label className="flex items-center gap-1.5">Text <input type="color" value={cfg.bannerStyle?.textColor ?? "#ffffff"} onChange={(e) => setStyle({ textColor: e.target.value })} className="h-7 w-9 cursor-pointer rounded border border-slate-300" /></label>
            <label className="flex items-center gap-1.5">Position
              <select value={cfg.bannerStyle?.position ?? "top-center"} onChange={(e) => setStyle({ position: e.target.value as any })} className={`${inp} capitalize`}>
                {BANNER_POSITIONS.map((p) => <option key={p} value={p}>{p.replace("-", " ")}</option>)}
              </select></label>
            <label className="flex items-center gap-1.5">Style
              <select value={cfg.bannerStyle?.pattern ?? "solid"} onChange={(e) => setStyle({ pattern: e.target.value as any })} className={`${inp} capitalize`}>
                {["solid", "glow", "pulse", "dashed", "neon"].map((p) => <option key={p} value={p}>{p}</option>)}
              </select></label>
            <label className="flex items-center gap-1.5">Width
              <input type="number" min={0} step={10} value={cfg.bannerStyle?.widthPx ?? ""} onChange={(e) => setStyle({ widthPx: e.target.value ? Number(e.target.value) : undefined })} placeholder="auto" className={`${inp} w-20`} />px</label>
          </div>
        </section>

        {/* holidays */}
        <div className="px-1 text-sm font-semibold text-slate-800">Holiday banners</div>
        {CATEGORY_ORDER.map((cat) => (
          <section key={cat} className={card}>
            <button onClick={() => setOpen((o) => ({ ...o, [cat]: !o[cat] }))} className="flex w-full items-center justify-between px-5 py-3.5 text-left">
              <span className="text-sm font-semibold text-slate-800">{CATEGORY_LABELS[cat]}</span>
              <span className="text-slate-400">{open[cat] ? "▾" : "▸"}</span>
            </button>
            {open[cat] && (
              <div className="border-t border-slate-100">
                {groups[cat].map(({ occ }) => {
                  const b = cfg.banners?.[occ.id]; const on = !!b?.enabled;
                  return (
                    <div key={occ.id} className="border-b border-slate-50 px-5 py-3 last:border-0">
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm font-medium text-slate-700">{occ.name}</div>
                        <Switch on={on} onChange={(v) => setBanner(occ.id, { enabled: v, message: b?.message || occ.welcome })} />
                      </div>
                      {on && (
                        <div className="mt-2.5 flex flex-col gap-2 rounded-xl bg-slate-50 p-3">
                          <input value={b?.message ?? occ.welcome} onChange={(e) => setBanner(occ.id, { message: e.target.value })} placeholder={occ.welcome} className={inp} />
                          <FlyChoice fly={!!b?.fly} onChange={(v) => setBanner(occ.id, { fly: v })} />
                          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                            <span className="font-medium text-slate-500">Show</span>
                            <label className="flex items-center gap-1">from <input type="date" value={b?.startDate ?? ""} onChange={(e) => setBanner(occ.id, { startDate: e.target.value || null })} className={inp} /></label>
                            <label className="flex items-center gap-1">to <input type="date" value={b?.endDate ?? ""} onChange={(e) => setBanner(occ.id, { endDate: e.target.value || null })} className={inp} /></label>
                            <span className="text-slate-400">blank = default dates</span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        ))}

        {/* custom */}
        <section className={card}>
          <div className="flex items-center justify-between px-5 py-3">
            <span className="text-sm font-semibold text-slate-800">Custom occasions</span>
            <button onClick={addCustom} className="rounded-lg border px-3 py-1.5 text-xs font-medium" style={{ borderColor: NAVY, color: NAVY }}>+ Add</button>
          </div>
          <div className="border-t border-slate-100">
            {(cfg.custom ?? []).length === 0 && <p className="px-5 py-5 text-center text-xs text-slate-400">Add a sale, grand opening, or anniversary — a dated banner.</p>}
            {(cfg.custom ?? []).map((c) => (
              <div key={c.id} className="flex flex-col gap-2 border-b border-slate-50 px-5 py-3.5 last:border-0">
                <div className="flex items-center gap-2">
                  <input value={c.name} onChange={(e) => setCustom(c.id, { name: e.target.value })} className={`${inp} flex-1 font-medium`} />
                  <Switch on={c.enabled} onChange={(v) => setCustom(c.id, { enabled: v })} />
                  <button onClick={() => delCustom(c.id)} className="rounded p-1.5 text-red-500 hover:bg-red-50">🗑</button>
                </div>
                <input value={c.message ?? ""} onChange={(e) => setCustom(c.id, { message: e.target.value })} placeholder="Banner text" className={inp} />
                <FlyChoice fly={!!c.fly} onChange={(v) => setCustom(c.id, { fly: v })} />
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                  <label className="flex items-center gap-1">From <input type="date" value={c.startDate} onChange={(e) => setCustom(c.id, { startDate: e.target.value })} className={inp} /></label>
                  <label className="flex items-center gap-1">To <input type="date" value={c.endDate ?? ""} onChange={(e) => setCustom(c.id, { endDate: e.target.value || null })} className={inp} /></label>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
