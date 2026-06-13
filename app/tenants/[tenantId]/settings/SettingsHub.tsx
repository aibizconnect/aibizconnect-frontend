"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import {
  listSocialAccounts, getOAuthStartUrl, disconnectSocialAccount, refreshSocialToken,
  getWhatsAppNumbers, saveWhatsAppNumber, removeWhatsAppNumberAction,
  type SocialProviderStatus, type SocialAccountView, type WhatsAppNumberView,
} from "./social-actions";
import { getTenantSettings, setTenantSetting } from "./integrations-actions";
import { getTwilioSettings, saveTwilioSettings, testTwilio, disconnectTwilio, type TwilioSettingsView } from "./twilio-actions";
import { listShopifyStores, getShopifyStartUrl, disconnectShopifyStore, type ShopifyStoreView } from "./shopify-actions";
import { getPaymentsSettings, saveStripe, savePaypal, testPayments, disconnectPayment, type PaymentsView } from "./payments-actions";
import { getKycView, startKycVerification, type KycView } from "./kyc-actions";
import { getBusinessProfile, saveBusinessProfile, type BusinessProfile } from "./business-actions";
import { listTags, createTag, updateTag, deleteTag, type TagView } from "./tags-actions";
import { listCustomFields, createCustomField, updateCustomField, deleteCustomField, type CustomFieldView, type CustomObjectType, type CustomFieldType } from "./custom-fields-actions";
import { FIELD_TYPES, TRIGGER_TYPES, TRIGGER_LABELS } from "./option-constants";
import TimezoneSelect from "@/components/design/TimezoneSelect";
import { listCustomValues, createCustomValue, updateCustomValue, deleteCustomValue, type CustomValueView } from "./custom-values-actions";
import { getScoring, createScoringRule, updateScoringRule, deleteScoringRule, setHotThreshold, type ScoringView, type ScoringRuleView, type TriggerType } from "./scoring-actions";
import { listTenantAudit, type TenantAuditEntry } from "./audit-actions";

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

type Tab = "business" | "integrations" | "verification" | "tags" | "fields" | "values" | "scoring" | "audit" | "preferences";

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

/** OAuth/KYC complete in a NEW tab — re-load this section when the user comes back, so
 *  connection status reflects reality without a manual refresh (audit round, B5). */
function useReloadOnFocus(load: () => Promise<unknown>) {
  useEffect(() => {
    const on = () => { load().catch(() => {}); };
    window.addEventListener("focus", on);
    return () => window.removeEventListener("focus", on);
  }, [load]);
}

export default function SettingsHub({ tenantId, isAdmin }: { tenantId: string; isAdmin: boolean }) {
  const [tab, setTab] = useState<Tab>("business");
  const [social, setSocial] = useState<SocialProviderStatus[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setSocial(await listSocialAccounts(tenantId));
  }, [tenantId]);

  useEffect(() => {
    load().catch(async (e) => {
      // Production masks thrown server-action messages — ask the self-diagnosis action
      // (which RETURNS its findings) for the real cause.
      try {
        const { diagnoseSettingsAccess } = await import("./diag-actions");
        const d = await diagnoseSettingsAccess(tenantId);
        setError(`Couldn't load settings. Diagnosis — access: ${d.access}; social load: ${d.socialLoad}; signed-in role: ${d.role ?? "none"}; session token: ${d.hasToken ? "present" : "MISSING"}; enforcement: ${d.enforce ? "on" : "off"}${d.note ? `; ${d.note}` : ""}`);
      } catch {
        setError(e?.message ?? "Could not load settings.");
      }
    });
  }, [load, tenantId]);
  useReloadOnFocus(load);

  // Reflect the OAuth callback result (redirect carries ?connected=&n= or ?error=&provider=).
  const params = useSearchParams();
  useEffect(() => {
    const t = params.get("tab") as Tab | null;
    if (t && ["business", "integrations", "verification", "tags", "fields", "values", "scoring", "audit", "preferences"].includes(t)) setTab(t);
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

      <div className="mb-6 flex flex-wrap gap-1 border-b border-slate-200">
        {([["business", "Business Profile"], ["integrations", "Integrations"], ["verification", "Verification"], ["tags", "Tags"], ["fields", "Custom Fields"], ["values", "Custom Values"], ["scoring", "Lead Scoring"], ["audit", "Audit Log"], ["preferences", "Preferences"]] as [Tab, string][]).map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition ${tab === k ? "border-[#1e3a8a] text-[#1e3a8a]" : "border-transparent text-slate-500 hover:text-slate-700"}`}>{label}</button>
        ))}
      </div>

      {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      {notice && <div className="mb-4 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-700">{notice}</div>}

      {tab === "business" && <BusinessProfileSection tenantId={tenantId} isAdmin={isAdmin} />}

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
            <div className="space-y-3"><TwilioCard tenantId={tenantId} isAdmin={isAdmin} /><WhatsAppCard tenantId={tenantId} isAdmin={isAdmin} /><ShopifyCard tenantId={tenantId} isAdmin={isAdmin} /></div>
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


      {tab === "tags" && <TagsSection tenantId={tenantId} isAdmin={isAdmin} />}

      {tab === "fields" && <CustomFieldsSection tenantId={tenantId} isAdmin={isAdmin} />}

      {tab === "values" && <CustomValuesSection tenantId={tenantId} isAdmin={isAdmin} />}

      {tab === "scoring" && <LeadScoringSection tenantId={tenantId} isAdmin={isAdmin} />}

      {tab === "audit" && <AuditLogSection tenantId={tenantId} />}

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

function WhatsAppCard({ tenantId, isAdmin }: { tenantId: string; isAdmin: boolean }) {
  const [open, setOpen] = useState(false);
  const [numbers, setNumbers] = useState<WhatsAppNumberView[]>([]);
  const [phoneNumberId, setPhoneNumberId] = useState("");
  const [token, setToken] = useState("");
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async () => { setNumbers(await getWhatsAppNumbers(tenantId)); }, [tenantId]);
  useEffect(() => { load().catch(() => {}); }, [load]);

  const save = async () => {
    setBusy("save"); setMsg(null);
    const r = await saveWhatsAppNumber(tenantId, { phoneNumberId, accessToken: token, label });
    setBusy(null);
    setMsg({ ok: r.ok, text: r.ok ? "WhatsApp number connected ✓" : (r.message ?? "Could not save.") });
    if (r.ok) { setToken(""); setPhoneNumberId(""); setLabel(""); await load(); }
  };
  const remove = async (id: string) => { setBusy(id); await removeWhatsAppNumberAction(tenantId, id); setBusy(null); await load(); };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-lg text-sm font-bold text-white" style={{ background: "#25D366" }}>W</span>
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">WhatsApp<StatusPill status={numbers.length ? "connected" : "disconnected"} /></div>
            <div className="text-xs text-slate-400">Two-way WhatsApp in your inbox — Cloud API. {numbers.length ? `${numbers.length} number(s)` : ""}</div>
          </div>
        </div>
        <button type="button" onClick={() => setOpen((o) => !o)} className="flex-none rounded-lg border border-[#1e3a8a] px-3 py-1.5 text-sm font-medium text-[#1e3a8a] hover:bg-[#1e3a8a]/5">{open ? "Close" : numbers.length ? "Manage" : "Connect"}</button>
      </div>

      {open && (
        <div className="mt-3 space-y-3 border-t border-slate-100 pt-3">
          <div className="rounded-lg bg-emerald-50 p-3">
            <Tip><b className="text-slate-600">Where to find these:</b> in <Ext href="https://business.facebook.com/wa/manage/">WhatsApp Manager</Ext> → API Setup. Copy the <b>Phone number ID</b> and a <b>permanent access token</b> (System User token with <code>whatsapp_business_messaging</code>). Then point the Meta webhook at us (see docs).</Tip>
          </div>
          {numbers.length > 0 && (
            <div className="space-y-2">
              {numbers.map((n) => (
                <div key={n.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 px-3 py-2">
                  <div className="min-w-0"><div className="truncate text-sm font-medium text-slate-700">{n.label || n.phoneNumberId}</div><div className="text-xs text-slate-400">ID {n.phoneNumberId}</div></div>
                  {isAdmin && <button type="button" disabled={busy === n.id} onClick={() => remove(n.id)} className="rounded-md px-2 py-1 text-xs text-red-500 hover:bg-red-50 disabled:opacity-40">Remove</button>}
                </div>
              ))}
            </div>
          )}
          <label className="flex flex-col gap-1"><span className="text-xs font-medium text-slate-600">Phone number ID</span>
            <input className={inp} disabled={!isAdmin} value={phoneNumberId} onChange={(e) => setPhoneNumberId(e.target.value.trim())} placeholder="e.g. 109XXXXXXXXXXXX" />
          </label>
          <label className="flex flex-col gap-1"><span className="text-xs font-medium text-slate-600">Access token</span>
            <input className={inp} type="password" disabled={!isAdmin} value={token} onChange={(e) => setToken(e.target.value)} placeholder="permanent WABA / system-user token" />
            <Tip>Stored encrypted — never shown again.</Tip>
          </label>
          <label className="flex flex-col gap-1"><span className="text-xs font-medium text-slate-600">Label <span className="font-normal text-slate-400">(optional)</span></span>
            <input className={inp} disabled={!isAdmin} value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Main WhatsApp line" />
          </label>
          {msg && <div className={`rounded-lg px-3 py-2 text-sm ${msg.ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>{msg.text}</div>}
          {isAdmin ? (
            <button type="button" disabled={!phoneNumberId || !token || busy === "save"} onClick={save} className="rounded-lg bg-[#1e3a8a] px-4 py-2 text-sm font-medium text-white disabled:opacity-40">{busy === "save" ? "Saving…" : "Connect number"}</button>
          ) : <Tip>Admin required to connect WhatsApp.</Tip>}
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
  useReloadOnFocus(load);

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

function BusinessProfileSection({ tenantId, isAdmin }: { tenantId: string; isAdmin: boolean }) {
  const [p, setP] = useState<BusinessProfile | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => { getBusinessProfile(tenantId).then(setP).catch(() => setP(null)); }, [tenantId]);
  const set = (k: keyof BusinessProfile, v: string) => setP((cur) => (cur ? { ...cur, [k]: v } : cur));

  const save = async () => {
    if (!p) return;
    setBusy(true); setMsg(null);
    const r = await saveBusinessProfile(tenantId, p);
    setBusy(false);
    setMsg({ ok: r.ok, text: r.ok ? "Saved ✓" : (r.message ?? "Could not save.") });
  };

  if (!p) return <div className="py-8 text-center text-sm text-slate-400">Loading…</div>;

  // Render HELPER, deliberately invoked as {F({…})} — NOT as <F/>. As a JSX component its
  // identity changes every render (it's redefined in this closure), so React REMOUNTS the
  // input on each keystroke and focus drops after one letter (Ali's bug). Calling it as a
  // function inlines stable <label>/<input> elements instead.
  const F = ({ k, label, placeholder, hint, type = "text" }: { k: keyof BusinessProfile; label: string; placeholder?: string; hint?: string; type?: string }) => (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium text-slate-600">{label}</span>
      <input className={inp} type={type} disabled={!isAdmin} value={p[k]} placeholder={placeholder} onChange={(e) => set(k, e.target.value)} />
      {hint && <Tip>{hint}</Tip>}
    </label>
  );

  return (
    <div className="max-w-3xl space-y-6">
      <p className="text-sm text-slate-500">Your business identity. This powers your site&apos;s contact details, email sending identity, invoices, and AI-generated copy — set it once and it&apos;s reused everywhere.</p>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-3 text-sm font-semibold text-slate-800">General information</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {F({ k: "business_name", label: "Business name", placeholder: "Al Biz Connect" })}
          {F({ k: "legal_business_name", label: "Legal business name", placeholder: "As registered (for invoices & KYC)", hint: "The exact legal name, as registered." })}
          {F({ k: "business_email", label: "Business email", placeholder: "hello@yourbiz.com", type: "email" })}
          {F({ k: "business_phone", label: "Business phone", placeholder: "+1 416 555 1234" })}
          {F({ k: "business_website", label: "Website", placeholder: "https://yourbiz.com" })}
          {F({ k: "business_niche", label: "Industry / niche", placeholder: "Real estate, dental, fitness…" })}
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-3 text-sm font-semibold text-slate-800">Physical address</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">{F({ k: "address_street", label: "Street address", placeholder: "396 Hwy 7 E" })}</div>
          {F({ k: "address_city", label: "City", placeholder: "Richmond Hill" })}
          {F({ k: "address_state", label: "State / Province / Region", placeholder: "Ontario" })}
          {F({ k: "address_postal", label: "Postal / ZIP code", placeholder: "L4B 0G7" })}
          {F({ k: "address_country", label: "Country", placeholder: "Canada" })}
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-3 text-sm font-semibold text-slate-800">Locale</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-slate-600">Time zone</span>
            <TimezoneSelect className={inp} disabled={!isAdmin} value={p.default_timezone} onChange={(v) => set("default_timezone", v)} allowEmpty />
          </label>
          {F({ k: "currency", label: "Currency", placeholder: "CAD", hint: "3-letter ISO code, e.g. CAD, USD." })}
          {F({ k: "platform_language", label: "Language", placeholder: "English (Canada)" })}
        </div>
      </section>

      {msg && <div className={`rounded-lg px-3 py-2 text-sm ${msg.ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>{msg.text}</div>}

      {isAdmin ? (
        <button type="button" disabled={busy} onClick={save} className="rounded-lg bg-[#1e3a8a] px-5 py-2 text-sm font-medium text-white disabled:opacity-40">{busy ? "Saving…" : "Save business profile"}</button>
      ) : (
        <p className="text-xs text-slate-400">Admin required to edit the business profile.</p>
      )}
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
  useReloadOnFocus(load);

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

function TagsSection({ tenantId, isAdmin }: { tenantId: string; isAdmin: boolean }) {
  const [tags, setTags] = useState<TagView[] | null>(null);
  const [name, setName] = useState(""); const [color, setColor] = useState("#1e3a8a");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => { setTags(await listTags(tenantId)); }, [tenantId]);
  useEffect(() => { load().catch(() => setTags([])); }, [load]);

  const add = async () => { setBusy(true); setMsg(null); const r = await createTag(tenantId, name, color); setBusy(false); if (!r.ok) { setMsg(r.message ?? "Could not add."); return; } setName(""); await load(); };
  const remove = async (id: string) => { const r = await deleteTag(tenantId, id); if (!r.ok) setMsg(r.message ?? "Could not delete."); await load(); };
  const recolor = async (id: string, c: string) => { await updateTag(tenantId, id, { color: c }); await load(); };

  if (!tags) return <div className="py-8 text-center text-sm text-slate-400">Loading…</div>;
  return (
    <div className="max-w-2xl space-y-4">
      <p className="text-sm text-slate-500">Reusable labels for organizing contacts and opportunities. Create them once and apply them across your CRM and automations.</p>
      {isAdmin && (
        <div className="flex flex-wrap items-end gap-2 rounded-xl border border-slate-200 bg-white p-4">
          <label className="flex flex-col gap-1"><span className="text-xs font-medium text-slate-600">New tag</span>
            <input className={inp} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Hot lead" /></label>
          <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-10 w-12 rounded border border-slate-300" title="Tag color" />
          <button type="button" disabled={!name || busy} onClick={add} className="rounded-lg bg-[#1e3a8a] px-4 py-2 text-sm font-medium text-white disabled:opacity-40">{busy ? "…" : "Add tag"}</button>
        </div>
      )}
      {msg && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{msg}</div>}
      <div className="flex flex-wrap gap-2">
        {tags.length === 0 ? <p className="text-sm text-slate-400">No tags yet.</p>
          : tags.map((tg) => (
            <span key={tg.id} className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm">
              <span className="h-3 w-3 rounded-full" style={{ background: tg.color }} />
              <span className="text-slate-700">{tg.name}</span>
              {isAdmin && <>
                <input type="color" value={tg.color} onChange={(e) => recolor(tg.id, e.target.value)} className="h-4 w-4 cursor-pointer border-0 bg-transparent p-0" title="Change color" />
                <button onClick={() => remove(tg.id)} className="text-slate-300 hover:text-red-500" title="Delete">×</button>
              </>}
            </span>
          ))}
      </div>
    </div>
  );
}

function CustomFieldsSection({ tenantId, isAdmin }: { tenantId: string; isAdmin: boolean }) {
  const [fields, setFields] = useState<CustomFieldView[] | null>(null);
  const [obj, setObj] = useState<CustomObjectType>("contact");
  const [name, setName] = useState(""); const [type, setType] = useState<CustomFieldType>("text");
  const [opts, setOpts] = useState(""); const [required, setRequired] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => { setFields(await listCustomFields(tenantId)); }, [tenantId]);
  useEffect(() => { load().catch(() => setFields([])); }, [load]);

  const add = async () => {
    setBusy(true); setMsg(null);
    const r = await createCustomField(tenantId, { object_type: obj, name, field_type: type, options: opts.split(",").map((s) => s.trim()).filter(Boolean), required });
    setBusy(false);
    if (!r.ok) { setMsg(r.message ?? "Could not add."); return; }
    setName(""); setOpts(""); setRequired(false); await load();
  };
  const remove = async (id: string) => { const r = await deleteCustomField(tenantId, id); if (!r.ok) setMsg(r.message ?? "Could not delete."); await load(); };

  if (!fields) return <div className="py-8 text-center text-sm text-slate-400">Loading…</div>;
  const forObj = (o: CustomObjectType) => fields.filter((f) => f.object_type === o);

  return (
    <div className="max-w-2xl space-y-5">
      <p className="text-sm text-slate-500">Capture the data that matters to your business. Custom fields appear on contact &amp; opportunity records, forms, and automations.</p>

      {isAdmin && (
        <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex flex-wrap gap-2">
            <label className="flex flex-col gap-1"><span className="text-xs font-medium text-slate-600">Object</span>
              <select className={inp} value={obj} onChange={(e) => setObj(e.target.value as CustomObjectType)}><option value="contact">Contact</option><option value="opportunity">Opportunity</option></select></label>
            <label className="flex flex-1 flex-col gap-1"><span className="text-xs font-medium text-slate-600">Field name</span>
              <input className={inp} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Budget range" /></label>
            <label className="flex flex-col gap-1"><span className="text-xs font-medium text-slate-600">Type</span>
              <select className={inp} value={type} onChange={(e) => setType(e.target.value as CustomFieldType)}>{FIELD_TYPES.map((ft) => <option key={ft} value={ft}>{ft}</option>)}</select></label>
          </div>
          {type === "dropdown" && (
            <label className="flex flex-col gap-1"><span className="text-xs font-medium text-slate-600">Options <span className="font-normal text-slate-400">(comma-separated)</span></span>
              <input className={inp} value={opts} onChange={(e) => setOpts(e.target.value)} placeholder="Under 500k, 500k–1M, 1M+" /></label>
          )}
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={required} onChange={(e) => setRequired(e.target.checked)} className="h-4 w-4 accent-[#1e3a8a]" /> Required</label>
            <button type="button" disabled={!name || busy} onClick={add} className="rounded-lg bg-[#1e3a8a] px-4 py-2 text-sm font-medium text-white disabled:opacity-40">{busy ? "…" : "Add field"}</button>
          </div>
        </div>
      )}
      {msg && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{msg}</div>}

      {(["contact", "opportunity"] as CustomObjectType[]).map((o) => (
        <div key={o}>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">{o === "contact" ? "Contact fields" : "Opportunity fields"}</h2>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-400">
                <tr><th className="px-4 py-2">Name</th><th className="px-4 py-2">Key</th><th className="px-4 py-2">Type</th><th className="px-4 py-2">Req.</th><th className="px-4 py-2"></th></tr>
              </thead>
              <tbody>
                {forObj(o).length === 0
                  ? <tr><td colSpan={5} className="px-4 py-4 text-center text-slate-400">No custom fields.</td></tr>
                  : forObj(o).map((f) => (
                    <tr key={f.id} className="border-t border-slate-100">
                      <td className="px-4 py-2 text-slate-700">{f.name}{f.field_type === "dropdown" && f.options.length > 0 && <span className="ml-1 text-[11px] text-slate-400">({f.options.join(", ")})</span>}</td>
                      <td className="px-4 py-2 font-mono text-[11px] text-slate-400">{f.field_key}</td>
                      <td className="px-4 py-2 text-slate-500">{f.field_type}</td>
                      <td className="px-4 py-2 text-slate-500">{f.required ? "✓" : "—"}</td>
                      <td className="px-4 py-2 text-right">{isAdmin && <button onClick={() => remove(f.id)} className="text-xs text-red-500 hover:underline">Delete</button>}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}

function CustomValuesSection({ tenantId, isAdmin }: { tenantId: string; isAdmin: boolean }) {
  const [vals, setVals] = useState<CustomValueView[] | null>(null);
  const [name, setName] = useState(""); const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => { setVals(await listCustomValues(tenantId)); }, [tenantId]);
  useEffect(() => { load().catch(() => setVals([])); }, [load]);

  const add = async () => { setBusy(true); setMsg(null); const r = await createCustomValue(tenantId, name, value); setBusy(false); if (!r.ok) { setMsg(r.message ?? "Could not add."); return; } setName(""); setValue(""); await load(); };
  const saveVal = async (id: string, v: string) => { await updateCustomValue(tenantId, id, { value: v }); await load(); };
  const remove = async (id: string) => { const r = await deleteCustomValue(tenantId, id); if (!r.ok) setMsg(r.message ?? "Could not delete."); await load(); };

  if (!vals) return <div className="py-8 text-center text-sm text-slate-400">Loading…</div>;
  return (
    <div className="max-w-2xl space-y-4">
      <p className="text-sm text-slate-500">Reusable values you can drop into emails, SMS, and pages as merge tags — update once and it changes everywhere. Reference as <code className="rounded bg-slate-100 px-1 text-[11px]">{`{{custom_values.key}}`}</code>.</p>
      {isAdmin && (
        <div className="flex flex-wrap items-end gap-2 rounded-xl border border-slate-200 bg-white p-4">
          <label className="flex flex-col gap-1"><span className="text-xs font-medium text-slate-600">Name</span>
            <input className={inp} value={name} onChange={(e) => setName(e.target.value)} placeholder="Office phone" /></label>
          <label className="flex flex-1 flex-col gap-1"><span className="text-xs font-medium text-slate-600">Value</span>
            <input className={inp} value={value} onChange={(e) => setValue(e.target.value)} placeholder="+1 416 555 1234" /></label>
          <button type="button" disabled={!name || busy} onClick={add} className="rounded-lg bg-[#1e3a8a] px-4 py-2 text-sm font-medium text-white disabled:opacity-40">{busy ? "…" : "Add"}</button>
        </div>
      )}
      {msg && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{msg}</div>}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-400">
            <tr><th className="px-4 py-2">Name</th><th className="px-4 py-2">Merge tag</th><th className="px-4 py-2">Value</th><th className="px-4 py-2"></th></tr>
          </thead>
          <tbody>
            {vals.length === 0 ? <tr><td colSpan={4} className="px-4 py-4 text-center text-slate-400">No custom values yet.</td></tr>
              : vals.map((v) => (
                <tr key={v.id} className="border-t border-slate-100">
                  <td className="px-4 py-2 text-slate-700">{v.name}</td>
                  <td className="px-4 py-2 font-mono text-[11px] text-slate-400">{`{{custom_values.${v.value_key}}}`}</td>
                  <td className="px-4 py-2">{isAdmin ? <input defaultValue={v.value} onBlur={(e) => saveVal(v.id, e.target.value)} className="w-full rounded border border-slate-200 px-2 py-1 text-sm" /> : <span className="text-slate-600">{v.value}</span>}</td>
                  <td className="px-4 py-2 text-right">{isAdmin && <button onClick={() => remove(v.id)} className="text-xs text-red-500 hover:underline">Delete</button>}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function LeadScoringSection({ tenantId, isAdmin }: { tenantId: string; isAdmin: boolean }) {
  const [v, setV] = useState<ScoringView | null>(null);
  const [name, setName] = useState(""); const [trigger, setTrigger] = useState<TriggerType>("form_submitted"); const [points, setPoints] = useState("10");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => { setV(await getScoring(tenantId)); }, [tenantId]);
  useEffect(() => { load().catch(() => setV({ rules: [], hotThreshold: 50 })); }, [load]);

  const add = async () => { setBusy(true); setMsg(null); const r = await createScoringRule(tenantId, { name, trigger_type: trigger, points: Number(points) }); setBusy(false); if (!r.ok) { setMsg(r.message ?? "Could not add."); return; } setName(""); await load(); };
  const toggle = async (id: string, enabled: boolean) => { await updateScoringRule(tenantId, id, { enabled }); await load(); };
  const remove = async (id: string) => { const r = await deleteScoringRule(tenantId, id); if (!r.ok) setMsg(r.message ?? "Could not delete."); await load(); };
  const saveThreshold = async (n: number) => { await setHotThreshold(tenantId, n); await load(); };

  if (!v) return <div className="py-8 text-center text-sm text-slate-400">Loading…</div>;
  return (
    <div className="max-w-2xl space-y-5">
      <p className="text-sm text-slate-500">Award points when a lead takes an action. When a contact crosses your &quot;hot&quot; threshold, you can prioritize follow-up. (Scoring is applied to contacts in a later step — this defines the rules.)</p>

      <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <span className="text-sm font-medium text-slate-700">Hot-lead threshold</span>
        <input type="number" disabled={!isAdmin} defaultValue={v.hotThreshold} onBlur={(e) => saveThreshold(Number(e.target.value))} className="w-24 rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        <span className="text-xs text-slate-400">points</span>
      </div>

      {isAdmin && (
        <div className="flex flex-wrap items-end gap-2 rounded-xl border border-slate-200 bg-white p-4">
          <label className="flex flex-1 flex-col gap-1"><span className="text-xs font-medium text-slate-600">Rule name</span>
            <input className={inp} value={name} onChange={(e) => setName(e.target.value)} placeholder="Filled out contact form" /></label>
          <label className="flex flex-col gap-1"><span className="text-xs font-medium text-slate-600">Trigger</span>
            <select className={inp} value={trigger} onChange={(e) => setTrigger(e.target.value as TriggerType)}>{TRIGGER_TYPES.map((t) => <option key={t} value={t}>{TRIGGER_LABELS[t]}</option>)}</select></label>
          <label className="flex flex-col gap-1"><span className="text-xs font-medium text-slate-600">Points</span>
            <input type="number" className={`${inp} w-24`} value={points} onChange={(e) => setPoints(e.target.value)} /></label>
          <button type="button" disabled={!name || busy} onClick={add} className="rounded-lg bg-[#1e3a8a] px-4 py-2 text-sm font-medium text-white disabled:opacity-40">{busy ? "…" : "Add rule"}</button>
        </div>
      )}
      {msg && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{msg}</div>}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-400">
            <tr><th className="px-4 py-2">Rule</th><th className="px-4 py-2">Trigger</th><th className="px-4 py-2 text-right">Points</th><th className="px-4 py-2">On</th><th className="px-4 py-2"></th></tr>
          </thead>
          <tbody>
            {v.rules.length === 0 ? <tr><td colSpan={5} className="px-4 py-4 text-center text-slate-400">No scoring rules yet.</td></tr>
              : v.rules.map((r: ScoringRuleView) => (
                <tr key={r.id} className="border-t border-slate-100">
                  <td className="px-4 py-2 text-slate-700">{r.name}</td>
                  <td className="px-4 py-2 text-slate-500">{TRIGGER_LABELS[r.trigger_type]}</td>
                  <td className={`px-4 py-2 text-right font-medium ${r.points < 0 ? "text-red-600" : "text-emerald-600"}`}>{r.points > 0 ? `+${r.points}` : r.points}</td>
                  <td className="px-4 py-2">{isAdmin ? <input type="checkbox" checked={r.enabled} onChange={(e) => toggle(r.id, e.target.checked)} className="h-4 w-4 accent-[#1e3a8a]" /> : (r.enabled ? "✓" : "—")}</td>
                  <td className="px-4 py-2 text-right">{isAdmin && <button onClick={() => remove(r.id)} className="text-xs text-red-500 hover:underline">Delete</button>}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AuditLogSection({ tenantId }: { tenantId: string }) {
  const [rows, setRows] = useState<TenantAuditEntry[] | null>(null);
  useEffect(() => { listTenantAudit(tenantId).then(setRows).catch(() => setRows([])); }, [tenantId]);
  if (!rows) return <div className="py-8 text-center text-sm text-slate-400">Loading…</div>;
  return (
    <div className="max-w-3xl space-y-3">
      <p className="text-sm text-slate-500">Recent changes in your workspace — connections, settings, and verifications. Read-only.</p>
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-400">
            <tr><th className="px-4 py-2">When</th><th className="px-4 py-2">Action</th><th className="px-4 py-2">By</th></tr>
          </thead>
          <tbody>
            {rows.length === 0 ? <tr><td colSpan={3} className="px-4 py-6 text-center text-slate-400">No activity yet.</td></tr>
              : rows.map((a) => (
                <tr key={a.id} className="border-t border-slate-100">
                  <td className="px-4 py-2 text-slate-400">{new Date(a.created_at).toLocaleString()}</td>
                  <td className="px-4 py-2 text-slate-700">{a.action.replace(/[._]/g, " ")}</td>
                  <td className="px-4 py-2 text-slate-600">{a.actor_email ?? "—"}</td>
                </tr>
              ))}
          </tbody>
        </table>
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
        <TimezoneSelect className={inp} disabled={!isAdmin} value={tz} onChange={(v) => { setTz(v); save("default_timezone", v); }} allowEmpty /></label>
      <label className="flex flex-col gap-1"><span className="text-xs font-medium text-slate-600">Currency</span>
        <input className={inp} disabled={!isAdmin} placeholder="CAD" value={currency} onChange={(e) => setCurrency(e.target.value)} onBlur={() => save("currency", currency)} /></label>
      <p className="text-xs text-slate-400">Brand colors, fonts, and backgrounds are set per website in that website's editor (Brand panel).</p>
    </div>
  );
}
