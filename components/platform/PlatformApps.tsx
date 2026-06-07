"use client";

import { useState } from "react";
import { savePlatformApp, deletePlatformApp, type PlatformAppView } from "@/app/platform/platform-apps-actions";

/**
 * Superadmin form to enter platform OAuth-app credentials in-app (stored encrypted under the system
 * tenant). Equivalent to setting the env vars, no restart. Secret fields are write-only.
 */
const CALLBACK: Record<string, string> = {
  facebook_platform_app: "/api/social/callback/facebook (and /instagram)",
  linkedin_platform_app: "/api/social/callback/linkedin",
  youtube_platform_app: "/api/social/callback/youtube",
  tiktok_platform_app: "/api/social/callback/tiktok",
  x_platform_app: "/api/social/callback/x",
  shopify_platform_app: "/api/shopify/callback",
  google_calendar_platform_app: "/api/calendar/google/callback",
  microsoft_calendar_platform_app: "/api/calendar/microsoft/callback",
};
const DOCS: Record<string, string> = {
  facebook_platform_app: "https://developers.facebook.com/apps",
  linkedin_platform_app: "https://www.linkedin.com/developers/apps",
  youtube_platform_app: "https://console.cloud.google.com/apis/credentials",
  tiktok_platform_app: "https://developers.tiktok.com",
  x_platform_app: "https://developer.x.com",
  shopify_platform_app: "https://partners.shopify.com",
  stripe_identity_platform_app: "https://dashboard.stripe.com/identity",
  google_calendar_platform_app: "https://console.cloud.google.com/apis/credentials",
  microsoft_calendar_platform_app: "https://entra.microsoft.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade",
  cloudflare_platform: "https://dash.cloudflare.com/profile/api-tokens",
};
// Webhook (not OAuth callback) endpoints to register in the provider's dashboard.
const WEBHOOK: Record<string, string> = {
  stripe_identity_platform_app: "/api/kyc/webhook/stripe",
};

const inp = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#1e3a8a] focus:outline-none";

function AppCard({ app, base }: { app: PlatformAppView; base: string }) {
  const [vals, setVals] = useState<Record<string, string>>(() => ({ ...app.values }));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [open, setOpen] = useState(false);

  const save = async () => {
    setBusy(true); setMsg(null);
    const r = await savePlatformApp(app.key, vals);
    setBusy(false);
    setMsg({ ok: r.ok, text: r.ok ? "Saved ✓ — connections for this provider are now enabled." : (r.message ?? "Failed.") });
    // clear secret inputs after save
    setVals((v) => { const n = { ...v }; for (const f of app.fields) if (f.secret) n[f.name] = ""; return n; });
  };
  const remove = async () => { setBusy(true); await deletePlatformApp(app.key); setBusy(false); setMsg({ ok: true, text: "Removed." }); };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-800">{app.label}</span>
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${app.hasSecret ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{app.hasSecret ? "configured" : "not set"}</span>
        </div>
        <button onClick={() => setOpen((o) => !o)} className="rounded-lg border border-[#1e3a8a] px-3 py-1.5 text-sm font-medium text-[#1e3a8a] hover:bg-[#1e3a8a]/5">{open ? "Close" : app.hasSecret ? "Manage" : "Set up"}</button>
      </div>

      {open && (
        <div className="mt-3 space-y-3 border-t border-slate-100 pt-3">
          {DOCS[app.key] && <p className="text-[11px] text-slate-400">Get credentials: <a href={DOCS[app.key]} target="_blank" rel="noopener noreferrer" className="font-medium text-[#1e3a8a] hover:underline">{app.label} developer console ↗</a></p>}
          {CALLBACK[app.key] && (
            <div className="rounded-lg bg-sky-50 p-2 text-[11px] text-slate-500">
              <b className="text-slate-600">Redirect / callback URL</b> to register in the provider app:<br />
              <code className="break-all text-slate-700">{base}{CALLBACK[app.key]}</code>
            </div>
          )}
          {WEBHOOK[app.key] && (
            <div className="rounded-lg bg-amber-50 p-2 text-[11px] text-slate-500">
              <b className="text-slate-600">Webhook endpoint</b> to register (send identity events here):<br />
              <code className="break-all text-slate-700">{base}{WEBHOOK[app.key]}</code>
            </div>
          )}
          {app.fields.map((f) => (
            <label key={f.name} className="flex flex-col gap-1">
              <span className="text-xs font-medium text-slate-600">{f.label}{f.secret && app.hasSecret && <span className="text-emerald-600"> · stored ✓</span>}</span>
              <input className={inp} type={f.secret ? "password" : "text"} value={vals[f.name] ?? ""} placeholder={f.secret && app.hasSecret ? "•••••••• (leave blank to keep)" : ""}
                onChange={(e) => setVals((v) => ({ ...v, [f.name]: e.target.value }))} />
            </label>
          ))}
          {msg && <div className={`rounded-lg px-3 py-2 text-sm ${msg.ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>{msg.text}</div>}
          <div className="flex gap-2">
            <button disabled={busy} onClick={save} className="rounded-lg bg-[#1e3a8a] px-4 py-2 text-sm font-medium text-white disabled:opacity-40">{busy ? "Saving…" : "Save"}</button>
            {app.hasSecret && <button disabled={busy} onClick={remove} className="rounded-lg px-3 py-2 text-sm text-red-500 hover:bg-red-50 disabled:opacity-40">Remove</button>}
          </div>
        </div>
      )}
    </div>
  );
}

export default function PlatformApps({ apps, baseUrl }: { apps: PlatformAppView[]; baseUrl: string }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {apps.map((a) => <AppCard key={a.key} app={a} base={baseUrl} />)}
    </div>
  );
}
