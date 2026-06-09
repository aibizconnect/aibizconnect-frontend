"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import QuickAddPanel from "@/components/website/QuickAddPanel";
import SectionTemplatesPanel from "./SectionTemplatesPanel";
import FontPicker from "@/components/design/FontPicker";
import { FONT_ROLES, mergeBrandRows, type CustomFont, type RoleStyle } from "@/lib/sections/theme";
import ColorField from "@/components/design/ColorField";
import { injectCustomFont } from "@/lib/fonts";
import { saveTypography, resetTextStyles, getSiteSettings, saveSiteSettings, type SiteSettings, getPopups, upsertPopup, removePopup } from "../actions";
import type { SectionType, SectionContent } from "@/lib/sections/schemas";
import type { Popup, PopupContent } from "@/lib/popups";
import { notify, notifyError, confirmDialog } from "@/lib/ui/dialogs";

/**
 * Left-toolbar panels for the revised IA. "Add Elements" consolidates Elements +
 * Rows + Prebuilt + Saved Assets. The remaining panels (Tracking Code, Typography,
 * Background, Popup Settings, Preview Custom Code, Cookie Consent) are scaffolded
 * here — UI present and labelled; persistence is wired per Ali's priority.
 */

const tabBtn = (active: boolean) =>
  `flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition ${active ? "bg-[#1e3a8a] text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`;

/** Add Elements — Elements/Rows (Quick Add) + Prebuilt & Saved Assets (Templates). */
export function AddElementsPanel({
  onPick, tenantId, selectedPageId, websiteId, onApplied, onInsertSections,
}: {
  onPick: (t: SectionType, cols?: number) => void;
  tenantId: string;
  selectedPageId: string | null;
  websiteId?: string | null;
  onApplied: () => void;
  onInsertSections?: (sections: SectionContent[]) => void;
}) {
  // QuickAddPanel owns the Elements & Rows / Prebuilt & Saved toggle now (no duplicate here).
  return (
    <div className="flex h-full flex-col">
      <QuickAddPanel onPick={onPick} onInsertSections={onInsertSections} tenantId={tenantId}
        savedSlot={<SectionTemplatesPanel tenantId={tenantId} selectedPageId={selectedPageId} websiteId={websiteId} onApplied={onApplied} />} />
    </div>
  );
}

/** Shared scaffold shell for the not-yet-wired tools. */
function Scaffold({ title, blurb, children }: { title: string; blurb: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      <div>
        <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
        <p className="mt-1 text-xs leading-relaxed text-slate-500">{blurb}</p>
      </div>
      {children}
      <div className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1.5 text-[11px] text-amber-700">
        UI scaffolded — saving/applying wires up next. Tell me to prioritize this one.
      </div>
    </div>
  );
}

const ta = "w-full rounded border border-slate-300 px-2 py-1.5 font-mono text-[11px]";
const inp = "w-full rounded border border-slate-300 px-2 py-1.5 text-sm";


export function TrackingCodePanel({ tenantId, websiteId }: { tenantId: string; websiteId?: string }) {
  const [s, setS] = useState<SiteSettings>({});
  const [loaded, setLoaded] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { getSiteSettings(tenantId, websiteId).then((v) => { setS(v); setLoaded(true); }).catch(() => setLoaded(true)); }, [tenantId, websiteId]);

  const set = (patch: Partial<SiteSettings>) => {
    const next = { ...s, ...patch }; setS(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => { saveSiteSettings(tenantId, patch, websiteId).then(() => setSavedAt(Date.now())).catch(() => {}); }, 500);
  };

  if (!loaded) return <div className="text-xs text-slate-400">Loading…</div>;
  return (
    <div className="flex flex-col gap-3">
      <div>
        <h3 className="text-sm font-semibold text-slate-800">Site Settings</h3>
        <p className="mt-1 text-xs leading-relaxed text-slate-500">Global defaults for your whole website — basics, SEO/social fallbacks, and tracking.</p>
      </div>

      {/* Site basics + SEO/social defaults */}
      <div className="rounded-lg border border-slate-200 p-2.5">
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Basics &amp; SEO defaults</h4>
        <div className="grid grid-cols-1 gap-2">
          <label className="flex flex-col gap-1"><span className="text-xs font-medium text-slate-600">Site name</span>
            <input className={inp} placeholder="Acme Realty" value={s.siteName ?? ""} onChange={(e) => set({ siteName: e.target.value })} /></label>
          <div className="grid grid-cols-2 gap-2">
            <label className="flex flex-col gap-1"><span className="text-xs font-medium text-slate-600">Language</span>
              <input className={inp} placeholder="en" value={s.language ?? ""} onChange={(e) => set({ language: e.target.value })} /></label>
            <label className="flex flex-col gap-1"><span className="text-xs font-medium text-slate-600">Timezone</span>
              <input className={inp} placeholder="America/Toronto" value={s.timezone ?? ""} onChange={(e) => set({ timezone: e.target.value })} /></label>
          </div>
          <label className="flex flex-col gap-1"><span className="text-xs font-medium text-slate-600">Default social image (OG)</span>
            <input className={inp} placeholder="https://… (fallback share image)" value={s.defaultOgImage ?? ""} onChange={(e) => set({ defaultOgImage: e.target.value })} /></label>
          <label className="flex items-center justify-between gap-2"><span className="text-xs font-medium text-slate-600">Hide from search engines (site‑wide noindex)</span>
            <input type="checkbox" className="h-4 w-4" checked={!!s.robotsNoindex} onChange={(e) => set({ robotsNoindex: e.target.checked })} /></label>
        </div>
      </div>

      <h4 className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Tracking &amp; Integrations</h4>
      <p className="-mt-1.5 text-[11px] text-slate-400">IDs auto‑inject the standard snippet; raw boxes for anything custom.</p>
      <div className="grid grid-cols-1 gap-2">
        <label className="flex flex-col gap-1"><span className="text-xs font-medium text-slate-600">Google Analytics 4 (Measurement ID)</span>
          <input className={inp} placeholder="G-XXXXXXXXXX" value={s.ga4Id ?? ""} onChange={(e) => set({ ga4Id: e.target.value })} /></label>
        <label className="flex flex-col gap-1"><span className="text-xs font-medium text-slate-600">Google Tag Manager (Container ID)</span>
          <input className={inp} placeholder="GTM-XXXXXXX" value={s.gtmId ?? ""} onChange={(e) => set({ gtmId: e.target.value })} /></label>
        <label className="flex flex-col gap-1"><span className="text-xs font-medium text-slate-600">Meta (Facebook) Pixel ID</span>
          <input className={inp} placeholder="123456789012345" value={s.metaPixelId ?? ""} onChange={(e) => set({ metaPixelId: e.target.value })} /></label>
      </div>

      <label className="flex flex-col gap-1"><span className="text-xs font-medium text-slate-600">Custom header scripts <span className="text-slate-400">(in &lt;head&gt;)</span></span>
        <textarea rows={4} className={ta} placeholder="<!-- custom script / verification meta -->" value={s.headScripts ?? ""} onChange={(e) => set({ headScripts: e.target.value })} /></label>
      <label className="flex flex-col gap-1"><span className="text-xs font-medium text-slate-600">Custom footer scripts <span className="text-slate-400">(before &lt;/body&gt;)</span></span>
        <textarea rows={4} className={ta} placeholder="<!-- chat widget / custom pixel -->" value={s.footerScripts ?? ""} onChange={(e) => set({ footerScripts: e.target.value })} /></label>

      <p className="text-[11px] text-slate-400">{savedAt ? "Saved ✓ — applies on your published site." : "Changes save automatically and apply on the published site."}</p>
    </div>
  );
}

/** Typography — assign a font to each text role (Title/Heading/Body…). Sizes &
 * styles are set per element on the right column; roles are the global default.
 * Supports uploading your own fonts (with an ownership confirmation). */
export function TypographyPanel({ tenantId, websiteId, onChanged, onResetAll }: { tenantId: string; websiteId?: string; onChanged?: () => void; onResetAll?: () => void }) {
  const supabase = createClient();
  const [typo, setTypo] = useState<Record<string, RoleStyle>>({});
  const [customFonts, setCustomFonts] = useState<CustomFont[]>([]);
  const [own, setOwn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [openRole, setOpenRole] = useState<Record<string, boolean>>({});
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      // Option A: read THIS website's exact brand row when scoped; else merge tenant rows.
      let data: any;
      if (websiteId) {
        const { data: row } = await supabase.from("website_brand_settings").select("theme").eq("tenant_id", tenantId).eq("website_id", websiteId).maybeSingle();
        data = row ?? mergeBrandRows([]);
      } else {
        const { data: rows } = await supabase.from("website_brand_settings").select("theme").eq("tenant_id", tenantId);
        data = mergeBrandRows(Array.isArray(rows) ? rows : []);
      }
      const raw = (data?.theme as any)?.typography ?? {};
      // Coerce legacy bare-string values to RoleStyle objects.
      const t: Record<string, RoleStyle> = {};
      for (const r of FONT_ROLES) { const v = raw[r.key]; t[r.key] = typeof v === "string" ? { fontFamily: v } : (v && typeof v === "object" ? v : {}); }
      const rawCf = (data?.theme as any)?.customFonts;
      const cf: CustomFont[] = Array.isArray(rawCf) ? rawCf : [];
      setTypo(t); setCustomFonts(cf);
      cf.forEach((f) => injectCustomFont(f.name, f.src));
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId, websiteId]);

  async function persist(nextTypo: Record<string, RoleStyle>, nextCustom: CustomFont[]) {
    // Server action (service client) — browser writes are RLS-blocked.
    try {
      await saveTypography(tenantId, { typography: nextTypo as any, customFonts: nextCustom }, websiteId);
      onChanged?.();
    } catch (e: any) {
      notifyError(e?.message ?? "Failed to save fonts. Please try again.");
    }
  }
  // Merge a partial style into a role; clearing a value (undefined) removes it.
  function setRoleStyle(role: string, patch: Partial<RoleStyle>) {
    const cur = { ...(typo[role] || {}) } as any;
    for (const [k, v] of Object.entries(patch)) { if (v === undefined || v === "" ) delete cur[k]; else cur[k] = v; }
    const next = { ...typo, [role]: cur }; setTypo(next); persist(next, customFonts);
  }

  async function handleReset() {
    if (!(await confirmDialog("Reset every text element on the whole site to these Typography settings? This clears any per-element font/size/style overrides in your page drafts.", { danger: true, confirmText: "Reset" }))) return;
    setResetting(true);
    try { await resetTextStyles(tenantId); onResetAll?.(); }
    catch (e: any) { notifyError(e?.message ?? "Reset failed."); }
    finally { setResetting(false); }
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!own) { notify("Please confirm you own or have the rights to use this font first."); e.target.value = ""; return; }
    if (file.size > 1_500_000) { notify("Font file is too large (max ~1.5 MB). Please upload a .woff2."); e.target.value = ""; return; }
    setBusy(true);
    const reader = new FileReader();
    reader.onload = () => {
      const src = reader.result as string;
      const name = file.name.replace(/\.(woff2?|ttf|otf)$/i, "").replace(/[^a-z0-9 _-]/gi, "").trim() || "Custom Font";
      injectCustomFont(name, src);
      const next = [...customFonts.filter((f) => f.name !== name), { name, src }];
      setCustomFonts(next); persist(typo, next); setBusy(false);
    };
    reader.onerror = () => setBusy(false);
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  const customNames = customFonts.map((f) => f.name);

  const WEIGHTS = ["", "300", "400", "500", "600", "700", "800"];
  const num = "w-12 rounded border border-slate-300 px-1 py-0.5 text-center text-[11px]";
  const toggle = (on: boolean) => `h-6 w-6 rounded border text-[11px] font-semibold ${on ? "border-[#1e3a8a] bg-[#1e3a8a] text-white" : "border-slate-300 bg-white text-slate-500 hover:bg-slate-50"}`;

  return (
    <div className="flex flex-col gap-3">
      <div>
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-semibold text-slate-800">Typography</h3>
          <button type="button" onClick={handleReset} disabled={resetting}
            title="Apply these settings to every text element on the site (clears per-element overrides)"
            className="shrink-0 rounded-md border border-slate-300 px-2 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50">
            {resetting ? "Resetting…" : "↺ Reset all text"}
          </button>
        </div>
        <p className="mt-1 text-xs leading-relaxed text-slate-500">Set the font, size &amp; style for each text role. These apply across the whole site; any element can override them on the right. <b>Reset all text</b> snaps every element back to these settings.</p>
      </div>

      <div className="flex flex-col">
        {FONT_ROLES.map((r, i) => {
          const rs = typo[r.key] || {};
          const isOpen = r.key in openRole ? openRole[r.key] : false; // all roles start collapsed
          return (
            <div key={r.key} className="border-b border-slate-100 last:border-0">
              <button type="button" onClick={() => setOpenRole((o) => ({ ...o, [r.key]: !isOpen }))}
                className="flex w-full items-center justify-between py-2.5 text-left">
                <span className="text-sm font-medium text-slate-700">{r.label}</span>
                <span className="flex items-center gap-2 text-slate-400">
                  {rs.fontFamily && <span className="max-w-[100px] truncate text-[11px]" style={{ fontFamily: `"${rs.fontFamily}", sans-serif` }}>{rs.fontFamily}</span>}
                  <svg viewBox="0 0 24 24" className={`h-3.5 w-3.5 transition-transform ${isOpen ? "rotate-90" : ""}`} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6" /></svg>
                </span>
              </button>
              {isOpen && <div className="pb-3 pt-0.5">
              <div className="mb-1.5">
                <FontPicker value={rs.fontFamily} onChange={(v) => setRoleStyle(r.key, { fontFamily: v })} customFonts={customNames} />
              </div>
              <div className="flex items-center gap-1.5">
                <input className={num} type="number" min={8} max={120} placeholder="size" value={rs.fontSize ?? ""}
                  onChange={(e) => setRoleStyle(r.key, { fontSize: e.target.value ? Number(e.target.value) : undefined })} title="Font size (px)" />
                <span className="text-[10px] text-slate-400">px</span>
                <button type="button" className={toggle((rs.fontWeight ?? "") >= "700")} title="Bold"
                  onClick={() => setRoleStyle(r.key, { fontWeight: (rs.fontWeight ?? "") >= "700" ? undefined : "700" })}>B</button>
                <button type="button" className={`${toggle(!!rs.italic)} italic`} title="Italic"
                  onClick={() => setRoleStyle(r.key, { italic: rs.italic ? undefined : true })}>I</button>
                <select className="ml-auto rounded border border-slate-300 px-1 py-0.5 text-[11px]" value={rs.fontWeight ?? ""}
                  onChange={(e) => setRoleStyle(r.key, { fontWeight: e.target.value || undefined })} title="Weight">
                  {WEIGHTS.map((w) => <option key={w} value={w}>{w || "weight"}</option>)}
                </select>
              </div>
              {/* Color scheme — foreground (text) + background per role. Empty = inherit. */}
              <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-slate-500">
                <ColorField label="Text" value={rs.color} onChange={(v) => setRoleStyle(r.key, { color: v })} />
                <ColorField label="Background" value={rs.backgroundColor} onChange={(v) => setRoleStyle(r.key, { backgroundColor: v })} />
              </div>
              {/* Advanced typographic primitives (persist + render; previously had no UI). */}
              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] text-slate-500">
                <label className="flex items-center gap-1" title="Letter spacing (px)">↔
                  <input type="number" step={0.5} min={-5} max={20} value={rs.letterSpacing ?? ""} placeholder="0"
                    onChange={(e) => setRoleStyle(r.key, { letterSpacing: e.target.value === "" ? undefined : Number(e.target.value) })}
                    className="w-14 rounded border border-slate-300 px-1 py-0.5 text-[11px]" />
                </label>
                <label className="flex items-center gap-1" title="Line height">↕
                  <input type="number" step={0.05} min={0.8} max={3} value={rs.lineHeight ?? ""} placeholder="1.4"
                    onChange={(e) => setRoleStyle(r.key, { lineHeight: e.target.value === "" ? undefined : Number(e.target.value) })}
                    className="w-14 rounded border border-slate-300 px-1 py-0.5 text-[11px]" />
                </label>
                <select value={rs.textTransform ?? ""} title="Text transform"
                  onChange={(e) => setRoleStyle(r.key, { textTransform: (e.target.value || undefined) as RoleStyle["textTransform"] })}
                  className="rounded border border-slate-300 px-1 py-0.5 text-[11px]">
                  <option value="">Aa (none)</option>
                  <option value="uppercase">UPPER</option>
                  <option value="capitalize">Capitalize</option>
                  <option value="lowercase">lower</option>
                </select>
              </div>
              </div>}
            </div>
          );
        })}
      </div>

      <div className="rounded-lg border border-slate-200 p-3">
        <h4 className="text-sm font-semibold text-slate-800">Upload your own font</h4>
        <label className="mt-2 flex items-start gap-2 text-xs text-slate-600">
          <input type="checkbox" checked={own} onChange={(e) => setOwn(e.target.checked)} className="mt-0.5 h-4 w-4" />
          <span>I confirm I own this font or have the rights/license to use it on this website.</span>
        </label>
        <input ref={fileRef} type="file" accept=".woff2,.woff,.ttf,.otf" onChange={onFile} disabled={!own || busy}
          className="mt-2 w-full text-xs file:mr-2 file:rounded file:border-0 file:bg-[#1e3a8a] file:px-2 file:py-1 file:text-white disabled:opacity-50" />
        <p className="mt-1 text-[11px] text-slate-400">.woff2 recommended (max ~1.5 MB).</p>
        {customFonts.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {customFonts.map((f) => (
              <span key={f.name} className="rounded bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600" style={{ fontFamily: `"${f.name}", sans-serif` }}>{f.name}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function BackgroundPanel() {
  return (
    <Scaffold title="Background" blurb="Page background — solid colour, gradient, or image (behind all sections).">
      <label className="flex items-center justify-between gap-2"><span className="text-xs font-medium text-slate-600">Type</span>
        <select className={inp + " max-w-[60%]"}><option>Color</option><option>Gradient</option><option>Image</option></select></label>
      <label className="flex items-center justify-between gap-2"><span className="text-xs font-medium text-slate-600">Color</span>
        <input type="color" defaultValue="#ffffff" className="h-8 w-12 rounded border border-slate-300" /></label>
    </Scaffold>
  );
}

const POPUP_DEFAULT: PopupContent = {
  heading: "Wait — before you go!", body: "Get a free consultation.", ctaLabel: "Get started", ctaHref: "#",
  trigger: "exit", delaySec: 5, width: "md", position: "center", enabled: true,
};

export function PopupSettingsPanel({ tenantId }: { tenantId: string }) {
  const [list, setList] = useState<Popup[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [editing, setEditing] = useState<Popup | null>(null);
  const [busy, setBusy] = useState(false);

  const reload = () => getPopups(tenantId).then((p) => { setList(p); setLoaded(true); }).catch(() => setLoaded(true));
  useEffect(() => { reload(); /* eslint-disable-next-line */ }, [tenantId]);

  async function save() {
    if (!editing) return;
    setBusy(true);
    const r = await upsertPopup(tenantId, editing.name || "Popup", editing.content, editing.id || undefined);
    setBusy(false);
    if (!r.ok) { notifyError(r.error ?? "Could not save popup."); return; }
    setEditing(null); reload();
  }
  async function del(id: string) {
    if (!(await confirmDialog("Delete this popup?", { danger: true, confirmText: "Delete" }))) return;
    await removePopup(tenantId, id); reload();
  }
  async function toggle(p: Popup) {
    await upsertPopup(tenantId, p.name, { ...p.content, enabled: !p.content.enabled }, p.id); reload();
  }

  const setC = (patch: Partial<PopupContent>) => setEditing((e) => e ? { ...e, content: { ...e.content, ...patch } } : e);

  // ── Editor form ──
  if (editing) {
    const c = editing.content;
    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-800">{editing.id ? "Edit popup" : "New popup"}</h3>
          <button onClick={() => setEditing(null)} className="text-xs text-slate-400 hover:text-slate-600">← Back</button>
        </div>
        <label className="flex flex-col gap-1"><span className="text-xs font-medium text-slate-600">Internal name</span>
          <input className={inp} value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder="Exit-intent offer" /></label>
        <label className="flex flex-col gap-1"><span className="text-xs font-medium text-slate-600">Heading</span>
          <input className={inp} value={c.heading} onChange={(e) => setC({ heading: e.target.value })} /></label>
        <label className="flex flex-col gap-1"><span className="text-xs font-medium text-slate-600">Body</span>
          <textarea rows={2} className={inp} value={c.body ?? ""} onChange={(e) => setC({ body: e.target.value })} /></label>
        <div className="grid grid-cols-2 gap-2">
          <label className="flex flex-col gap-1"><span className="text-xs font-medium text-slate-600">Button label</span>
            <input className={inp} value={c.ctaLabel ?? ""} onChange={(e) => setC({ ctaLabel: e.target.value })} /></label>
          <label className="flex flex-col gap-1"><span className="text-xs font-medium text-slate-600">Button link</span>
            <input className={inp} value={c.ctaHref ?? ""} onChange={(e) => setC({ ctaHref: e.target.value })} placeholder="/contact" /></label>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <label className="flex flex-col gap-1"><span className="text-xs font-medium text-slate-600">Trigger</span>
            <select className={inp} value={c.trigger} onChange={(e) => setC({ trigger: e.target.value as PopupContent["trigger"] })}>
              <option value="load">On page load</option><option value="timer">After delay</option><option value="exit">On exit intent</option>
            </select></label>
          {c.trigger === "timer" && (
            <label className="flex flex-col gap-1"><span className="text-xs font-medium text-slate-600">Delay (sec)</span>
              <input type="number" min={0} max={120} className={inp} value={c.delaySec ?? 5} onChange={(e) => setC({ delaySec: Number(e.target.value) })} /></label>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <label className="flex flex-col gap-1"><span className="text-xs font-medium text-slate-600">Width</span>
            <select className={inp} value={c.width} onChange={(e) => setC({ width: e.target.value as PopupContent["width"] })}>
              <option value="sm">Small</option><option value="md">Medium</option><option value="lg">Large</option>
            </select></label>
          <label className="flex flex-col gap-1"><span className="text-xs font-medium text-slate-600">Position</span>
            <select className={inp} value={c.position} onChange={(e) => setC({ position: e.target.value as PopupContent["position"] })}>
              <option value="center">Center</option><option value="bottom-right">Bottom-right</option><option value="bottom-left">Bottom-left</option><option value="top">Top</option>
            </select></label>
        </div>
        <label className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2"><span className="text-xs font-medium text-slate-600">Enabled (shows on the live site)</span>
          <input type="checkbox" className="h-4 w-4" checked={c.enabled} onChange={(e) => setC({ enabled: e.target.checked })} /></label>
        <div className="flex justify-end gap-2 pt-1">
          <button onClick={() => setEditing(null)} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-600">Cancel</button>
          <button onClick={save} disabled={busy} className="rounded-lg bg-[#1e3a8a] px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50">{busy ? "Saving…" : "Save popup"}</button>
        </div>
      </div>
    );
  }

  // ── List ──
  return (
    <div className="flex flex-col gap-3">
      <div>
        <h3 className="text-sm font-semibold text-slate-800">Popup Settings</h3>
        <p className="mt-1 text-xs leading-relaxed text-slate-500">Create popups (exit-intent, timed, on-load) for lead capture, offers, announcements. They show on your published site.</p>
      </div>
      {!loaded ? <div className="text-xs text-slate-400">Loading…</div> : (
        <>
          {list.length === 0 && <p className="rounded-lg border border-dashed border-slate-200 px-3 py-6 text-center text-xs text-slate-400">No popups yet.</p>}
          {list.map((p) => (
            <div key={p.id} className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2">
              <div className="min-w-0">
                <div className="truncate text-sm font-medium text-slate-700">{p.name || "Popup"}</div>
                <div className="text-[11px] text-slate-400">{p.content.trigger === "timer" ? `After ${p.content.delaySec ?? 5}s` : p.content.trigger === "exit" ? "On exit intent" : "On load"} · {p.content.position}</div>
              </div>
              <div className="flex items-center gap-1.5">
                <button onClick={() => toggle(p)} title={p.content.enabled ? "Enabled" : "Disabled"} className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${p.content.enabled ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{p.content.enabled ? "On" : "Off"}</button>
                <button onClick={() => setEditing(p)} className="rounded p-1 text-slate-500 hover:bg-slate-100">✎</button>
                <button onClick={() => del(p.id)} className="rounded p-1 text-red-500 hover:bg-red-50">🗑</button>
              </div>
            </div>
          ))}
          <button onClick={() => setEditing({ id: "", name: "", content: { ...POPUP_DEFAULT } })}
            className="mt-1 rounded-lg border border-[#1e3a8a] px-3 py-2 text-sm font-medium text-[#1e3a8a] hover:bg-[#1e3a8a]/5">+ New popup</button>
        </>
      )}
    </div>
  );
}

export function PreviewCustomCodePanel({ tenantId, selectedPageId }: { tenantId: string; selectedPageId: string | null }) {
  const href = selectedPageId ? `/tenants/${tenantId}/website/preview/${selectedPageId}` : null;
  return (
    <div className="flex flex-col gap-3">
      <div>
        <h3 className="text-sm font-semibold text-slate-800">Preview Custom Code</h3>
        <p className="mt-1 text-xs leading-relaxed text-slate-500">Opens this page in a full preview with your <b>Custom CSS</b> and <b>Tracking &amp; Integrations</b> applied — exactly as the published site, before you publish.</p>
      </div>
      {href ? (
        <a href={href} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#1e3a8a] px-4 py-2 text-sm font-medium text-white hover:bg-[#1e3a8a]/90">
          ↗ Open preview (new tab)
        </a>
      ) : (
        <p className="text-xs text-slate-400">Select a page first.</p>
      )}
      <p className="text-[11px] text-slate-400">Tip: the preview reflects your <b>draft</b> (unpublished) edits.</p>
    </div>
  );
}

export function CookieConsentPanel({ tenantId, websiteId }: { tenantId: string; websiteId?: string }) {
  const [cc, setCc] = useState<NonNullable<SiteSettings["cookieConsent"]>>({});
  const [loaded, setLoaded] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { getSiteSettings(tenantId, websiteId).then((v) => { setCc(v.cookieConsent ?? {}); setLoaded(true); }).catch(() => setLoaded(true)); }, [tenantId, websiteId]);

  const set = (patch: Partial<NonNullable<SiteSettings["cookieConsent"]>>) => {
    const next = { ...cc, ...patch }; setCc(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => { saveSiteSettings(tenantId, { cookieConsent: next }, websiteId).catch(() => {}); }, 500);
  };

  if (!loaded) return <div className="text-xs text-slate-400">Loading…</div>;
  return (
    <div className="flex flex-col gap-3">
      <div>
        <h3 className="text-sm font-semibold text-slate-800">Cookie Consent</h3>
        <p className="mt-1 text-xs leading-relaxed text-slate-500">GDPR/PIPEDA banner shown on your published site until the visitor chooses. Gate non‑essential scripts on the stored consent.</p>
      </div>
      <label className="flex items-center justify-between gap-2"><span className="text-xs font-medium text-slate-600">Enable banner</span>
        <input type="checkbox" className="h-4 w-4" checked={!!cc.enabled} onChange={(e) => set({ enabled: e.target.checked })} /></label>
      <label className="flex flex-col gap-1"><span className="text-xs font-medium text-slate-600">Banner text</span>
        <textarea rows={3} className={inp} value={cc.message ?? ""} onChange={(e) => set({ message: e.target.value })} placeholder="We use cookies to improve your experience…" /></label>
      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-1"><span className="text-xs font-medium text-slate-600">Accept label</span>
          <input className={inp} value={cc.acceptLabel ?? ""} onChange={(e) => set({ acceptLabel: e.target.value })} placeholder="Accept" /></label>
        <label className="flex flex-col gap-1"><span className="text-xs font-medium text-slate-600">Decline label</span>
          <input className={inp} value={cc.declineLabel ?? ""} onChange={(e) => set({ declineLabel: e.target.value })} placeholder="Decline" /></label>
      </div>
      <label className="flex flex-col gap-1"><span className="text-xs font-medium text-slate-600">Privacy policy URL</span>
        <input className={inp} value={cc.policyUrl ?? ""} onChange={(e) => set({ policyUrl: e.target.value })} placeholder="https://…/privacy" /></label>
      <label className="flex flex-col gap-1"><span className="text-xs font-medium text-slate-600">Position</span>
        <select className={inp} value={cc.position ?? "bottom"} onChange={(e) => set({ position: e.target.value as any })}>
          <option value="bottom">Bottom (wide)</option>
          <option value="bottom-left">Bottom left</option>
          <option value="bottom-right">Bottom right</option>
        </select></label>
      <p className="text-[11px] text-slate-400">Saves automatically. Shows on the published site.</p>
    </div>
  );
}
