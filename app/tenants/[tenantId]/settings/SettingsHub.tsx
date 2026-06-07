"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import {
  listSocialAccounts, getOAuthStartUrl, disconnectSocialAccount, refreshSocialToken,
  type SocialProviderStatus, type SocialAccountView,
} from "./social-actions";
import { listIntegrations, getTenantSettings, setTenantSetting, type IntegrationView } from "./integrations-actions";
import { getTwilioSettings, saveTwilioSettings, testTwilio, disconnectTwilio, type TwilioSettingsView } from "./twilio-actions";
import { listShopifyStores, getShopifyStartUrl, disconnectShopifyStore, type ShopifyStoreView } from "./shopify-actions";

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
    if (params.get("tab") === "preferences") setTab("preferences");
    const connected = params.get("connected");
    const cbError = params.get("error");
    if (connected === "shopify") setNotice(`Connected Shopify${params.get("shop") ? ` — ${params.get("shop")}` : ""}.`);
    else if (connected) setNotice(`Connected ${SOCIAL_META[connected]?.label ?? connected}${params.get("n") ? ` — ${params.get("n")} account(s)` : ""}.`);
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
            <div className="mb-3 space-y-3"><TwilioCard tenantId={tenantId} isAdmin={isAdmin} /><ShopifyCard tenantId={tenantId} isAdmin={isAdmin} /></div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {CORE_PROVIDERS.filter((c) => c.provider !== "twilio" && c.provider !== "shopify").map((c) => {
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

/** Small inline helper-text with an optional external link — our standard for integration forms. */
function Tip({ children }: { children: React.ReactNode }) {
  return <p className="text-[11px] leading-relaxed text-slate-400">{children}</p>;
}
function Ext({ href, children }: { href: string; children: React.ReactNode }) {
  return <a href={href} target="_blank" rel="noopener noreferrer" className="font-medium text-[#1e3a8a] hover:underline">{children} ↗</a>;
}

function TwilioCard({ tenantId, isAdmin }: { tenantId: string; isAdmin: boolean }) {
  const [s, setS] = useState<TwilioSettingsView | null>(null);
  const [open, setOpen] = useState(false);
  const [sid, setSid] = useState("");
  const [token, setToken] = useState("");
  const [msSid, setMsSid] = useState("");
  const [from, setFrom] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async () => {
    const v = await getTwilioSettings(tenantId);
    setS(v); setSid(v.account_sid); setMsSid(v.messaging_service_sid); setFrom(v.from_number);
  }, [tenantId]);
  useEffect(() => { load().catch(() => {}); }, [load]);

  const save = async () => {
    setBusy("save"); setMsg(null);
    const r = await saveTwilioSettings(tenantId, { account_sid: sid, auth_token: token || undefined, messaging_service_sid: msSid, from_number: from });
    setBusy(null);
    setMsg({ ok: r.ok, text: r.ok ? "Connected ✓ — credentials verified with Twilio." : (r.message ?? "Could not save.") });
    setToken("");
    await load();
  };
  const test = async () => { setBusy("test"); const r = await testTwilio(tenantId); setBusy(null); setMsg({ ok: r.ok, text: r.message ?? (r.ok ? "Connected." : "Failed.") }); await load(); };
  const disconnect = async () => { setBusy("disc"); const r = await disconnectTwilio(tenantId); setBusy(null); if (r.ok) { setMsg({ ok: true, text: "Disconnected." }); setToken(""); await load(); } };

  const status = s?.status ?? "disconnected";
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-lg text-sm font-bold text-white" style={{ background: "#F22F46" }}>T</span>
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">Twilio<StatusPill status={status} /></div>
            <div className="text-xs text-slate-400">SMS &amp; voice — texts, calls, and follow-up reminders.</div>
          </div>
        </div>
        <button type="button" onClick={() => setOpen((o) => !o)} className="flex-none rounded-lg border border-[#1e3a8a] px-3 py-1.5 text-sm font-medium text-[#1e3a8a] hover:bg-[#1e3a8a]/5">
          {open ? "Close" : s?.hasSecret ? "Manage" : "Connect"}
        </button>
      </div>

      {open && (
        <div className="mt-3 space-y-3 border-t border-slate-100 pt-3">
          <div className="rounded-lg bg-sky-50 p-3">
            <Tip>
              <b className="text-slate-600">Where to find these:</b> open your <Ext href="https://console.twilio.com">Twilio Console</Ext>. The <b>Account SID</b> and <b>Auth Token</b> are on the dashboard home. A <b>Messaging Service SID</b> (recommended) is under Messaging → Services.
            </Tip>
          </div>

          <label className="flex flex-col gap-1"><span className="text-xs font-medium text-slate-600">Account SID</span>
            <input className={inp} disabled={!isAdmin} value={sid} onChange={(e) => setSid(e.target.value.trim())} placeholder="AC…" />
            <Tip>Starts with <code>AC</code>, ~34 characters.</Tip>
          </label>

          <label className="flex flex-col gap-1"><span className="text-xs font-medium text-slate-600">Auth Token {s?.hasSecret && <span className="text-emerald-600">· stored ✓</span>}</span>
            <input className={inp} type="password" disabled={!isAdmin} value={token} onChange={(e) => setToken(e.target.value)} placeholder={s?.hasSecret ? "•••••••• (leave blank to keep)" : "your auth token"} />
            <Tip>Stored encrypted — never shown again. Rotate it anytime in the <Ext href="https://console.twilio.com">console</Ext>.</Tip>
          </label>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1"><span className="text-xs font-medium text-slate-600">Messaging Service SID <span className="font-normal text-slate-400">(recommended)</span></span>
              <input className={inp} disabled={!isAdmin} value={msSid} onChange={(e) => setMsSid(e.target.value.trim())} placeholder="MG…" />
            </label>
            <label className="flex flex-col gap-1"><span className="text-xs font-medium text-slate-600">From number <span className="font-normal text-slate-400">(if no service)</span></span>
              <input className={inp} disabled={!isAdmin} value={from} onChange={(e) => setFrom(e.target.value.trim())} placeholder="+14165551234" />
            </label>
          </div>
          <Tip>
            Prefer a <b>Messaging Service</b> — it handles sender rotation and is required for <Ext href="https://www.twilio.com/docs/messaging/compliance/a2p-10dlc">A2P 10DLC</Ext> when texting US numbers. Otherwise we&apos;ll send from your number (must be E.164, e.g. <code>+14165551234</code>).
          </Tip>

          {msg && <div className={`rounded-lg px-3 py-2 text-sm ${msg.ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>{msg.text}</div>}

          {isAdmin ? (
            <div className="flex flex-wrap gap-2">
              <button type="button" disabled={!sid || busy === "save"} onClick={save} className="rounded-lg bg-[#1e3a8a] px-4 py-2 text-sm font-medium text-white disabled:opacity-40">{busy === "save" ? "Verifying…" : "Save & verify"}</button>
              {s?.hasSecret && <button type="button" disabled={busy === "test"} onClick={test} className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-40">{busy === "test" ? "Testing…" : "Test connection"}</button>}
              {s?.hasSecret && <button type="button" disabled={busy === "disc"} onClick={disconnect} className="rounded-lg px-3 py-2 text-sm text-red-500 hover:bg-red-50 disabled:opacity-40">Disconnect</button>}
            </div>
          ) : <Tip>Admin required to change Twilio credentials.</Tip>}
        </div>
      )}
    </div>
  );
}

function ShopifyCard({ tenantId, isAdmin }: { tenantId: string; isAdmin: boolean }) {
  const [stores, setStores] = useState<ShopifyStoreView[] | null>(null);
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  const [shop, setShop] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async () => {
    const r = await listShopifyStores(tenantId);
    setStores(r.stores); setReady(r.ready);
  }, [tenantId]);
  useEffect(() => { load().catch(() => {}); }, [load]);

  const connect = async () => {
    setBusy("connect"); setMsg(null);
    const r = await getShopifyStartUrl(tenantId, shop);
    setBusy(null);
    if (!r.ok || !r.url) { setMsg({ ok: false, text: r.message ?? "Could not start." }); return; }
    window.open(r.url, "_blank", "noopener,noreferrer");
    setMsg({ ok: true, text: "Opened Shopify authorization in a new tab. Approve there, then refresh this page." });
  };
  const disconnect = async (id: string) => {
    setBusy(id);
    const r = await disconnectShopifyStore(tenantId, id);
    setBusy(null);
    if (!r.ok) setMsg({ ok: false, text: r.message ?? "Could not disconnect." });
    await load();
  };

  const count = stores?.length ?? 0;
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-lg text-sm font-bold text-white" style={{ background: "#95BF47" }}>S</span>
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">Shopify<StatusPill status={count ? "connected" : "disconnected"} /></div>
            <div className="text-xs text-slate-400">{count ? `${count} store(s) connected` : ready ? "Sync products & orders from your store(s)." : "Not configured yet"}</div>
          </div>
        </div>
        <button type="button" onClick={() => setOpen((o) => !o)} className="flex-none rounded-lg border border-[#1e3a8a] px-3 py-1.5 text-sm font-medium text-[#1e3a8a] hover:bg-[#1e3a8a]/5">{open ? "Close" : count ? "Manage" : "Connect"}</button>
      </div>

      {open && (
        <div className="mt-3 space-y-3 border-t border-slate-100 pt-3">
          <div className="rounded-lg bg-emerald-50 p-3">
            <Tip><b className="text-slate-600">Connect a store:</b> enter your shop&apos;s <code>.myshopify.com</code> address (find it in your <Ext href="https://www.shopify.com/login">Shopify admin</Ext> under Settings → Domains). You approve permissions on Shopify — we only store a secure access token. You can connect several stores.</Tip>
          </div>

          {count > 0 && (
            <div className="space-y-2">
              {stores!.map((s) => (
                <div key={s.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-sm font-medium text-slate-700"><span className="truncate">{s.shop_name ?? s.shop_domain}</span><StatusPill status={s.status} /></div>
                    <div className="text-[11px] text-slate-400">{s.shop_domain}{s.plan_name ? ` · ${s.plan_name}` : ""}</div>
                  </div>
                  {isAdmin && <button type="button" disabled={busy === s.id} onClick={() => disconnect(s.id)} className="flex-none rounded-md px-2 py-1 text-xs text-red-500 hover:bg-red-50 disabled:opacity-40">Disconnect</button>}
                </div>
              ))}
            </div>
          )}

          {isAdmin ? (
            <div className="flex items-stretch gap-2">
              <input className={inp} value={shop} onChange={(e) => setShop(e.target.value.trim())} placeholder="mystore.myshopify.com" />
              <button type="button" disabled={!shop || !ready || busy === "connect"} onClick={connect} title={!ready ? "Add the Shopify app API key + secret to enable" : undefined}
                className="flex-none rounded-lg bg-[#1e3a8a] px-4 text-sm font-medium text-white disabled:opacity-40">{busy === "connect" ? "…" : count ? "Add store" : "Connect"}</button>
            </div>
          ) : <Tip>Admin required to connect a store.</Tip>}
          <Tip>We request read access to products, orders, and shop info. No data is synced or imported automatically — that&apos;s a later, opt-in step.</Tip>

          {msg && <div className={`rounded-lg px-3 py-2 text-sm ${msg.ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>{msg.text}</div>}
        </div>
      )}
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
