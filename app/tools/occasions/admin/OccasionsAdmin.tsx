"use client";

import { useState } from "react";
import Link from "next/link";
import type { AdminAccount } from "@/lib/server/occasion-widget-accounts";
import {
  adminListAccountsAction, adminSetActiveAction, adminSetPlanAction, adminSetCapAction, adminAddAccountAction,
} from "./actions";

/**
 * Occasions admin — staff manage existing GHL accounts: activate/suspend, free/paid, custom domain
 * cap, and see which domains have actually installed the snippet. All mutations go through the
 * isPlatformAdmin-gated server actions; we re-fetch the whole list after each change to stay honest.
 */

function since(iso?: string | null): string {
  if (!iso) return "never";
  const secs = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (secs < 3600) return "just now";
  const h = Math.floor(secs / 3600);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}
const installed7d = (iso?: string | null): boolean => !!iso && Date.now() - new Date(iso).getTime() < 7 * 24 * 60 * 60 * 1000;

export default function OccasionsAdmin({ initialAccounts, paidCap, adminEmail }: { initialAccounts: AdminAccount[]; paidCap: number; adminEmail: string }) {
  const [accounts, setAccounts] = useState<AdminAccount[]>(initialAccounts);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null); // locationId currently mutating
  const [capDraft, setCapDraft] = useState<Record<string, string>>({});
  const [addLoc, setAddLoc] = useState("");
  const [addName, setAddName] = useState("");
  const [addErr, setAddErr] = useState("");
  const [adding, setAdding] = useState(false);

  async function refresh() {
    const fresh = await adminListAccountsAction().catch(() => null);
    if (fresh) setAccounts(fresh);
  }
  async function run(locationId: string, fn: () => Promise<unknown>) {
    setBusy(locationId);
    try { await fn(); await refresh(); } finally { setBusy(null); }
  }

  async function addAccount() {
    setAddErr("");
    if (!addLoc.trim()) { setAddErr("Enter the GHL location id."); return; }
    setAdding(true);
    const r = await adminAddAccountAction(addLoc.trim(), addName.trim()).catch(() => ({ ok: false, error: "Something went wrong." }));
    setAdding(false);
    if (!r.ok) { setAddErr(r.error || "Couldn't add that account."); return; }
    setAddLoc(""); setAddName("");
    await refresh();
  }

  const totals = {
    accounts: accounts.length,
    active: accounts.filter((a) => a.active).length,
    sites: accounts.reduce((n, a) => n + a.siteCount, 0),
    installed: accounts.reduce((n, a) => n + a.installedCount, 0),
  };

  const capLabel = (a: AdminAccount): string =>
    a.isOwner ? "∞ (owner)" : a.effectiveCap == null ? "∞" : String(a.effectiveCap);

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <Link href="/platform" className="text-sm text-slate-500 hover:text-slate-900">← Platform</Link>
            <span className="text-base font-semibold text-slate-900">Occasions · Accounts</span>
            <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[11px] font-medium text-indigo-700">admin</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-slate-400 sm:inline">{adminEmail}</span>
            <button onClick={refresh} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50">Refresh</button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-6">
        <p className="mb-5 text-sm text-slate-500">
          Manage the existing GHL Occasions accounts — activate or pause them, switch a plan between free and paid, set how
          many domains each may connect, and see which registered domains have actually installed the snippet.
        </p>

        {/* summary */}
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[["Accounts", totals.accounts], ["Active", totals.active], ["Sites", totals.sites], ["Installed", totals.installed]].map(([label, n]) => (
            <div key={label as string} className="rounded-xl border border-slate-200 bg-white px-4 py-3">
              <div className="text-2xl font-semibold text-slate-900">{n as number}</div>
              <div className="text-xs font-medium uppercase tracking-wide text-slate-400">{label as string}</div>
            </div>
          ))}
        </div>

        {/* add account */}
        <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4">
          <div className="mb-2 text-sm font-semibold text-slate-800">Add / pre-register an account</div>
          <div className="flex flex-wrap items-end gap-2">
            <label className="flex-1 min-w-[220px] text-xs font-medium text-slate-500">GHL location id
              <input value={addLoc} onChange={(e) => setAddLoc(e.target.value)} placeholder="e.g. yDwou55cNKwHB5cg0Frs" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900" />
            </label>
            <label className="flex-1 min-w-[180px] text-xs font-medium text-slate-500">Account name (optional)
              <input value={addName} onChange={(e) => setAddName(e.target.value)} placeholder="Acme Realty" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900" />
            </label>
            <button onClick={addAccount} disabled={adding} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">{adding ? "Adding…" : "Add account"}</button>
          </div>
          {addErr && <div className="mt-2 text-xs text-red-600">{addErr}</div>}
          <p className="mt-2 text-xs text-slate-400">Use this to set a plan or domain cap before the customer first opens Occasions from their GHL menu. The account also auto-creates on first open.</p>
        </div>

        {/* accounts table */}
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="grid grid-cols-[1.6fr_0.8fr_0.7fr_1fr_1fr] gap-2 border-b border-slate-200 bg-slate-50 px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            <div>Account</div><div>Plan</div><div>Active</div><div>Domain cap</div><div>Sites · installed</div>
          </div>
          {accounts.length === 0 && <div className="px-4 py-8 text-center text-sm text-slate-400">No accounts yet. They appear here once a GHL sub-account opens Occasions (or add one above).</div>}
          {accounts.map((a) => {
            const isBusy = busy === a.ghlLocationId;
            const draft = capDraft[a.ghlLocationId] ?? (a.siteCap == null ? "" : String(a.siteCap));
            return (
              <div key={a.ghlLocationId} className={`border-b border-slate-100 last:border-0 ${isBusy ? "opacity-60" : ""}`}>
                <div className="grid grid-cols-[1.6fr_0.8fr_0.7fr_1fr_1fr] items-center gap-2 px-4 py-3">
                  {/* account */}
                  <div className="min-w-0">
                    <button onClick={() => setExpanded(expanded === a.ghlLocationId ? null : a.ghlLocationId)} className="flex items-center gap-1.5 text-left">
                      <span className={`text-slate-400 transition-transform ${expanded === a.ghlLocationId ? "rotate-90" : ""}`}>›</span>
                      <span className="truncate text-sm font-medium text-slate-900">{a.accountName || "Unnamed account"}</span>
                      {a.isOwner && <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">OWNER</span>}
                    </button>
                    <div className="truncate pl-5 font-mono text-[11px] text-slate-400">{a.ghlLocationId}</div>
                  </div>
                  {/* plan */}
                  <div>
                    {a.isOwner ? <span className="text-xs text-slate-400">—</span> : (
                      <div className="inline-flex rounded-lg border border-slate-200 p-0.5">
                        {(["free", "paid"] as const).map((p) => (
                          <button key={p} disabled={isBusy} onClick={() => a.plan !== p && run(a.ghlLocationId, () => adminSetPlanAction(a.ghlLocationId, p))}
                            className={`rounded-md px-2.5 py-1 text-xs font-semibold capitalize ${a.plan === p ? "bg-indigo-600 text-white" : "text-slate-500 hover:bg-slate-50"}`}>{p}</button>
                        ))}
                      </div>
                    )}
                  </div>
                  {/* active */}
                  <div>
                    {a.isOwner ? <span className="text-xs text-slate-400">always</span> : (
                      <button disabled={isBusy} onClick={() => run(a.ghlLocationId, () => adminSetActiveAction(a.ghlLocationId, !a.active))}
                        role="switch" aria-checked={a.active}
                        className={`relative h-6 w-11 rounded-full transition-colors ${a.active ? "bg-emerald-500" : "bg-slate-300"}`}>
                        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${a.active ? "left-[22px]" : "left-0.5"}`} />
                      </button>
                    )}
                  </div>
                  {/* cap */}
                  <div>
                    {a.isOwner ? <span className="text-sm text-slate-500">{capLabel(a)}</span> : (
                      <div className="flex items-center gap-1">
                        <input value={draft} onChange={(e) => setCapDraft({ ...capDraft, [a.ghlLocationId]: e.target.value.replace(/[^\d]/g, "") })}
                          placeholder={`plan (${a.plan === "paid" ? paidCap : 1})`} inputMode="numeric"
                          className="w-16 rounded-md border border-slate-300 px-2 py-1 text-sm text-slate-900" />
                        <button disabled={isBusy} onClick={() => run(a.ghlLocationId, () => adminSetCapAction(a.ghlLocationId, draft === "" ? null : Number(draft)))}
                          className="rounded-md bg-slate-800 px-2 py-1 text-xs font-semibold text-white hover:bg-slate-900">Set</button>
                        {a.siteCap != null && (
                          <button disabled={isBusy} title="Use plan default" onClick={() => { setCapDraft({ ...capDraft, [a.ghlLocationId]: "" }); run(a.ghlLocationId, () => adminSetCapAction(a.ghlLocationId, null)); }}
                            className="rounded-md px-1.5 py-1 text-xs text-slate-400 hover:text-slate-700">✕</button>
                        )}
                      </div>
                    )}
                  </div>
                  {/* sites */}
                  <div className="text-sm text-slate-700">
                    <span className="font-medium">{a.siteCount}</span> site{a.siteCount === 1 ? "" : "s"}
                    <span className="text-slate-400"> · </span>
                    <span className={a.installedCount > 0 ? "font-medium text-emerald-600" : "text-slate-400"}>{a.installedCount} installed</span>
                  </div>
                </div>

                {/* expanded: sites */}
                {expanded === a.ghlLocationId && (
                  <div className="border-t border-slate-100 bg-slate-50/60 px-5 py-3">
                    {a.sites.length === 0 ? (
                      <div className="text-xs text-slate-400">No domains added to this account yet.</div>
                    ) : (
                      <div className="space-y-1.5">
                        {a.sites.map((s) => (
                          <div key={s.key} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2">
                            <div className="min-w-0">
                              <div className="truncate text-sm font-medium text-slate-800">{s.domain}</div>
                              <div className="font-mono text-[10px] text-slate-400">{s.key}</div>
                            </div>
                            <div className="flex items-center gap-3 text-xs">
                              <span className={s.active ? "text-emerald-600" : "text-slate-400"}>{s.active ? "Live" : "Paused"}</span>
                              <span className="flex items-center gap-1.5">
                                <span className={`h-2 w-2 rounded-full ${installed7d(s.lastSeenAt) ? "bg-emerald-500" : "bg-slate-300"}`} />
                                <span className={installed7d(s.lastSeenAt) ? "text-slate-700" : "text-slate-400"}>
                                  {installed7d(s.lastSeenAt) ? `installed · seen ${since(s.lastSeenAt)}` : s.lastSeenAt ? `last seen ${since(s.lastSeenAt)}` : "not detected"}
                                </span>
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
