"use client";

import { useEffect, useRef, useState } from "react";
import TimezoneSelect from "@/components/design/TimezoneSelect";
import { useRouter } from "next/navigation";
import { getSiteSettings, saveSiteSettings, type SiteSettings } from "../actions";
import { renameWebsite, setWebsiteDomain, deleteWebsite, setPrimaryWebsite } from "../website-actions";
import { SUBDOMAIN_BASE } from "@/lib/sites/wizard-shared";
import MediaPickerModal from "../editor/MediaPickerModal";
import DomainEmailSettings from "./DomainEmailSettings";

const inp = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#1e3a8a] focus:outline-none";
const ta = inp + " font-mono text-xs";

/** polished toggle switch. */
function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" role="switch" aria-checked={on} onClick={() => onChange(!on)}
      className={`relative h-6 w-11 flex-none rounded-full transition ${on ? "bg-[#1e3a8a]" : "bg-slate-300"}`}>
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? "left-[22px]" : "left-0.5"}`} />
    </button>
  );
}

/** Two-column settings row: label/description on the left, control on the right. */
function Row({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-3 border-b border-slate-100 py-5 last:border-0 md:grid-cols-[260px_1fr]">
      <div>
        <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
        {desc && <p className="mt-1 text-xs leading-relaxed text-slate-500">{desc}</p>}
      </div>
      <div className="flex flex-col gap-4">{children}</div>
    </div>
  );
}

/** A toggle line with label + description (Payments / Performance sections). */
function ToggleLine({ title, desc, on, onChange, badge }: { title: string; desc: string; on: boolean; onChange: (v: boolean) => void; badge?: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <div className="flex items-center gap-2 text-sm font-medium text-slate-700">{title}{badge && <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-emerald-700">{badge}</span>}</div>
        <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{desc}</p>
      </div>
      <Toggle on={on} onChange={onChange} />
    </div>
  );
}

/**
 * Website-level Settings tab — mirrors the market-leading platform's layout. Website identity/URL lives on
 * the websites row (name/domain); everything else is the SiteSettings store
 * (website_brand_settings.theme.site), autosaved and applied on the published site.
 */
export default function WebsiteSettings({ tenantId, websiteId, websiteName, subdomain, isPrimary, websiteCount }: { tenantId: string; websiteId: string; websiteName?: string; subdomain?: string | null; isPrimary?: boolean; websiteCount?: number }) {
  const router = useRouter();
  const [s, setS] = useState<SiteSettings>({});
  const [name, setName] = useState(websiteName ?? "");
  const [loaded, setLoaded] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [domainHelp, setDomainHelp] = useState<null | "purchase" | "connect">(null);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [primary, setPrimary] = useState(!!isPrimary);
  const [primaryPending, setPrimaryPending] = useState(false);
  const freeHost = `${(subdomain || "your-site")}.${SUBDOMAIN_BASE}`;
  const isOnlySite = (websiteCount ?? 1) <= 1;

  const makePrimary = async () => {
    setPrimaryPending(true);
    const r = await setPrimaryWebsite(tenantId, websiteId);
    setPrimaryPending(false);
    if (r.ok) { setPrimary(true); router.refresh(); } else setError(r.error ?? "Could not set primary.");
  };
  const copyHost = () => { try { navigator.clipboard?.writeText(freeHost); } catch { /* ignore */ } };
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nameTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const domainTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    getSiteSettings(tenantId, websiteId).then((v) => {
      // Defaults: optimization on (matches the leading builder's defaults) unless explicitly disabled.
      setS({ imageOptimization: true, optimizeJs: true, ...v });
      setLoaded(true);
    }).catch(() => setLoaded(true));
  }, [tenantId, websiteId]);

  const set = (patch: Partial<SiteSettings>) => {
    setS((prev) => {
      const next = { ...prev, ...patch };
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        saveSiteSettings(tenantId, next, websiteId).then(() => { setSavedAt(Date.now()); setError(null); }).catch((e) => setError(e?.message ?? "Could not save."));
      }, 500);
      return next;
    });
  };
  const setCookie = (patch: Partial<NonNullable<SiteSettings["cookieConsent"]>>) => set({ cookieConsent: { ...(s.cookieConsent ?? {}), ...patch } });

  const onName = (v: string) => {
    setName(v);
    set({ siteName: v }); // keep SEO site name in sync
    if (nameTimer.current) clearTimeout(nameTimer.current);
    nameTimer.current = setTimeout(() => { renameWebsite(tenantId, websiteId, v).catch(() => {}); }, 600);
  };
  const onDomain = (v: string) => {
    set({ customDomain: v });
    if (domainTimer.current) clearTimeout(domainTimer.current);
    domainTimer.current = setTimeout(() => { setWebsiteDomain(tenantId, websiteId, v || null).catch(() => {}); }, 600);
  };

  async function doDelete() {
    setDeleting(true);
    const r = await deleteWebsite(tenantId, websiteId);
    setDeleting(false);
    if (!r.ok) { setError(r.error ?? "Could not delete."); return; }
    router.push(`/tenants/${tenantId}/sites`);
  }

  if (!loaded) return <div className="py-10 text-center text-sm text-slate-400">Loading settings…</div>;
  const cc = s.cookieConsent ?? {};

  return (
    <div className="max-w-4xl">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">Website Settings</h2>
        <span className="text-xs text-slate-400">{error ? <span className="text-red-500">{error}</span> : savedAt ? "Saved ✓ — applies on the published site" : "Changes save automatically"}</span>
      </div>

      {/* Website details */}
      <Row title="Website details" desc="Manage your website's identity and address.">
        <label className="flex flex-col gap-1"><span className="text-xs font-medium text-slate-600">Name</span>
          <input className={inp} value={name} onChange={(e) => onName(e.target.value)} placeholder="AI Biz Connect" /></label>

        {/* Free address — fixed, non-editable until a custom domain is connected */}
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-slate-600">Your website address</span>
          <div className="flex items-stretch gap-2">
            <div className="flex flex-1 items-center rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
              <span className="font-medium">{subdomain || "your-site"}</span>
              <span className="text-slate-400">.{SUBDOMAIN_BASE}</span>
              <span className="ml-2 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-emerald-700">free · always on</span>
            </div>
            <button type="button" onClick={copyHost} title="Copy address"
              className="flex-none rounded-lg border border-slate-300 px-3 text-sm text-slate-600 hover:bg-slate-50">Copy</button>
          </div>
          <span className="text-[11px] text-slate-400">This is your built-in address — it can't be changed and stays live until you connect or buy your own domain below.</span>
        </div>

        {/* Custom domain — optional, with guidance */}
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-slate-600">Custom domain <span className="font-normal text-slate-400">(optional)</span></span>
          <input className={inp} value={s.customDomain ?? ""} onChange={(e) => onDomain(e.target.value.trim())} placeholder="www.yourbusiness.com" />
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Don't have one? <button type="button" onClick={() => setDomainHelp("purchase")} className="font-medium text-[#1e3a8a] hover:underline">Buy a domain</button> · already own one? <button type="button" onClick={() => setDomainHelp("connect")} className="font-medium text-[#1e3a8a] hover:underline">How to connect</button></span>
            {s.customDomain ? <button type="button" onClick={() => onDomain("")} className="font-medium text-red-500 hover:underline">Remove</button> : null}
          </div>
          <span className="text-[11px] text-slate-400">Going live on a custom domain requires pointing DNS to us + verification — connection isn't active yet.</span>
        </div>

        {/* Primary website */}
        <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 p-3">
          <div>
            <div className="text-sm font-medium text-slate-700">Primary website {primary && <span className="ml-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-amber-700">Primary</span>}</div>
            <p className="mt-0.5 text-xs text-slate-500">The primary site is shown first and is kept when you delete others.</p>
          </div>
          {primary
            ? <span className="text-xs text-slate-400">This is your primary site</span>
            : <button type="button" disabled={primaryPending} onClick={makePrimary}
                className="flex-none rounded-lg border border-[#1e3a8a] px-3 py-2 text-sm font-medium text-[#1e3a8a] hover:bg-[#1e3a8a]/5 disabled:opacity-50">
                {primaryPending ? "Setting…" : "Make primary"}</button>}
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-slate-600">Favicon</span>
          <div className="flex items-center gap-2">
            {s.faviconUrl ? <img src={s.faviconUrl} alt="" className="h-8 w-8 rounded border border-slate-200 object-contain" /> : <span className="flex h-8 w-8 items-center justify-center rounded border border-dashed border-slate-300 text-[10px] text-slate-300">ico</span>}
            <input className={inp} value={s.faviconUrl ?? ""} onChange={(e) => set({ faviconUrl: e.target.value.trim() })} placeholder="https://… (32×32 PNG/ICO)" />
            <button type="button" onClick={() => setPickerOpen(true)} title="Pick from Media Storage"
              className="flex-none rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50">🖼 Pick</button>
          </div>
        </div>
      </Row>

      {/* Domain & email — verification + go-live (per-website binding) */}
      <Row title="Domain & email" desc="Connect this website's custom domain and set up email sending from your own domain. DNS is only changed when you publish.">
        <DomainEmailSettings tenantId={tenantId} websiteId={websiteId} />
      </Row>

      {/* Basics & SEO */}
      <Row title="Basics & SEO" desc="Locale and default social/search settings.">
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1"><span className="text-xs font-medium text-slate-600">Language</span>
            <input className={inp} placeholder="en" value={s.language ?? ""} onChange={(e) => set({ language: e.target.value })} /></label>
          <label className="flex flex-col gap-1"><span className="text-xs font-medium text-slate-600">Timezone</span>
            <TimezoneSelect className={inp} value={s.timezone ?? ""} onChange={(v) => set({ timezone: v })} allowEmpty /></label>
        </div>
        <label className="flex flex-col gap-1"><span className="text-xs font-medium text-slate-600">Default social image (OG)</span>
          <input className={inp} placeholder="https://… (fallback share image)" value={s.defaultOgImage ?? ""} onChange={(e) => set({ defaultOgImage: e.target.value })} /></label>
        <ToggleLine title="Hide from search engines" desc="Site-wide noindex — use while building / staging." on={!!s.robotsNoindex} onChange={(v) => set({ robotsNoindex: v })} />
      </Row>

      {/* Tracking & scripts */}
      <Row title="Tracking & scripts" desc="Add third-party tracking and analytics scripts to your website.">
        <div className="grid grid-cols-1 gap-3">
          <label className="flex flex-col gap-1"><span className="text-xs font-medium text-slate-600">Google Analytics 4 (Measurement ID)</span>
            <input className={inp} placeholder="G-XXXXXXXXXX" value={s.ga4Id ?? ""} onChange={(e) => set({ ga4Id: e.target.value })} /></label>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1"><span className="text-xs font-medium text-slate-600">Google Tag Manager</span>
              <input className={inp} placeholder="GTM-XXXXXXX" value={s.gtmId ?? ""} onChange={(e) => set({ gtmId: e.target.value })} /></label>
            <label className="flex flex-col gap-1"><span className="text-xs font-medium text-slate-600">Meta Pixel ID</span>
              <input className={inp} placeholder="123456789012345" value={s.metaPixelId ?? ""} onChange={(e) => set({ metaPixelId: e.target.value })} /></label>
          </div>
          <label className="flex flex-col gap-1"><span className="text-xs font-medium text-slate-600">Head tracking code <span className="text-slate-400">(in &lt;head&gt;)</span></span>
            <textarea rows={3} className={ta} placeholder="<!-- verification meta / custom script -->" value={s.headScripts ?? ""} onChange={(e) => set({ headScripts: e.target.value })} /></label>
          <label className="flex flex-col gap-1"><span className="text-xs font-medium text-slate-600">Body tracking code <span className="text-slate-400">(before &lt;/body&gt;)</span></span>
            <textarea rows={3} className={ta} placeholder="<!-- chat widget / custom pixel -->" value={s.footerScripts ?? ""} onChange={(e) => set({ footerScripts: e.target.value })} /></label>
        </div>
      </Row>

      {/* Payments & checkout */}
      <Row title="Payments & checkout" desc="Control how customers complete purchases on your website.">
        <ToggleLine title="Payment mode" badge={s.paymentMode ? "Live" : undefined} desc="Accept live payments through your connected payment provider. (Connect a provider to take real payments.)" on={!!s.paymentMode} onChange={(v) => set({ paymentMode: v })} />
        <ToggleLine title="Require credit card" desc="When enabled, customers must enter a card even for $0 purchases." on={!!s.requireCard} onChange={(v) => set({ requireCard: v })} />
      </Row>

      {/* Performance & compliance */}
      <Row title="Performance & compliance" desc="Improve performance and meet privacy requirements.">
        <ToggleLine title="Image Optimization" desc="Images are optimized for speed and served via CDN with caching." on={s.imageOptimization !== false} onChange={(v) => set({ imageOptimization: v })} />
        <ToggleLine title="Optimize JavaScript" desc="Custom JS/HTML is lazy-loaded for better page speed." on={s.optimizeJs !== false} onChange={(v) => set({ optimizeJs: v })} />
        <ToggleLine title="GDPR compliant fonts" desc="Self-host fonts instead of Google Fonts for privacy compliance." on={!!s.gdprFonts} onChange={(v) => set({ gdprFonts: v })} />
      </Row>

      {/* Cookie consent */}
      <Row title="Cookie consent" desc="Show a GDPR/PIPEDA consent banner on the published site.">
        <ToggleLine title="Enable cookie banner" desc="Visitors can accept or decline non-essential cookies." on={!!cc.enabled} onChange={(v) => setCookie({ enabled: v })} />
        {cc.enabled && (
          <div className="grid grid-cols-1 gap-3 rounded-lg bg-slate-50 p-3">
            <label className="flex flex-col gap-1"><span className="text-xs font-medium text-slate-600">Message</span>
              <textarea rows={2} className={inp} placeholder="We use cookies to improve your experience…" value={cc.message ?? ""} onChange={(e) => setCookie({ message: e.target.value })} /></label>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1"><span className="text-xs font-medium text-slate-600">Accept label</span>
                <input className={inp} placeholder="Accept" value={cc.acceptLabel ?? ""} onChange={(e) => setCookie({ acceptLabel: e.target.value })} /></label>
              <label className="flex flex-col gap-1"><span className="text-xs font-medium text-slate-600">Decline label</span>
                <input className={inp} placeholder="Decline" value={cc.declineLabel ?? ""} onChange={(e) => setCookie({ declineLabel: e.target.value })} /></label>
            </div>
            <label className="flex flex-col gap-1"><span className="text-xs font-medium text-slate-600">Privacy policy URL</span>
              <input className={inp} placeholder="https://…/privacy" value={cc.policyUrl ?? ""} onChange={(e) => setCookie({ policyUrl: e.target.value })} /></label>
          </div>
        )}
      </Row>

      {/* Website access */}
      <Row title="Website access" desc="Manage access to your website.">
        <div className="rounded-lg border border-red-200 bg-red-50 p-3">
          <div className="text-sm font-medium text-red-700">Delete website</div>
          <p className="mt-0.5 text-xs text-red-600">Permanently removes this website's pages, settings, and data. This can't be undone.</p>
          {isOnlySite ? (
            <p className="mt-2 text-xs text-slate-500">This is your only website — create another first, then you can delete this one. (If it's primary, deleting it automatically promotes the next site to primary.)</p>
          ) : (
            <>
              {primary && <p className="mt-2 text-xs text-amber-700">This is your <b>primary</b> site. Deleting it will automatically make another site primary.</p>}
              <div className="mt-3 flex items-center gap-2">
                <input className="flex-1 rounded-lg border border-red-300 px-3 py-2 text-sm" placeholder='Type DELETE to confirm' value={confirmText} onChange={(e) => setConfirmText(e.target.value)} />
                <button type="button" disabled={confirmText !== "DELETE" || deleting} onClick={doDelete}
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-40">{deleting ? "Deleting…" : "Delete"}</button>
              </div>
            </>
          )}
        </div>
      </Row>

      <MediaPickerModal tenantId={tenantId} open={pickerOpen} onClose={() => setPickerOpen(false)} onSelect={(url) => set({ faviconUrl: url })} />

      {domainHelp && (
        <div className="fixed inset-0 z-[2147483600] flex items-center justify-center bg-black/50 p-4" onClick={() => setDomainHelp(null)}>
          <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-2 flex items-start justify-between">
              <h3 className="text-base font-semibold text-slate-800">{domainHelp === "purchase" ? "Purchase a domain" : "Connect an existing domain"}</h3>
              <button onClick={() => setDomainHelp(null)} className="rounded p-1 text-slate-400 hover:bg-slate-100">✕</button>
            </div>
            {domainHelp === "purchase" ? (
              <div className="space-y-2 text-sm text-slate-600">
                <p>Don't have a domain yet? You can buy one from any registrar (e.g. Namecheap, GoDaddy, Google Domains), then come back and <b>connect</b> it here.</p>
                <p className="text-xs text-slate-400">In-app domain purchase is coming soon — for now, buy at a registrar and connect it below.</p>
              </div>
            ) : (
              <div className="space-y-2 text-sm text-slate-600">
                <p>To connect a domain you already own:</p>
                <ol className="ml-4 list-decimal space-y-1 text-sm">
                  <li>Type your domain in the <b>Domain</b> field and save.</li>
                  <li>At your registrar, add a <b>CNAME</b> (or A) record pointing your domain to our hosting.</li>
                  <li>We'll verify it automatically — your site goes live on that domain once verified.</li>
                </ol>
                <p className="text-xs text-slate-400">Verification/hosting connection isn't active yet — the domain is saved for setup.</p>
              </div>
            )}
            <div className="mt-4 flex justify-end">
              <button onClick={() => setDomainHelp(null)} className="rounded-lg bg-[#1e3a8a] px-4 py-2 text-sm font-medium text-white">Got it</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
