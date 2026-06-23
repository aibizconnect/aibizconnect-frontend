"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  OCCASION_CATALOG, ANIM_BY_KEY, resolveActive, DEFAULT_EFFECT_SETTINGS,
  type OccasionsConfig, type AnimationKind, type BannerPosition, type CustomBanner, type EffectSettings,
} from "@/lib/occasions";
import { REGION_CHIPS, regionOf, REGION_META, type WidgetRegion } from "@/lib/occasions-regions";
import {
  addSiteAction, removeSiteAction, setActiveAction, setBadgeAction, saveOccasionsAction, listSitesAction,
} from "./actions";

/**
 * Occasions account dashboard (D-406) — the branded multi-domain control panel surfaced inside GHL.
 * Translated from the Claude Design "Occasions Control Panel" system to production React, wired to
 * the LOCKED occasions engine (read-only) + the account-scoped server actions. Free vs paid tiers,
 * region-categorized picker (Global / Canada / United States / My custom), appearance, install, help.
 */

type WidgetPlan = "free" | "paid";
interface WidgetAccount { ghlLocationId: string; accountName?: string | null; plan: WidgetPlan }
interface AccountSite { key: string; domain: string; active: boolean; badge: boolean; plan: WidgetPlan; occasions: OccasionsConfig }

const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const fmt = (dt: Date) => `${MON[dt.getMonth()]} ${dt.getDate()}`;
function nextDate(occId: string): string {
  const occ = OCCASION_CATALOG.find((o) => o.id === occId);
  if (!occ) return "";
  const now = new Date();
  const todayMid = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let s = occ.window(now.getFullYear()).start;
  if (s < todayMid) s = occ.window(now.getFullYear() + 1).start;
  return fmt(s);
}
const POS: Record<string, Record<string, BannerPosition>> = {
  top: { left: "top-left", center: "top-center", right: "top-right" },
  middle: { left: "middle-left", center: "center", right: "middle-right" },
  bottom: { left: "bottom-left", center: "bottom-center", right: "bottom-right" },
};
function posToVH(p?: BannerPosition): { v: string; h: string } {
  for (const v of ["top", "middle", "bottom"]) for (const h of ["left", "center", "right"]) if (POS[v][h] === p) return { v, h };
  return { v: "top", h: "center" };
}
const SWATCHES = ["#3D49C4", "#090966", "#1F9D6B", "#E0A115", "#DC4040", "#7C3AED", "#0E7490", "#111827"];
const ANIM_CHIPS: [AnimationKind | "none", string][] = [
  ["snow", "Snow"], ["hearts", "Hearts"], ["confetti", "Confetti"], ["santa", "Santa"],
  ["fireworks", "Fireworks"], ["lanterns", "Lanterns"], ["leaves", "Leaves"], ["none", "None"],
];
const FAQ = [
  { id: "when", q: "When do banners appear?", a: "Each occasion turns its banner on automatically in the days around its date, then hides itself again — no manual scheduling. You stay in control with the on/off toggle per occasion." },
  { id: "why", q: "Why isn't my banner showing?", a: "Check that the occasion is toggled on, the snippet is installed on the live page, and today falls inside the occasion's window. Paused sites never show banners." },
  { id: "sale", q: "Can I add my own sale or event?", a: "Yes — create a custom occasion with your own name, dates, message and link. It appears under “My custom” alongside the built-in holidays." },
  { id: "sites", q: "How many sites can I add?", a: "Free includes 1 site. A paid plan unlocks unlimited sites plus “Apply to all my sites” and removes the AIBizConnect badge." },
];
const TARGETS = [
  { id: "wp", label: "WordPress", info: "Appearance → Theme File Editor → header.php, or use a header-scripts plugin. Paste just before </head>." },
  { id: "shopify", label: "Shopify", info: "Online Store → Themes → Edit code → theme.liquid. Paste just before </head>." },
  { id: "wix", label: "Wix / Squarespace", info: "Settings → Custom Code → add the snippet to the <head> on all pages." },
  { id: "html", label: "Custom HTML", info: "Paste the snippet before the closing </head> tag of every page." },
];

function Switch({ on, disabled, onChange }: { on: boolean; disabled?: boolean; onChange?: (v: boolean) => void }) {
  return (
    <button type="button" role="switch" aria-checked={on} disabled={disabled} onClick={() => !disabled && onChange?.(!on)}
      style={{ position: "relative", width: 40, height: 22, flex: "none", borderRadius: 999, border: "none", cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.55 : 1, background: on ? "var(--c-primary)" : "var(--gray-200)", transition: "background .15s" }}>
      <span style={{ position: "absolute", top: 2, left: on ? 20 : 2, width: 18, height: 18, borderRadius: "50%", background: "#fff", boxShadow: "0 1px 2px rgba(9,9,40,.25)", transition: "left .15s" }} />
    </button>
  );
}

const ICON: Record<string, React.ReactNode> = {
  plus: <path d="M5 12h14M12 5v14" />,
  trash: <><path d="M3 6h18" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /></>,
  info: <><circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" /></>,
  chevron: <path d="m6 9 6 6 6-6" />,
  check: <path d="M20 6 9 17l-5-5" />,
  plane: <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" />,
};
function Ico({ name, size = 16, color = "currentColor" }: { name: string; size?: number; color?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">{ICON[name]}</svg>;
}

export default function OccasionsDashboard({ token, account, initialSites, appBase }: { token: string; account: WidgetAccount; initialSites: AccountSite[]; appBase: string }) {
  const isPaid = account.plan === "paid";
  const year = useMemo(() => new Date().getFullYear(), []);
  const [sites, setSites] = useState<AccountSite[]>(initialSites);
  const [screen, setScreen] = useState<"sites" | "occasions" | "appearance" | "install" | "help">("sites");
  const [selectedKey, setSelectedKey] = useState<string | null>(initialSites[0]?.key ?? null);
  const [regions, setRegions] = useState<(WidgetRegion | "all")[]>(["all"]);
  const [modal, setModal] = useState<null | "add-site" | "custom" | "install" | "preview" | "upgrade" | "remove">(null);
  const [modalKey, setModalKey] = useState<string | null>(null);
  const [addDomain, setAddDomain] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [copied, setCopied] = useState(false);
  const [openInfo, setOpenInfo] = useState<string | null>(null);
  const [faqOpen, setFaqOpen] = useState<string | null>("when");
  const [custom, setCustom] = useState({ name: "", start: "", end: "", message: "", link: "", newTab: true });
  const [gMove, setGMove] = useState<"banner" | "airplane">("banner");
  const [gStart, setGStart] = useState("");
  const [gEnd, setGEnd] = useState("");
  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const sel = sites.find((s) => s.key === selectedKey) || sites[0] || null;

  // Derive the shared movement + show-window from the selected site's enabled occasions, so the
  // Appearance controls reflect what's set. Re-runs only when the site changes (not on every edit).
  useEffect(() => {
    if (!sel) return;
    const c = sel.occasions || {};
    const ids = OCCASION_CATALOG.filter((o) => c.banners?.[o.id]?.enabled).map((o) => o.id);
    const fe = ids.length ? c.banners![ids[0]] : (c.custom ?? []).find((x) => x.enabled);
    setGMove(fe?.fly ? "airplane" : "banner");
    setGStart(fe?.startDate || "");
    setGEnd(fe?.endDate || "");
  }, [sel?.key]);

  // ── persistence ────────────────────────────────────────────────────────────
  function scheduleSave(key: string, cfg: OccasionsConfig) {
    clearTimeout(saveTimers.current[key]);
    saveTimers.current[key] = setTimeout(() => { saveOccasionsAction(token, key, cfg).catch(() => {}); }, 600);
  }
  function patchOcc(key: string, updater: (c: OccasionsConfig) => OccasionsConfig) {
    setSites((prev) => prev.map((s) => {
      if (s.key !== key) return s;
      const next = updater(s.occasions || {});
      scheduleSave(key, next);
      return { ...s, occasions: next };
    }));
  }
  async function refresh(selectKey?: string) {
    const fresh = await listSitesAction(token).catch(() => null);
    if (fresh) { setSites(fresh as AccountSite[]); if (selectKey) setSelectedKey(selectKey); }
  }

  // ── site ops ──────────────────────────────────────────────────────────────
  async function doAddSite() {
    setBusy(true); setErr("");
    const r = await addSiteAction(token, addDomain).catch(() => ({ ok: false, key: undefined as string | undefined, error: "Something went wrong." }));
    setBusy(false);
    if (!r.ok) { setErr(r.error || "Couldn't add that site."); return; }
    setAddDomain(""); setModal(null);
    await refresh(r.key);
  }
  async function doRemove() {
    if (!modalKey) return;
    setBusy(true);
    await removeSiteAction(token, modalKey).catch(() => {});
    setBusy(false); setModal(null); setModalKey(null);
    await refresh();
  }
  async function toggleActive(key: string, active: boolean) {
    setSites((prev) => prev.map((s) => (s.key === key ? { ...s, active } : s)));
    setActiveAction(token, key, active).catch(() => {});
  }
  function toggleBadge(on: boolean) {
    if (!sel) return;
    setSites((prev) => prev.map((s) => (s.key === sel.key ? { ...s, badge: on } : s)));
    setBadgeAction(token, sel.key, on).catch(() => {});
  }
  function addCustomOccasion() {
    if (!sel || !custom.name.trim()) { setModal(null); return; }
    const c: CustomBanner = {
      id: `c${Date.now()}`, name: custom.name.trim(), startDate: custom.start || new Date().toISOString().slice(0, 10),
      endDate: custom.end || null, enabled: true, message: custom.message || custom.name.trim(), fly: gMove === "airplane",
      linkUrl: custom.link || undefined, linkTarget: custom.newTab ? "_blank" : "_self",
    };
    patchOcc(sel.key, (cfg) => ({ ...cfg, custom: [...(cfg.custom ?? []), c] }));
    setCustom({ name: "", start: "", end: "", message: "", link: "", newTab: true });
    setModal(null);
  }

  // ── occasions / appearance editing (on the selected site) ───────────────────
  const cfg = sel?.occasions ?? {};
  const fx = { ...DEFAULT_EFFECT_SETTINGS, ...(cfg.settings ?? {}) };
  // Enabling a holiday inherits the shared movement + show-window set in Appearance.
  const setBanner = (id: string, enabled: boolean) => sel && patchOcc(sel.key, (c) => {
    const occ = OCCASION_CATALOG.find((o) => o.id === id);
    const prev = c.banners?.[id] ?? {};
    const next = enabled
      ? { ...prev, enabled: true, message: prev.message || occ?.welcome, fly: gMove === "airplane", startDate: gStart || null, endDate: gEnd || null }
      : { ...prev, enabled: false };
    return { ...c, banners: { ...(c.banners ?? {}), [id]: next } };
  });
  const setCustomEnabled = (id: string, enabled: boolean) => sel && patchOcc(sel.key, (c) => ({ ...c, custom: (c.custom ?? []).map((x) => (x.id === id ? { ...x, enabled } : x)) }));
  const setStyle = (p: Partial<NonNullable<OccasionsConfig["bannerStyle"]>>) => sel && patchOcc(sel.key, (c) => ({ ...c, bannerStyle: { ...(c.bannerStyle ?? {}), ...p } }));
  const setSettings = (p: Partial<EffectSettings>) => sel && patchOcc(sel.key, (c) => ({ ...c, settings: { ...(c.settings ?? {}), ...p } }));
  const applyMovement = (airplane: boolean) => sel && patchOcc(sel.key, (c) => ({
    ...c,
    banners: Object.fromEntries(Object.entries(c.banners ?? {}).map(([id, e]) => [id, e && e.enabled ? { ...e, fly: airplane } : e])),
    custom: (c.custom ?? []).map((x) => (x.enabled ? { ...x, fly: airplane } : x)),
  }));
  const applyWindow = (start: string, end: string) => sel && patchOcc(sel.key, (c) => ({
    ...c,
    banners: Object.fromEntries(Object.entries(c.banners ?? {}).map(([id, e]) => [id, e && e.enabled ? { ...e, startDate: start || null, endDate: end || null } : e])),
  }));
  const changeMovement = (airplane: boolean) => { setGMove(airplane ? "airplane" : "banner"); applyMovement(airplane); };
  const changeWindow = (start: string, end: string) => { setGStart(start); setGEnd(end); applyWindow(start, end); };
  const setAnim = (k: AnimationKind | "none") => sel && patchOcc(sel.key, (c) => ({ ...c, animations: (k === "none" ? {} : { [k]: { enabled: true, always: true } }) as OccasionsConfig["animations"] }));
  const curAnim: AnimationKind | "none" = (Object.entries(cfg.animations ?? {}).find(([, v]) => v?.enabled)?.[0] as AnimationKind) || "none";

  const visOcc = OCCASION_CATALOG.filter((o) => regions.includes("all") || regions.includes(regionOf(o.id)));
  const showCustom = regions.includes("all") || regions.includes("custom");
  const occCount = visOcc.length + (showCustom ? (cfg.custom ?? []).length : 0);
  function toggleRegion(k: WidgetRegion | "all") {
    if (k === "all") { setRegions(["all"]); return; }
    setRegions((prev) => {
      let r = prev.filter((x) => x !== "all") as WidgetRegion[];
      r = r.includes(k) ? r.filter((x) => x !== k) : [...r, k];
      return r.length ? r : ["all"];
    });
  }

  const ap = cfg.bannerStyle ?? {};
  const bannerColor = ap.bg || "#3D49C4";
  const vh = posToVH(ap.position);
  const vertical = vh.v === "middle" && vh.h !== "center"; // middle-left / middle-right render rotated 90°
  const snippet = sel ? `<script src="${appBase}/api/occasions-widget/embed?k=${sel.key}" async></script>` : "";
  function copySnippet() { if (!snippet) return; navigator.clipboard?.writeText(snippet); setCopied(true); setTimeout(() => setCopied(false), 1600); }

  // ── style tokens ────────────────────────────────────────────────────────────
  const TOKENS = `
    .occ-ds{--c-primary:#3D49C4;--c-primary-hover:#2F399D;--grad-brand:linear-gradient(135deg,#2F399D,#555FC4);
      --navy:#090966;--blue-50:#EEF0FB;--surface-page:#F8F9FC;--surface-card:#FFFFFF;
      --gray-50:#F5F6FA;--gray-100:#EDEFF5;--gray-200:#E2E5EE;--gray-400:#A9AEC0;
      --text-strong:#12123A;--text-body:#3A3D55;--text-muted:#75788C;
      --border-subtle:#ECEEF4;--border-default:#DCDFEA;--border-brand:#C3C8F0;
      --green:#1F9D6B;--green-100:#E2F3EC;--amber-100:#FBF0D6;--amber-800:#7a5800;--red:#DC4040;--red-100:#FBE6E6;
      --radius-md:10px;--radius-lg:14px;--radius-xl:20px;
      --shadow-sm:0 1px 2px rgba(18,22,74,.06),0 1px 3px rgba(18,22,74,.05);--shadow-md:0 6px 18px rgba(18,22,74,.12);--shadow-xl:0 24px 60px rgba(9,9,40,.28);
      --font-display:'MontserratAlt1','Montserrat',system-ui,sans-serif;
      min-height:100vh;background:var(--surface-page);color:var(--text-body);
      font-family:'Montserrat',system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;}
    @font-face{font-family:'MontserratAlt1';src:url('/fonts/MontserratAlt1-SemiBold.woff2') format('woff2');font-weight:600;font-display:swap;}
    .occ-ds *{box-sizing:border-box}
    .occ-disp{font-family:var(--font-display);font-weight:600;letter-spacing:-.02em;color:var(--text-strong)}
    .occ-tab{display:inline-flex;align-items:center;gap:7px;flex:none;height:34px;padding:0 13px;border:none;border-radius:var(--radius-md);cursor:pointer;font:inherit;font-size:13px;font-weight:600;transition:all .15s}
    .occ-btn{display:inline-flex;align-items:center;justify-content:center;gap:7px;height:38px;padding:0 16px;border-radius:var(--radius-md);font:inherit;font-size:13px;font-weight:600;cursor:pointer;border:1px solid var(--border-default);background:var(--surface-card);color:var(--text-body);transition:all .12s}
    .occ-btn:hover{background:var(--gray-50)}
    .occ-btn.pri{background:var(--c-primary);border-color:var(--c-primary);color:#fff}
    .occ-btn.pri:hover{background:var(--c-primary-hover)}
    .occ-btn.danger{background:var(--red);border-color:var(--red);color:#fff}
    .occ-btn.ghost{background:transparent;border-color:transparent;color:var(--text-muted)}
    .occ-btn.sm{height:34px;padding:0 13px}
    .occ-card{background:var(--surface-card);border:1px solid var(--border-subtle);border-radius:var(--radius-lg);box-shadow:var(--shadow-sm)}
    .occ-chip{height:32px;padding:0 14px;border-radius:999px;font:inherit;font-size:13px;font-weight:600;cursor:pointer;transition:all .12s;background:var(--surface-card);color:var(--text-body);border:1px solid var(--border-default)}
    .occ-chip.on{background:var(--c-primary);color:#fff;border-color:var(--c-primary)}
    .occ-input{width:100%;height:42px;padding:0 12px;border:1px solid var(--border-default);border-radius:var(--radius-md);font:inherit;font-size:14px;color:var(--text-strong);background:var(--surface-card)}
    .occ-input:focus{outline:none;border-color:var(--c-primary);box-shadow:0 0 0 3px rgba(85,95,196,.25)}
    .occ-sq{width:32px;height:32px;border:1px solid var(--border-subtle);background:var(--surface-card);border-radius:var(--radius-md);display:flex;align-items:center;justify-content:center;cursor:pointer;color:var(--text-muted)}
    .occ-sq:hover{background:var(--gray-50)}
    .occ-eyebrow{font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--text-muted)}
    @keyframes occ-pop{from{opacity:0;transform:translateY(6px) scale(.98)}to{opacity:1;transform:none}}
  `;

  const TONE: Record<string, { bg: string; fg: string }> = {
    brand: { bg: "var(--blue-50)", fg: "var(--c-primary)" }, danger: { bg: "var(--red-100)", fg: "var(--red)" },
    neutral: { bg: "var(--gray-100)", fg: "var(--text-muted)" }, warning: { bg: "var(--amber-100)", fg: "var(--amber-800)" },
    success: { bg: "var(--green-100)", fg: "var(--green)" },
  };
  const badge = (tone: string, label: string, dot = false) => (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, height: 22, padding: "0 9px", borderRadius: 999, fontSize: 12, fontWeight: 600, background: TONE[tone].bg, color: TONE[tone].fg }}>
      {dot && <span style={{ width: 6, height: 6, borderRadius: "50%", background: "currentColor" }} />}{label}
    </span>
  );

  const NAV: { id: typeof screen; label: string }[] = [
    { id: "sites", label: "My sites" }, { id: "occasions", label: "Occasions" }, { id: "appearance", label: "Appearance" },
    { id: "install", label: "Install" }, { id: "help", label: "Help" },
  ];

  const siteSelector = (sites.length > 1 && sel) ? (
    <select value={sel.key} onChange={(e) => setSelectedKey(e.target.value)} className="occ-input" style={{ width: "auto", height: 34, fontSize: 13, fontWeight: 600 }}>
      {sites.map((s) => <option key={s.key} value={s.key}>{s.domain}</option>)}
    </select>
  ) : null;

  const needsSite = !sel && (screen === "occasions" || screen === "appearance" || screen === "install");

  return (
    <div className="occ-ds">
      <style>{TOKENS}</style>
      <div style={{ display: "flex", justifyContent: "center", padding: "28px 18px" }}>
        <div style={{ width: "100%", maxWidth: 1140, display: "flex", flexDirection: "column", gap: 18 }}>

          {/* shell: top bar + tabs */}
          <div className="occ-card" style={{ overflow: "hidden", boxShadow: "var(--shadow-sm)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 18px", borderBottom: "1px solid var(--border-subtle)" }}>
              <div style={{ width: 30, height: 30, borderRadius: 8, background: "var(--grad-brand)", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="#fff"><polygon points="6 3 20 12 6 21 6 3" /></svg>
              </div>
              <div style={{ lineHeight: 1.1 }}>
                <div className="occ-disp" style={{ fontSize: 16 }}>Occasions</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{account.accountName || "Your account"}</div>
              </div>
              <div style={{ flex: 1 }} />
              {badge(isPaid ? "success" : "neutral", isPaid ? "Included" : "Free plan", isPaid)}
            </div>
            <div style={{ display: "flex", gap: 2, padding: "8px 10px", overflowX: "auto", background: "var(--gray-50)" }}>
              {NAV.map((t) => (
                <button key={t.id} className="occ-tab" onClick={() => setScreen(t.id)}
                  style={{ background: screen === t.id ? "var(--blue-50)" : "transparent", color: screen === t.id ? "var(--c-primary)" : "var(--text-muted)" }}>{t.label}</button>
              ))}
            </div>
          </div>

          <div style={{ animation: "occ-pop .2s ease-out" }}>
            {needsSite ? (
              <div className="occ-card" style={{ padding: "40px 28px", textAlign: "center", borderStyle: "dashed", borderColor: "var(--border-default)" }}>
                <div className="occ-disp" style={{ fontSize: 18, marginBottom: 6 }}>Add a site first</div>
                <div style={{ fontSize: 14, color: "var(--text-muted)", marginBottom: 18 }}>You need at least one site before choosing occasions.</div>
                <button className="occ-btn pri" onClick={() => setModal(isPaid ? "add-site" : "upgrade")}>Add a site</button>
              </div>
            ) : screen === "sites" ? (
              Sites()
            ) : screen === "occasions" ? (
              Occasions()
            ) : screen === "appearance" ? (
              Appearance()
            ) : screen === "install" ? (
              Install()
            ) : (
              Help()
            )}
          </div>
        </div>
      </div>

      {modal && Modals()}
    </div>
  );

  // ───────────────────────── screens ─────────────────────────
  function Sites() {
    const list = isPaid ? sites : sites.slice(0, 1);
    return (
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 18, flexWrap: "wrap" }}>
          <div>
            <div className="occ-disp" style={{ fontSize: 20 }}>Your sites</div>
            <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 2 }}>Manage where the Occasions banner runs.</div>
          </div>
          <button className="occ-btn pri sm" onClick={() => setModal(isPaid ? "add-site" : "upgrade")}>Add a site</button>
        </div>

        {list.length === 0 ? (
          <div className="occ-card" style={{ padding: "40px 28px", textAlign: "center", borderStyle: "dashed", borderColor: "var(--border-default)" }}>
            <div className="occ-disp" style={{ fontSize: 18, marginBottom: 6 }}>Add your first site</div>
            <div style={{ fontSize: 14, color: "var(--text-muted)", marginBottom: 20 }}>Paste the domain where you want occasion banners to appear.</div>
            <div style={{ display: "flex", gap: 10, maxWidth: 440, margin: "0 auto" }}>
              <input className="occ-input" placeholder="yourdomain.com" value={addDomain} onChange={(e) => setAddDomain(e.target.value)} />
              <button className="occ-btn pri" onClick={doAddSite} disabled={busy}>Add</button>
            </div>
            {err && <div style={{ color: "var(--red)", fontSize: 13, marginTop: 12 }}>{err}</div>}
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))", gap: 14 }}>
            {list.map((s) => {
              const live = s.active ? resolveActive(s.occasions, new Date()).banners.length : 0;
              return (
                <div key={s.key} className="occ-card" style={{ padding: 18, display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                    <div style={{ fontWeight: 600, fontSize: 15, color: "var(--text-strong)", wordBreak: "break-all" }}>{s.domain}</div>
                    {badge(s.active ? "success" : "neutral", s.active ? "Live" : "Paused", true)}
                  </div>
                  <div style={{ fontSize: 13, color: "var(--text-muted)" }}>{s.active ? `${live} occasion${live === 1 ? "" : "s"} live now` : "Paused — nothing showing"}</div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", borderTop: "1px solid var(--border-subtle)", paddingTop: 12 }}>
                    <button className="occ-btn sm" style={{ flex: 1, minWidth: 60, height: 32, padding: "0 8px", fontSize: 12 }} onClick={() => { setSelectedKey(s.key); setScreen("occasions"); }}>Edit</button>
                    <button className="occ-btn sm" style={{ flex: 1, minWidth: 60, height: 32, padding: "0 8px", fontSize: 12 }} onClick={() => { setSelectedKey(s.key); setModal("preview"); }}>Preview</button>
                    <button className="occ-btn sm" style={{ flex: 1, minWidth: 60, height: 32, padding: "0 8px", fontSize: 12 }} onClick={() => { setSelectedKey(s.key); setModal("install"); }}>Snippet</button>
                    <button className="occ-sq" aria-label={s.active ? "Pause" : "Resume"} onClick={() => toggleActive(s.key, !s.active)}>
                      {s.active ? <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>
                        : <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="6 4 20 12 6 20 6 4" /></svg>}
                    </button>
                    <button className="occ-sq" style={{ color: "var(--red)" }} aria-label="Remove" onClick={() => { setModalKey(s.key); setModal("remove"); }}><Ico name="trash" size={14} /></button>
                  </div>
                </div>
              );
            })}

            {isPaid ? (
              <button onClick={() => setModal("add-site")} style={{ background: "var(--blue-50)", border: "1px dashed var(--border-brand)", borderRadius: "var(--radius-lg)", minHeight: 150, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, cursor: "pointer", color: "var(--c-primary)", font: "inherit" }}>
                <Ico name="plus" size={26} /><span style={{ fontWeight: 600, fontSize: 14 }}>Add a site</span>
              </button>
            ) : (
              <button onClick={() => setModal("upgrade")} style={{ background: "var(--gray-50)", border: "1px dashed var(--border-default)", borderRadius: "var(--radius-lg)", minHeight: 150, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, cursor: "pointer", textAlign: "center", padding: 16, font: "inherit", color: "var(--text-muted)" }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                <span style={{ fontWeight: 600, fontSize: 13, color: "var(--text-body)", maxWidth: 180 }}>Unlimited sites, included with a paid plan.</span>
                <span style={{ fontSize: 12, color: "var(--c-primary)", fontWeight: 600 }}>Upgrade →</span>
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  function Occasions() {
    return (
      <div>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
          <div>
            <div className="occ-disp" style={{ fontSize: 20 }}>Occasions</div>
            <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 2 }}>Pick which holidays show a banner. {occCount} shown.</div>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>{siteSelector}</div>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
          {REGION_CHIPS.map((c) => (
            <button key={c.key} className={`occ-chip${regions.includes(c.key) ? " on" : ""}`} onClick={() => toggleRegion(c.key)}>{c.label}</button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 20 }}>
          <span className="occ-eyebrow">Quick presets</span>
          {([["global", "All global"], ["ca", "Canadian holidays"], ["us", "US holidays"]] as [WidgetRegion, string][]).map(([k, label]) => (
            <button key={k} onClick={() => setRegions([k])} style={{ height: 28, padding: "0 12px", borderRadius: 999, border: "1px solid var(--border-subtle)", background: "var(--gray-50)", font: "inherit", fontSize: 12, fontWeight: 600, color: "var(--c-primary)", cursor: "pointer" }}>{label}</button>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))", gap: 12 }}>
          {visOcc.map((o) => {
            const meta = REGION_META[regionOf(o.id)];
            const on = !!cfg.banners?.[o.id]?.enabled;
            return (
              <div key={o.id} className="occ-card" style={{ padding: 16, display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: "var(--text-strong)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{o.name}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                    <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Next · {nextDate(o.id)}</span>
                    {badge(meta.tone, meta.label)}
                  </div>
                </div>
                <Switch on={on} onChange={(v) => setBanner(o.id, v)} />
              </div>
            );
          })}
          {showCustom && (cfg.custom ?? []).map((c) => (
            <div key={c.id} className="occ-card" style={{ padding: 16, display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: "var(--text-strong)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.name}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                  <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{c.startDate}{c.endDate ? `–${c.endDate}` : ""}</span>
                  {badge("warning", "My custom")}
                </div>
              </div>
              <Switch on={!!c.enabled} onChange={(v) => setCustomEnabled(c.id, v)} />
            </div>
          ))}
          <button onClick={() => setModal("custom")} style={{ background: "var(--blue-50)", border: "1px dashed var(--border-brand)", borderRadius: "var(--radius-lg)", minHeight: 72, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, cursor: "pointer", color: "var(--c-primary)", font: "inherit", fontWeight: 600, fontSize: 14 }}>
            <Ico name="plus" size={20} /> Create custom occasion
          </button>
        </div>
      </div>
    );
  }

  function Appearance() {
    return (
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div className="occ-disp" style={{ fontSize: 20, marginBottom: 2 }}>Appearance</div>
            <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 18 }}>Style the banner your visitors see.</div>
          </div>
          {siteSelector}
        </div>

        <div style={{ position: "relative", height: 150, borderRadius: "var(--radius-lg)", border: "1px solid var(--border-subtle)", background: "repeating-linear-gradient(45deg,var(--gray-50),var(--gray-50) 10px,var(--gray-100) 10px,var(--gray-100) 20px)", overflow: "hidden", display: "flex", padding: 14, alignItems: vh.v === "top" ? "flex-start" : vh.v === "bottom" ? "flex-end" : "center", justifyContent: vh.h === "left" ? "flex-start" : vh.h === "right" ? "flex-end" : "center", marginBottom: 24 }}>
          <div style={{ background: bannerColor, color: "#fff", borderRadius: "var(--radius-md)", padding: "10px 16px", fontSize: 13, fontWeight: 600, boxShadow: "var(--shadow-md)", transform: vertical ? "rotate(-90deg)" : undefined, transformOrigin: "center", whiteSpace: "nowrap" }}>{cfg.banners ? "Happy holidays — 20% off this week" : "Your banner"}</div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 22 }}>
          <div>
            <div className="occ-eyebrow" style={{ marginBottom: 10 }}>Banner colour</div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {SWATCHES.map((v) => (
                <button key={v} onClick={() => setStyle({ bg: v })} style={{ width: 34, height: 34, borderRadius: 10, cursor: "pointer", background: v, border: bannerColor === v ? "none" : "1px solid rgba(0,0,0,.08)", boxShadow: bannerColor === v ? `0 0 0 2px var(--surface-card),0 0 0 4px ${v}` : "none" }} />
              ))}
            </div>
          </div>
          <div>
            <div className="occ-eyebrow" style={{ marginBottom: 10 }}>Position</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,40px)", gridAutoRows: "40px", gap: 6 }}>
              {(["top", "middle", "bottom"] as const).flatMap((v) => (["left", "center", "right"] as const).map((h) => {
                const on = vh.v === v && vh.h === h;
                return <button key={`${v}-${h}`} onClick={() => setStyle({ position: POS[v][h] })} aria-label={`${v} ${h}`} style={{ display: "flex", padding: 5, cursor: "pointer", borderRadius: 8, alignItems: v === "top" ? "flex-start" : v === "bottom" ? "flex-end" : "center", justifyContent: h === "left" ? "flex-start" : h === "right" ? "flex-end" : "center", border: on ? "1px solid var(--c-primary)" : "1px solid var(--border-default)", background: on ? "var(--blue-50)" : "var(--surface-card)" }}>
                  <span style={{ width: 7, height: 7, borderRadius: 2, background: on ? "var(--c-primary)" : "var(--gray-400)" }} />
                </button>;
              }))}
            </div>
          </div>
        </div>

        <div style={{ marginTop: 24 }}>
          <div className="occ-eyebrow" style={{ marginBottom: 10 }}>Animation</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {ANIM_CHIPS.map(([k, label]) => (
              <button key={k} className={`occ-chip${curAnim === k ? " on" : ""}`} onClick={() => setAnim(k)}>{label}</button>
            ))}
          </div>
          {curAnim !== "none" && <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 8 }}>{ANIM_BY_KEY[curAnim as AnimationKind]?.label} runs ambiently on the site.</p>}
        </div>

        <div style={{ marginTop: 24 }}>
          <div className="occ-eyebrow" style={{ marginBottom: 10 }}>Movement</div>
          <FlyChip fly={gMove === "airplane"} onChange={changeMovement} />
        </div>

        <div style={{ marginTop: 24 }}>
          <div className="occ-eyebrow" style={{ marginBottom: 12 }}>Animation &amp; flight controls — shared by all effects</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 18 }}>
            <Slider label="Speed" value={fx.speed} min={1} max={12} hint="how fast they move" onChange={(v) => setSettings({ speed: v })} />
            <Slider label="Density" value={fx.density} min={5} max={100} hint="how many on screen" onChange={(v) => setSettings({ density: v })} />
            <Slider label="Size" value={fx.size} min={10} max={48} hint="how big each one is" onChange={(v) => setSettings({ size: v })} />
            <Slider label="Randomness" value={fx.randomness} min={0} max={100} hint="how varied they look" onChange={(v) => setSettings({ randomness: v })} />
          </div>
        </div>

        <div style={{ marginTop: 24 }}>
          <div className="occ-eyebrow" style={{ marginBottom: 10 }}>Show window</div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Field label="Show from" style={{ flex: 1, minWidth: 150 }}><input className="occ-input" type="date" value={gStart} onChange={(e) => changeWindow(e.target.value, gEnd)} /></Field>
            <Field label="Show to" style={{ flex: 1, minWidth: 150 }}><input className="occ-input" type="date" value={gEnd} onChange={(e) => changeWindow(gStart, e.target.value)} /></Field>
          </div>
          <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 8 }}>Applies to every occasion you&apos;ve turned on — set a window that includes today to see it live now. Leave blank to use each holiday&apos;s normal dates.</p>
        </div>

        <div className="occ-card" style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 14, padding: 18 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <span style={{ fontSize: 14, color: "var(--text-strong)" }}>Visitors can dismiss the banner</span>
            <Switch on={ap.dismissible !== false} onChange={(v) => setStyle({ dismissible: v })} />
          </div>
          <div style={{ height: 1, background: "var(--border-subtle)" }} />
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 500, color: "var(--text-strong)" }}>Show &quot;Powered by AIBizConnect&quot; badge</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{isPaid ? "Free to turn off on a paid plan." : "Locked on for Free. Upgrade to remove it."}</div>
            </div>
            <Switch on={isPaid ? (sel?.badge ?? true) : true} disabled={!isPaid} onChange={(v) => toggleBadge(v)} />
          </div>
        </div>
      </div>
    );
  }

  function Install() {
    return (
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div className="occ-disp" style={{ fontSize: 20, marginBottom: 2 }}>Install</div>
            <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 18 }}>Add one snippet to your site — banners appear automatically.</div>
          </div>
          {siteSelector}
        </div>

        <div style={{ background: "var(--navy)", borderRadius: "var(--radius-lg)", padding: 18 }}>
          <pre style={{ margin: 0, fontFamily: "ui-monospace,Menlo,Consolas,monospace", fontSize: 13, lineHeight: 1.6, color: "#C9CEF5", whiteSpace: "pre-wrap", wordBreak: "break-all" }}>{snippet}</pre>
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
          <button className="occ-btn pri sm" onClick={copySnippet}>{copied ? "Copied!" : "Copy snippet"}</button>
          <button className="occ-btn sm" onClick={() => setModal("install")}>Open install card</button>
        </div>

        <div className="occ-eyebrow" style={{ marginTop: 26, marginBottom: 10 }}>Where do I paste it?</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {TARGETS.map((t) => (
            <div key={t.id} className="occ-card" style={{ overflow: "hidden", boxShadow: "none" }}>
              <button onClick={() => setOpenInfo((p) => (p === t.id ? null : t.id))} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "14px 16px", background: "none", border: "none", cursor: "pointer", font: "inherit" }}>
                <span style={{ fontWeight: 600, fontSize: 14, color: "var(--text-strong)" }}>{t.label}</span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--c-primary)", fontWeight: 600 }}><Ico name="info" size={15} /> Info</span>
              </button>
              {openInfo === t.id && <div style={{ padding: "12px 16px 14px", fontSize: 13, color: "var(--text-body)", lineHeight: 1.55, borderTop: "1px solid var(--border-subtle)" }}>{t.info}</div>}
            </div>
          ))}
        </div>
      </div>
    );
  }

  function Help() {
    return (
      <div>
        <div className="occ-disp" style={{ fontSize: 20, marginBottom: 2 }}>Help</div>
        <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 18 }}>Quick answers to common questions.</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {FAQ.map((f) => (
            <div key={f.id} className="occ-card" style={{ overflow: "hidden", boxShadow: "none" }}>
              <button onClick={() => setFaqOpen((p) => (p === f.id ? null : f.id))} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: 16, background: "none", border: "none", cursor: "pointer", font: "inherit", textAlign: "left" }}>
                <span style={{ fontWeight: 600, fontSize: 14, color: "var(--text-strong)" }}>{f.q}</span>
                <span style={{ color: "var(--text-muted)", transform: faqOpen === f.id ? "rotate(180deg)" : "none", transition: "transform .15s" }}><Ico name="chevron" size={18} /></span>
              </button>
              {faqOpen === f.id && <div style={{ padding: "0 16px 16px", fontSize: 13, color: "var(--text-body)", lineHeight: 1.6 }}>{f.a}</div>}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ───────────────────────── modals ─────────────────────────
  function Modals() {
    const close = () => { setModal(null); setErr(""); };
    return (
      <div onClick={close} style={{ position: "fixed", inset: 0, zIndex: 50, background: "rgba(9,9,40,.42)", backdropFilter: "blur(3px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
        <div className="occ-ds" onClick={(e) => e.stopPropagation()} style={{ minHeight: 0, background: "var(--surface-card)", borderRadius: "var(--radius-xl)", boxShadow: "var(--shadow-xl)", width: "100%", maxWidth: 440, maxHeight: "88vh", overflow: "auto", animation: "occ-pop .14s ease-out" }}>
          {modal === "add-site" && (
            <div style={{ padding: 24 }}>
              <div className="occ-disp" style={{ fontSize: 18, marginBottom: 6 }}>Add a site</div>
              <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 18 }}>Enter the domain where banners should appear.</div>
              <input className="occ-input" placeholder="yourdomain.com" value={addDomain} onChange={(e) => setAddDomain(e.target.value)} onKeyDown={(e) => e.key === "Enter" && doAddSite()} />
              {err && <div style={{ color: "var(--red)", fontSize: 13, marginTop: 10 }}>{err}</div>}
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 22 }}>
                <button className="occ-btn ghost" onClick={close}>Cancel</button>
                <button className="occ-btn pri" onClick={doAddSite} disabled={busy}>{busy ? "Adding…" : "Add site"}</button>
              </div>
            </div>
          )}
          {modal === "custom" && (
            <div style={{ padding: 24 }}>
              <div className="occ-disp" style={{ fontSize: 18, marginBottom: 18 }}>Create custom occasion</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <Field label="Name"><input className="occ-input" placeholder="Summer sale" value={custom.name} onChange={(e) => setCustom({ ...custom, name: e.target.value })} /></Field>
                <div style={{ display: "flex", gap: 12 }}>
                  <Field label="Start date" style={{ flex: 1 }}><input className="occ-input" type="date" value={custom.start} onChange={(e) => setCustom({ ...custom, start: e.target.value })} /></Field>
                  <Field label="End date" style={{ flex: 1 }}><input className="occ-input" type="date" value={custom.end} onChange={(e) => setCustom({ ...custom, end: e.target.value })} /></Field>
                </div>
                <Field label="Banner message"><input className="occ-input" placeholder="20% off everything this week" value={custom.message} onChange={(e) => setCustom({ ...custom, message: e.target.value })} /></Field>
                <Field label="Link URL"><input className="occ-input" placeholder="https://yoursite.com/sale" value={custom.link} onChange={(e) => setCustom({ ...custom, link: e.target.value })} /></Field>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 14, color: "var(--text-strong)" }}>Open link in a new tab</span>
                  <Switch on={custom.newTab} onChange={(v) => setCustom({ ...custom, newTab: v })} />
                </div>
              </div>
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 22 }}>
                <button className="occ-btn ghost" onClick={close}>Cancel</button>
                <button className="occ-btn pri" onClick={addCustomOccasion}>Save occasion</button>
              </div>
            </div>
          )}
          {modal === "install" && (
            <div style={{ padding: 24 }}>
              <div className="occ-disp" style={{ fontSize: 18, marginBottom: 14 }}>Install snippet</div>
              <div style={{ background: "var(--navy)", borderRadius: "var(--radius-md)", padding: 14, fontFamily: "ui-monospace,Menlo,Consolas,monospace", fontSize: 12, color: "#C9CEF5", whiteSpace: "pre-wrap", wordBreak: "break-all", marginBottom: 16 }}>{snippet}</div>
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button className="occ-btn ghost" onClick={close}>Close</button>
                <button className="occ-btn pri" onClick={copySnippet}>{copied ? "Copied!" : "Copy snippet"}</button>
              </div>
            </div>
          )}
          {modal === "preview" && (
            <div style={{ padding: 24 }}>
              <div className="occ-disp" style={{ fontSize: 18, marginBottom: 14 }}>Preview</div>
              <div style={{ position: "relative", height: 170, borderRadius: "var(--radius-lg)", border: "1px solid var(--border-subtle)", background: "repeating-linear-gradient(45deg,var(--gray-50),var(--gray-50) 10px,var(--gray-100) 10px,var(--gray-100) 20px)", overflow: "hidden", display: "flex", alignItems: vh.v === "top" ? "flex-start" : vh.v === "bottom" ? "flex-end" : "center", justifyContent: vh.h === "left" ? "flex-start" : vh.h === "right" ? "flex-end" : "center", padding: 14 }}>
                <div style={{ background: bannerColor, color: "#fff", borderRadius: "var(--radius-md)", padding: "10px 16px", fontSize: 13, fontWeight: 600, boxShadow: "var(--shadow-md)", transform: vertical ? "rotate(-90deg)" : undefined, transformOrigin: "center", whiteSpace: "nowrap" }}>Happy holidays — 20% off this week</div>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 18 }}><button className="occ-btn" onClick={close}>Close</button></div>
            </div>
          )}
          {modal === "upgrade" && (
            <div style={{ padding: "28px 24px", textAlign: "center" }}>
              <div style={{ width: 52, height: 52, borderRadius: 14, background: "var(--grad-brand)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>
              </div>
              <div className="occ-disp" style={{ fontSize: 19, marginBottom: 8 }}>Unlimited sites, included</div>
              <div style={{ fontSize: 14, color: "var(--text-body)", lineHeight: 1.6, marginBottom: 20 }}>Upgrade your plan to add unlimited sites, apply occasions everywhere, and remove the AIBizConnect badge.</div>
              <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
                <button className="occ-btn ghost" onClick={close}>Not now</button>
                <button className="occ-btn pri" onClick={close}>See plans</button>
              </div>
            </div>
          )}
          {modal === "remove" && (
            <div style={{ padding: 24 }}>
              <div className="occ-disp" style={{ fontSize: 18, marginBottom: 8 }}>Remove this site?</div>
              <div style={{ fontSize: 14, color: "var(--text-body)", lineHeight: 1.6, marginBottom: 22 }}>Banners will stop showing immediately. You can add the site again any time.</div>
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button className="occ-btn ghost" onClick={close}>Cancel</button>
                <button className="occ-btn danger" onClick={doRemove} disabled={busy}>{busy ? "Removing…" : "Remove site"}</button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }
}

function FlyChip({ fly, onChange }: { fly: boolean; onChange: (v: boolean) => void }) {
  const opt = (active: boolean): React.CSSProperties => ({ height: 26, padding: "0 10px", borderRadius: 7, border: "none", background: active ? "var(--c-primary)" : "transparent", color: active ? "#fff" : "var(--text-muted)", font: "inherit", fontSize: 12, fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 5 });
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Show as</span>
      <div style={{ display: "inline-flex", padding: 2, borderRadius: 9, border: "1px solid var(--border-default)", background: "var(--gray-50)" }}>
        <button type="button" onClick={() => onChange(false)} style={opt(!fly)}>Banner</button>
        <button type="button" onClick={() => onChange(true)} style={opt(fly)}><Ico name="plane" size={13} /> Airplane</button>
      </div>
    </div>
  );
}

function Slider({ label, value, min, max, hint, onChange }: { label: string; value: number; min: number; max: number; hint?: string; onChange: (v: number) => void }) {
  return (
    <label style={{ display: "block" }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 600, color: "var(--text-muted)" }}>
        <span>{label}</span><span style={{ color: "var(--text-strong)" }}>{value}</span>
      </div>
      <input type="range" min={min} max={max} value={value} onChange={(e) => onChange(Number(e.target.value))} style={{ width: "100%", accentColor: "var(--c-primary)", marginTop: 6 }} />
      {hint && <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{hint}</span>}
    </label>
  );
}

function Field({ label, children, style }: { label: string; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <label style={{ display: "block", ...style }}>
      <span style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 6 }}>{label}</span>
      {children}
    </label>
  );
}
