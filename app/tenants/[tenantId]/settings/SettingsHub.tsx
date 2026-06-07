"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import {
  listSocialAccounts, getOAuthStartUrl, disconnectSocialAccount, refreshSocialToken,
  type SocialProviderStatus, type SocialAccountView,
} from "./social-actions";
import { getTenantSettings, setTenantSetting } from "./integrations-actions";
import { getTwilioSettings, saveTwilioSettings, testTwilio, disconnectTwilio, type TwilioSettingsView } from "./twilio-actions";
import { listShopifyStores, getShopifyStartUrl, disconnectShopifyStore, type ShopifyStoreView } from "./shopify-actions";
import { getPaymentsSettings, saveStripe, savePaypal, testPayments, disconnectPayment, type PaymentsView } from "./payments-actions";
import { getKycView, startKycVerification, type KycView } from "./kyc-actions";

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

type Tab = "integrations" | "verification" | "preferences";

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
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setSocial(await listSocialAccounts(tenantId));
  }, [tenantId]);

  useEffect(() => { load().catch((e) => setError(e?.message ?? "Could not load settings.")); }, [load]);

  // Reflect the OAuth callback result (redirect carries ?connected=&n= or ?error=&provider=).
  const params = useSearchParams();
  useEffect(() => {
    const t = params.get("tab");
    if (t === "preferences" || t === "verification") setTab(t);
    if (params.get("kyc") === "returned") setNotice("Thanks — your verification was submitted. We'll update the status here once it's reviewed.");
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
        {([["integrations", "Integrations"], ["verification", "Verification"], ["preferences", "Preferences"]] as [Tab, string][]).map(([k, label]) => (
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
            <div className="space-y-3"><TwilioCard tenantId={tenantId} isAdmin={isAdmin} /><ShopifyCard tenantId={tenantId} isAdmin={isAdmin} /></div>
          </section>

          {/* Payments */}
          <section>
            <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-slate-500">Payments</h2>
            <p className="mb-3 text-xs text-slate-400">Connect a gateway to accept payments. We only verify your keys here — no charges are ever made from this screen.</p>
            <PaymentsCards tenantId={tenantId} isAdmin={isAdmin} />
          </section>
        </div>
      )}

      {tab === "verification" && <VerificationCard tenantId={tenantId} isAdmin={isAdmin} />}

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

function PaymentsCards({ tenantId, isAdmin }: { tenantId: string; isAdmin: boolean }) {
  const [v, setV] = useState<PaymentsView | null>(null);
  const [open, setOpen] = useState<"stripe" | "paypal" | null>(null);
  const [sk, setSk] = useState(""); const [pk, setPk] = useState("");
  const [ppId, setPpId] = useState(""); const [ppSecret, setPpSecret] = useState(""); const [ppEnv, setPpEnv] = useState<"live" | "sandbox">("sandbox");
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async () => {
    const r = await getPaymentsSettings(tenantId);
    setV(r); setPk(r.stripe.config.publishable_key ?? ""); setPpEnv(r.paypal.config.environment === "live" ? "live" : "sandbox");
  }, [tenantId]);
  useEffect(() => { load().catch(() => {}); }, [load]);

  const doStripe = async () => { setBusy("stripe"); setMsg(null); const r = await saveStripe(tenantId, { secret_key: sk || undefined, publishable_key: pk }); setBusy(null); setMsg({ ok: r.ok, text: r.ok ? `Verified ✓ ${r.livemode ? "(LIVE mode)" : "(test mode)"}` : (r.message ?? "Failed.") }); setSk(""); await load(); };
  const doPaypal = async () => { setBusy("paypal"); setMsg(null); const r = await savePaypal(tenantId, { client_id: ppId || (v?.paypal.config.client_id ?? ""), client_secret: ppSecret || undefined, environment: ppEnv }); setBusy(null); setMsg({ ok: r.ok, text: r.ok ? "Verified ✓" : (r.message ?? "Failed.") }); setPpSecret(""); await load(); };
  const test = async (p: "stripe" | "paypal") => { setBusy(p); const r = await testPayments(tenantId, p); setBusy(null); setMsg({ ok: r.ok, text: r.message ?? "" }); await load(); };
  const disc = async (p: "stripe" | "paypal") => { setBusy(p); const r = await disconnectPayment(tenantId, p); setBusy(null); if (r.ok) { setMsg({ ok: true, text: "Disconnected." }); if (p === "stripe") setSk(""); else setPpSecret(""); await load(); } };

  if (!v) return <div className="py-4 text-center text-sm text-slate-400">Loading…</div>;
  const live = v.stripe.config.livemode;

  return (
    <div className="space-y-3">
      {/* Stripe */}
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-lg text-sm font-bold text-white" style={{ background: "#635BFF" }}>S</span>
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">Stripe<StatusPill status={v.stripe.status} />{v.stripe.hasSecret && <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${live ? "bg-rose-100 text-rose-700" : "bg-slate-100 text-slate-500"}`}>{live ? "live" : "test"}</span>}</div>
              <div className="text-xs text-slate-400">Cards &amp; subscriptions. We only verify your keys here.</div>
            </div>
          </div>
          <button type="button" onClick={() => setOpen(open === "stripe" ? null : "stripe")} className="flex-none rounded-lg border border-[#1e3a8a] px-3 py-1.5 text-sm font-medium text-[#1e3a8a] hover:bg-[#1e3a8a]/5">{open === "stripe" ? "Close" : v.stripe.hasSecret ? "Manage" : "Connect"}</button>
        </div>
        {open === "stripe" && (
          <div className="mt-3 space-y-3 border-t border-slate-100 pt-3">
            <div className="rounded-lg bg-indigo-50 p-3"><Tip><b className="text-slate-600">Where to find these:</b> in your <Ext href="https://dashboard.stripe.com/apikeys">Stripe Dashboard → Developers → API keys</Ext>. Tip: create a <b>restricted key</b> with read access only — safest for verification.</Tip></div>
            <label className="flex flex-col gap-1"><span className="text-xs font-medium text-slate-600">Secret key {v.stripe.hasSecret && <span className="text-emerald-600">· stored ✓</span>}</span>
              <input className={inp} type="password" disabled={!isAdmin} value={sk} onChange={(e) => setSk(e.target.value.trim())} placeholder={v.stripe.hasSecret ? "•••••••• (leave blank to keep)" : "sk_live_… / sk_test_… / rk_…"} />
              <Tip>Encrypted at rest. <code>sk_live_</code> = real charges later; <code>sk_test_</code> = test mode. We never charge from this screen.</Tip>
            </label>
            <label className="flex flex-col gap-1"><span className="text-xs font-medium text-slate-600">Publishable key</span>
              <input className={inp} disabled={!isAdmin} value={pk} onChange={(e) => setPk(e.target.value.trim())} placeholder="pk_live_… / pk_test_…" /></label>
            {msg && open === "stripe" && <div className={`rounded-lg px-3 py-2 text-sm ${msg.ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>{msg.text}</div>}
            {isAdmin && (
              <div className="flex flex-wrap gap-2">
                <button type="button" disabled={busy === "stripe"} onClick={doStripe} className="rounded-lg bg-[#1e3a8a] px-4 py-2 text-sm font-medium text-white disabled:opacity-40">{busy === "stripe" ? "Verifying…" : "Save & verify"}</button>
                {v.stripe.hasSecret && <button type="button" disabled={busy === "stripe"} onClick={() => test("stripe")} className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-40">Test</button>}
                {v.stripe.hasSecret && <button type="button" disabled={busy === "stripe"} onClick={() => disc("stripe")} className="rounded-lg px-3 py-2 text-sm text-red-500 hover:bg-red-50 disabled:opacity-40">Disconnect</button>}
              </div>
            )}
          </div>
        )}
      </div>

      {/* PayPal */}
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-lg text-sm font-bold text-white" style={{ background: "#003087" }}>P</span>
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">PayPal<StatusPill status={v.paypal.status} />{v.paypal.hasSecret && <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-slate-500">{v.paypal.config.environment ?? "sandbox"}</span>}</div>
              <div className="text-xs text-slate-400">PayPal &amp; card payments. Verify-only here.</div>
            </div>
          </div>
          <button type="button" onClick={() => setOpen(open === "paypal" ? null : "paypal")} className="flex-none rounded-lg border border-[#1e3a8a] px-3 py-1.5 text-sm font-medium text-[#1e3a8a] hover:bg-[#1e3a8a]/5">{open === "paypal" ? "Close" : v.paypal.hasSecret ? "Manage" : "Connect"}</button>
        </div>
        {open === "paypal" && (
          <div className="mt-3 space-y-3 border-t border-slate-100 pt-3">
            <div className="rounded-lg bg-sky-50 p-3"><Tip><b className="text-slate-600">Where to find these:</b> create an app in the <Ext href="https://developer.paypal.com/dashboard/applications">PayPal Developer Dashboard</Ext> to get a Client ID + Secret. Choose Sandbox for testing, Live for production.</Tip></div>
            <label className="flex flex-col gap-1"><span className="text-xs font-medium text-slate-600">Environment</span>
              <select className={inp} disabled={!isAdmin} value={ppEnv} onChange={(e) => setPpEnv(e.target.value as "live" | "sandbox")}><option value="sandbox">Sandbox (testing)</option><option value="live">Live</option></select></label>
            <label className="flex flex-col gap-1"><span className="text-xs font-medium text-slate-600">Client ID</span>
              <input className={inp} disabled={!isAdmin} value={ppId || (v.paypal.config.client_id ?? "")} onChange={(e) => setPpId(e.target.value.trim())} placeholder="Axxxx…" /></label>
            <label className="flex flex-col gap-1"><span className="text-xs font-medium text-slate-600">Secret {v.paypal.hasSecret && <span className="text-emerald-600">· stored ✓</span>}</span>
              <input className={inp} type="password" disabled={!isAdmin} value={ppSecret} onChange={(e) => setPpSecret(e.target.value)} placeholder={v.paypal.hasSecret ? "•••••••• (leave blank to keep)" : "your client secret"} /></label>
            {msg && open === "paypal" && <div className={`rounded-lg px-3 py-2 text-sm ${msg.ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>{msg.text}</div>}
            {isAdmin && (
              <div className="flex flex-wrap gap-2">
                <button type="button" disabled={busy === "paypal"} onClick={doPaypal} className="rounded-lg bg-[#1e3a8a] px-4 py-2 text-sm font-medium text-white disabled:opacity-40">{busy === "paypal" ? "Verifying…" : "Save & verify"}</button>
                {v.paypal.hasSecret && <button type="button" disabled={busy === "paypal"} onClick={() => test("paypal")} className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-40">Test</button>}
                {v.paypal.hasSecret && <button type="button" disabled={busy === "paypal"} onClick={() => disc("paypal")} className="rounded-lg px-3 py-2 text-sm text-red-500 hover:bg-red-50 disabled:opacity-40">Disconnect</button>}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const KYC_UI: Record<string, { label: string; cls: string; note: string }> = {
  none: { label: "Not started", cls: "bg-slate-100 text-slate-500", note: "Verify your business identity to unlock payouts and high-trust features." },
  pending_start: { label: "Not started", cls: "bg-slate-100 text-slate-500", note: "Verify your business identity to unlock payouts and high-trust features." },
  provider_initiated: { label: "In progress", cls: "bg-amber-100 text-amber-700", note: "You started verification but haven't finished. Resume to complete it." },
  provider_in_progress: { label: "Processing", cls: "bg-sky-100 text-sky-700", note: "We're processing your submission. This usually takes a few minutes." },
  provider_verified: { label: "Under review", cls: "bg-amber-100 text-amber-700", note: "Verified by the provider — pending a final review by our team." },
  provider_rejected: { label: "Needs attention", cls: "bg-red-100 text-red-700", note: "The provider couldn't verify your identity. Please try again." },
  provider_failed: { label: "Failed", cls: "bg-red-100 text-red-700", note: "Verification could not be completed. Please try again." },
  platform_approved: { label: "Approved ✓", cls: "bg-emerald-100 text-emerald-700", note: "Your identity is verified and approved. You're all set." },
  platform_rejected: { label: "Declined", cls: "bg-red-100 text-red-700", note: "Verification was declined. Contact support if you believe this is a mistake." },
  platform_overridden: { label: "Reviewed", cls: "bg-violet-100 text-violet-700", note: "Your verification was manually reviewed by our team." },
};

function VerificationCard({ tenantId, isAdmin }: { tenantId: string; isAdmin: boolean }) {
  const [v, setV] = useState<KycView | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async () => { setV(await getKycView(tenantId)); }, [tenantId]);
  useEffect(() => { load().catch(() => {}); }, [load]);

  const start = async () => {
    setBusy(true); setMsg(null);
    const r = await startKycVerification(tenantId);
    setBusy(false);
    if (!r.ok || !r.url) { setMsg({ ok: false, text: r.message ?? "Could not start verification." }); return; }
    window.open(r.url, "_blank", "noopener,noreferrer");
    setMsg({ ok: true, text: "Opened the secure verification in a new tab. Complete it there, then return here." });
  };

  if (!v) return <div className="py-8 text-center text-sm text-slate-400">Loading…</div>;
  const ui = KYC_UI[v.status] ?? KYC_UI.none;
  const canStart = v.status === "none" || v.status === "pending_start" || v.status === "provider_initiated" || v.status === "provider_rejected" || v.status === "provider_failed";

  return (
    <div className="max-w-2xl space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-slate-800">Business identity verification (KYC)</h2>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${ui.cls}`}>{ui.label}</span>
            </div>
            <p className="mt-1 text-sm text-slate-500">{ui.note}</p>
          </div>
        </div>

        <div className="mt-4 rounded-lg bg-sky-50 p-3">
          <Tip>
            <b className="text-slate-600">Your privacy is protected.</b> Verification is handled entirely by our secure provider (<Ext href="https://stripe.com/identity">Stripe Identity</Ext>) on their own hosted pages. We <b>never</b> see or store your ID, passport, or personal documents — only a pass/fail status.
          </Tip>
        </div>

        {msg && <div className={`mt-4 rounded-lg px-3 py-2 text-sm ${msg.ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>{msg.text}</div>}

        {!v.providerReady ? (
          <p className="mt-4 text-xs text-slate-400">Verification isn&apos;t available yet — the platform team is finishing setup.</p>
        ) : !isAdmin ? (
          <p className="mt-4 text-xs text-slate-400">Admin required to start verification.</p>
        ) : canStart ? (
          <button type="button" disabled={busy} onClick={start} className="mt-4 rounded-lg bg-[#1e3a8a] px-4 py-2 text-sm font-medium text-white disabled:opacity-40">
            {busy ? "Starting…" : v.status === "provider_rejected" || v.status === "provider_failed" ? "Try again" : v.status === "provider_initiated" ? "Resume verification" : "Start verification"}
          </button>
        ) : (
          <p className="mt-4 text-xs text-slate-400">No action needed right now{v.updatedAt ? ` · last updated ${new Date(v.updatedAt).toLocaleString()}` : ""}.</p>
        )}
      </div>
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
