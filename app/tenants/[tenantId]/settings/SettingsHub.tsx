"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import {
  listSocialAccounts, getOAuthStartUrl, disconnectSocialAccount, refreshSocialToken,
  type SocialProviderStatus, type SocialAccountView,
} from "./social-actions";
import { listIntegrations, getTenantSettings, setTenantSetting, type IntegrationView } from "./integrations-actions";

const inp = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#1e3a8a] focus:outline-none";

/** Display metadata for the social providers (label + brand accent + glyph). */
const SOCIAL_META: Record<string, { label: string; accent: string; glyph: string }> = {
  facebook: { label: "Facebook", accent: "#1877F2", glyph: "f" },
  instagram: { label: "Instagram", accent: "#E1306C", glyph: "◉" },
  linkedin: { label: "LinkedIn", accent: "#0A66C2", glyph: "in" },
  tiktok: { label: "TikTok", accent: "#000000", glyph: "♪" },
  youtube: { label: "YouTube", accent: "#FF0000", glyph: "▶" },
  x: { label: "X", accent: "#111111", glyph: "𝕏" },
};

const CORE_PROVIDERS = [
  { provider: "twilio", label: "Twilio", desc: "SMS / voice — texts, calls, and notifications.", accent: "#F22F46" },
  { provider: "shopify", label: "Shopify", desc: "Sync products and orders from your store.", accent: "#95BF47" },
  { provider: "stripe", label: "Stripe", desc: "Accept card payments and subscriptions.", accent: "#635BFF" },
  { provider: "paypal", label: "PayPal", desc: "Accept PayPal and card payments.", accent: "#003087" },
];

type Tab = "integrations" | "preferences";

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    connected: "bg-emerald-100 text-emerald-700",
    pending: "bg-amber-100 text-amber-700",
    pending_reconnect: "bg-amber-100 text-amber-700",
    expired: "bg-amber-100 text-amber-700",
    error: "bg-red-100 text-red-700",
    disconnected: "bg-slate-100 text-slate-500",
    revoked: "bg-slate-100 text-slate-500",
  };
  return <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${map[status] ?? "bg-slate-100 text-slate-500"}`}>{status.replace(/_/g, " ")}</span>;
}

function Initial({ name, accent }: { name?: string | null; accent: string }) {
  return <span className="grid h-8 w-8 flex-none place-items-center rounded-full text-[12px] font-bold text-white" style={{ background: accent }}>{(name?.[0] ?? "?").toUpperCase()}</span>;
}

export default function SettingsHub({ tenantId, isAdmin }: { tenantId: string; isAdmin: boolean }) {
  const [tab, setTab] = useState<Tab>("integrations");
  const [social, setSocial] = useState<SocialProviderStatus[] | null>(null);
  const [core, setCore] = useState<IntegrationView[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [s, ints] = await Promise.all([listSocialAccounts(tenantId), listIntegrations(tenantId)]);
    setSocial(s); setCore(ints);
  }, [tenantId]);

  useEffect(() => { load().catch((e) => setError(e?.message ?? "Could not load settings.")); }, [load]);

  // Reflect the OAuth callback result (redirect carries ?connected=&n= or ?error=&provider=).
  const params = useSearchParams();
  useEffect(() => {
    const connected = params.get("connected");
    const cbError = params.get("error");
    if (connected) setNotice(`Connected ${SOCIAL_META[connected]?.label ?? connected}${params.get("n") ? ` — ${params.get("n")} account(s)` : ""}.`);
    else if (cbError) setError(`Couldn't connect ${params.get("provider") ?? ""}: ${cbError.replace(/_/g, " ")}`);
  }, [params]);

  const connect = async (provider: string) => {
    setBusy(provider); setError(null); setNotice(null);
    const r = await getOAuthStartUrl(tenantId, provider);
    setBusy(null);
    if (!r.ok || !r.url) { setError(r.message ?? "Could not start connection."); return; }
    window.open(r.url, "_blank", "noopener,noreferrer");
    setNotice(`Opened ${SOCIAL_META[provider]?.label ?? provider} authorization in a new tab. Finish there, then refresh this page.`);
  };
  const disconnect = async (accountId: string) => {
    setBusy(accountId); setError(null);
    const r = await disconnectSocialAccount(tenantId, accountId);
    setBusy(null);
    if (!r.ok) { setError(r.message ?? "Could not disconnect."); return; }
    await load();
  };
  const refresh = async (accountId: string) => {
    setBusy(accountId); setError(null);
    const r = await refreshSocialToken(tenantId, accountId);
    setBusy(null);
    if (!r.ok) { setError(r.message ?? "Could not refresh."); return; }
    await load();
  };

  return (
    <div className="max-w-4xl">
      <div className="mb-1 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">Settings</h1>
        {!isAdmin && <span className="rounded bg-slate-100 px-2 py-1 text-[11px] text-slate-500">View only — admin required to change connections</span>}
      </div>
      <p className="mb-5 text-sm text-slate-500">Connections here are shared across all your sites, automations, and CRM. A website's own domain &amp; email live in that website's settings.</p>

      <div className="mb-6 flex gap-1 border-b border-slate-200">
        {([["integrations", "Integrations"], ["preferences", "Preferences"]] as [Tab, string][]).map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition ${tab === k ? "border-[#1e3a8a] text-[#1e3a8a]" : "border-transparent text-slate-500 hover:text-slate-700"}`}>{label}</button>
        ))}
      </div>

      {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      {notice && <div className="mb-4 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-700">{notice}</div>}

      {tab === "integrations" && (
        <div className="space-y-8">
          {/* Social */}
          <section>
            <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-slate-500">Social accounts</h2>
            <p className="mb-3 text-xs text-slate-400">Connect pages, channels, and profiles once — reuse them everywhere.</p>
            {social === null ? (
              <div className="py-8 text-center text-sm text-slate-400">Loading…</div>
            ) : (
              <div className="space-y-3">
                {social.map((p) => {
                  const meta = SOCIAL_META[p.provider] ?? { label: p.provider, accent: "#64748b", glyph: "?" };
                  return (
                    <div key={p.provider} className="rounded-xl border border-slate-200 bg-white p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <span className="grid h-9 w-9 place-items-center rounded-lg text-sm font-bold text-white" style={{ background: meta.accent }}>{meta.glyph}</span>
                          <div>
                            <div className="text-sm font-semibold text-slate-800">{meta.label}</div>
                            <div className="text-xs text-slate-400">{p.accounts.length ? `${p.accounts.length} connected` : p.ready ? "Not connected" : "Not configured yet"}</div>
                          </div>
                        </div>
                        <button type="button" disabled={!isAdmin || !p.ready || busy === p.provider}
                          onClick={() => connect(p.provider)}
                          title={!p.ready ? "Add this provider's OAuth app credentials to enable" : undefined}
                          className="flex-none rounded-lg border border-[#1e3a8a] px-3 py-1.5 text-sm font-medium text-[#1e3a8a] hover:bg-[#1e3a8a]/5 disabled:cursor-not-allowed disabled:opacity-40">
                          {busy === p.provider ? "…" : p.accounts.length ? "Add account" : "Connect"}
                        </button>
                      </div>

                      {p.accounts.length > 0 && (
                        <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
                          {p.accounts.map((a: SocialAccountView) => (
                            <div key={a.id} className="flex items-center justify-between gap-3">
                              <div className="flex min-w-0 items-center gap-2">
                                {a.avatar_url ? <img src={a.avatar_url} alt="" className="h-8 w-8 flex-none rounded-full object-cover" /> : <Initial name={a.account_name} accent={meta.accent} />}
                                <div className="min-w-0">
                                  <div className="truncate text-sm font-medium text-slate-700">{a.account_name ?? a.external_id}</div>
                                  <div className="flex items-center gap-2 text-xs text-slate-400">
                                    {a.account_username && <span className="truncate">@{a.account_username}</span>}
                                    {a.account_type && <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] uppercase text-slate-500">{a.account_type.replace(/_/g, " ")}</span>}
                                    <StatusPill status={a.status} />
                                  </div>
                                </div>
                              </div>
                              {isAdmin && (
                                <div className="flex flex-none items-center gap-2">
                                  <button type="button" disabled={busy === a.id} onClick={() => refresh(a.id)}
                                    className="rounded-md px-2 py-1 text-xs text-slate-500 hover:bg-slate-100 disabled:opacity-40">Refresh</button>
                                  <button type="button" disabled={busy === a.id} onClick={() => disconnect(a.id)}
                                    className="rounded-md px-2 py-1 text-xs text-red-500 hover:bg-red-50 disabled:opacity-40">Disconnect</button>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Core integrations — backends land next; show the connection surface now. */}
          <section>
            <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-slate-500">Messaging &amp; commerce</h2>
            <p className="mb-3 text-xs text-slate-400">Twilio, Shopify, and payment gateways.</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {CORE_PROVIDERS.map((c) => {
                const existing = core.find((i) => i.provider === c.provider);
                const status = existing?.status ?? "disconnected";
                return (
                  <div key={c.provider} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4">
                    <div className="flex items-center gap-3">
                      <span className="grid h-9 w-9 place-items-center rounded-lg text-sm font-bold text-white" style={{ background: c.accent }}>{c.label[0]}</span>
                      <div>
                        <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">{c.label}<StatusPill status={status} /></div>
                        <div className="text-xs text-slate-400">{c.desc}</div>
                      </div>
                    </div>
                    <span className="flex-none rounded-md bg-slate-100 px-2 py-1 text-[10px] font-semibold uppercase text-slate-400">soon</span>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      )}

      {tab === "preferences" && <Preferences tenantId={tenantId} isAdmin={isAdmin} />}
    </div>
  );
}

function Preferences({ tenantId, isAdmin }: { tenantId: string; isAdmin: boolean }) {
  const [tz, setTz] = useState("");
  const [currency, setCurrency] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    getTenantSettings(tenantId).then((s) => {
      setTz(typeof s.default_timezone === "string" ? s.default_timezone : "");
      setCurrency(typeof s.currency === "string" ? s.currency : "");
      setLoaded(true);
    }).catch(() => setLoaded(true));
  }, [tenantId]);

  const save = async (key: string, value: string) => {
    try { await setTenantSetting(tenantId, key, value); setSavedAt(Date.now()); } catch { /* gated */ }
  };

  if (!loaded) return <div className="py-8 text-center text-sm text-slate-400">Loading…</div>;
  return (
    <div className="max-w-md space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-700">Business preferences</h2>
        {savedAt && <span className="text-xs text-emerald-600">Saved ✓</span>}
      </div>
      <label className="flex flex-col gap-1"><span className="text-xs font-medium text-slate-600">Default timezone</span>
        <input className={inp} disabled={!isAdmin} placeholder="America/Toronto" value={tz} onChange={(e) => setTz(e.target.value)} onBlur={() => save("default_timezone", tz)} /></label>
      <label className="flex flex-col gap-1"><span className="text-xs font-medium text-slate-600">Currency</span>
        <input className={inp} disabled={!isAdmin} placeholder="CAD" value={currency} onChange={(e) => setCurrency(e.target.value)} onBlur={() => save("currency", currency)} /></label>
      <p className="text-xs text-slate-400">Brand colors, fonts, and backgrounds are set per website in that website's editor (Brand panel).</p>
    </div>
  );
}
