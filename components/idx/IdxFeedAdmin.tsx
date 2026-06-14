"use client";

import { useEffect, useState } from "react";
import { getFeedAction, saveFeedAction, testSyncAction, getSyncHealthAction } from "@/app/tenants/[tenantId]/sites/listings/actions";
import type { FeedView } from "@/lib/server/idx/feeds";

/**
 * IDX feed admin (G4). Configure the CREA DDF feed: endpoint + credentials (encrypted),
 * board/area scope, accept DDF terms, test connectivity, and watch sync health. Nothing syncs
 * or renders publicly until the feed is active (terms accepted + endpoint) and IDX is enabled.
 */
const inp = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a]";
const lbl = "mb-1 block text-xs font-medium text-slate-600";

export default function IdxFeedAdmin({ tenantId, idxEnabled }: { tenantId: string; idxEnabled: boolean }) {
  const [feed, setFeed] = useState<FeedView | null | undefined>(undefined);
  const [method, setMethod] = useState("rest");
  const [endpoint, setEndpoint] = useState("");
  const [token, setToken] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [cities, setCities] = useState("");
  const [terms, setTerms] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [health, setHealth] = useState<{ lastRunAt: string | null; status: string | null; listingCount: number } | null>(null);

  useEffect(() => {
    getFeedAction(tenantId).then((f) => {
      setFeed(f);
      if (f) { setMethod(f.method); setEndpoint(f.endpoint ?? ""); setTerms(f.termsAccepted); const c = (f.config?.cities as string[]) ?? []; setCities(Array.isArray(c) ? c.join(", ") : ""); }
    }).catch(() => setFeed(null));
    getSyncHealthAction(tenantId).then(setHealth).catch(() => {});
  }, [tenantId]);

  function creds(): Record<string, unknown> {
    const c: Record<string, unknown> = {};
    if (token.trim()) c.token = token.trim();
    if (username.trim()) c.username = username.trim();
    if (password.trim()) c.password = password.trim();
    return c;
  }
  async function save() {
    setBusy("save"); setMsg(null);
    const config = { cities: cities.split(",").map((s) => s.trim()).filter(Boolean) };
    const r = await saveFeedAction(tenantId, { method, endpoint, credentials: creds(), config, termsAccepted: terms });
    setBusy(null);
    if (!r.ok) setMsg(r.error ?? "Could not save."); else { setFeed(r.feed); setToken(""); setPassword(""); setMsg("Saved ✓"); }
  }
  async function test() {
    setBusy("test"); setMsg(null);
    const r = await testSyncAction(tenantId);
    setBusy(null);
    setMsg(r.ok ? `Connected ✓${r.sample != null ? ` (sample: ${r.sample})` : ""}${r.counts ? " — sync ran" : ""}.` : (r.error ?? "Connection failed."));
    getSyncHealthAction(tenantId).then(setHealth).catch(() => {});
  }

  if (feed === undefined) return <div className="py-8 text-center text-sm text-slate-400">Loading…</div>;

  return (
    <div className="max-w-2xl space-y-4">
      {!idxEnabled && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          IDX is <b>off</b> right now (env <code>IDX_ENABLED</code>). You can configure the feed here; listings won&apos;t sync or appear publicly until it&apos;s switched on.
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-sm font-semibold text-slate-800">CREA DDF feed</div>
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase ${feed?.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{feed?.status ?? "not set"}</span>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <label><span className={lbl}>Method</span>
            <select value={method} onChange={(e) => setMethod(e.target.value)} className={inp}><option value="rest">DDF REST</option><option value="rets">RETS</option></select></label>
          <label className="sm:col-span-2"><span className={lbl}>Endpoint / base URL</span><input value={endpoint} onChange={(e) => setEndpoint(e.target.value)} placeholder="https://ddfapi.realtor.ca/odata" className={inp} /></label>
        </div>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <label><span className={lbl}>API token {feed?.hasCredentials && <span className="text-emerald-600">(stored)</span>}</span><input type="password" value={token} onChange={(e) => setToken(e.target.value)} placeholder={feed?.hasCredentials ? "•••• stored" : "DDF token"} className={inp} /></label>
          <label><span className={lbl}>RETS user (optional)</span><input value={username} onChange={(e) => setUsername(e.target.value)} className={inp} /></label>
          <label><span className={lbl}>RETS password</span><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className={inp} /></label>
        </div>
        <label className="mt-3 block"><span className={lbl}>Show only these cities (optional, comma-separated)</span><input value={cities} onChange={(e) => setCities(e.target.value)} placeholder="Ottawa, Gatineau" className={inp} /></label>
        <label className="mt-3 flex items-start gap-2 text-sm text-slate-600"><input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} className="mt-0.5" /><span>I&apos;ve read and accept the CREA DDF® Terms of Use, and I&apos;m authorized to display this data (member/broker authorization in place).</span></label>
        <div className="mt-4 flex items-center gap-2">
          <button onClick={save} disabled={!!busy} className="rounded-lg bg-[#1e3a8a] px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{busy === "save" ? "Saving…" : "Save feed"}</button>
          <button onClick={test} disabled={!!busy || !feed?.endpoint} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 disabled:opacity-50">{busy === "test" ? "Testing…" : "Test connection"}</button>
          {msg && <span className="text-xs text-slate-600">{msg}</span>}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm">
        <div className="mb-1 font-semibold text-slate-800">Sync health</div>
        <div className="text-slate-500">Live listings: <b className="text-slate-700">{health?.listingCount ?? 0}</b> · Last run: {health?.lastRunAt ? new Date(health.lastRunAt).toLocaleString() : "never"} · Status: {health?.status ?? "—"}</div>
        <p className="mt-1 text-xs text-slate-400">Listings sync every 15 minutes once the feed is active. Sold/inactive listings are kept 90 days then removed (DDF retention).</p>
      </div>
    </div>
  );
}
