"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  adminDeleteTenant, adminSetTenantPlan, adminExtendTrial,
  adminSetFreeToPlay, adminSetBillingStatus, adminSetMonthlyAmount,
} from "@/app/platform/admin-actions";
import type { Subscriber } from "@/lib/server/admin-directory";

/**
 * Platform SUBSCRIBERS console — every tenant is one of OUR subscribers. Shows plan tier,
 * inception, monthly amount, next-due date and a rolled-up billing status; lets a platform
 * admin change the plan, extend a trial, make a tenant free-to-play (comp), mark it paying,
 * set a custom amount, or delete it (typed confirm; platform tenant protected).
 *
 * NOTE: this is distinct from the tenant Payments menu (a tenant billing THEIR customers).
 */

// Mirrors PLAN_CATALOG (kept local so this client bundle never imports the server module).
const PLAN_OPTIONS: { key: string; label: string }[] = [
  { key: "free", label: "Free" }, { key: "starter", label: "Starter" }, { key: "pro", label: "Pro" },
  { key: "premium", label: "Premium" }, { key: "agency", label: "Agency" }, { key: "enterprise", label: "Enterprise" },
];

const STATE_BADGE: Record<Subscriber["state"], { label: string; cls: string }> = {
  paying: { label: "Paying", cls: "bg-emerald-100 text-emerald-700" },
  trial: { label: "Trial", cls: "bg-sky-100 text-sky-700" },
  trial_expired: { label: "Trial expired", cls: "bg-rose-100 text-rose-700" },
  due: { label: "Payment due", cls: "bg-rose-100 text-rose-700" },
  comp: { label: "Free (comp)", cls: "bg-violet-100 text-violet-700" },
  canceled: { label: "Canceled", cls: "bg-slate-200 text-slate-600" },
};

const money = (cents: number | null) =>
  cents === null ? "Custom" : `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: cents % 100 ? 2 : 0, maximumFractionDigits: 2 })}/mo`;
const fmt = (d: string | null) => (d ? new Date(d).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : "—");
const fmtNum = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k` : String(n));

export default function PlatformTenants({ initial }: { initial: Subscriber[] }) {
  const router = useRouter();
  const [rows, setRows] = useState(initial);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [typed, setTyped] = useState("");
  const [trialMenu, setTrialMenu] = useState<string | null>(null);
  const [amtEdit, setAmtEdit] = useState<string | null>(null);
  const [amtVal, setAmtVal] = useState("");

  const schemaReady = rows.every((r) => r.schemaReady);
  const summary = useMemo(() => {
    const paying = rows.filter((r) => r.state === "paying");
    const mrr = paying.reduce((s, r) => s + (r.monthlyCents ?? 0), 0);
    return {
      total: rows.length,
      paying: paying.length,
      trialing: rows.filter((r) => r.state === "trial" || r.state === "trial_expired").length,
      comp: rows.filter((r) => r.state === "comp").length,
      due: rows.filter((r) => r.state === "due" || r.state === "trial_expired").length,
      mrr,
    };
  }, [rows]);

  // Run a mutation, then refresh the row from the server for accurate derived fields.
  async function run(id: string, fn: () => Promise<{ ok: boolean; message?: string }>) {
    setBusyId(id); setErr(null);
    const r = await fn();
    setBusyId(null);
    if (!r.ok) { setErr(r.message ?? "Update failed."); return false; }
    router.refresh();
    return true;
  }

  // Optimistic local patch so the table updates instantly (router.refresh re-syncs derived fields).
  const patch = (id: string, p: Partial<Subscriber>) => setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...p } : r)));

  async function changePlan(s: Subscriber, plan: string) {
    patch(s.id, { plan });
    await run(s.id, () => adminSetTenantPlan(s.id, plan));
  }
  async function extend(s: Subscriber, days: number) {
    setTrialMenu(null);
    await run(s.id, () => adminExtendTrial(s.id, days));
  }
  async function comp(s: Subscriber, on: boolean) {
    patch(s.id, { state: on ? "comp" : "paying", billingStatus: on ? "comp" : "active" });
    await run(s.id, () => adminSetFreeToPlay(s.id, on));
  }
  async function markPaying(s: Subscriber) {
    const next = new Date(Date.now() + 30 * 86_400_000).toISOString();
    await run(s.id, () => adminSetBillingStatus(s.id, "active", next));
  }
  async function saveAmount(s: Subscriber) {
    const v = amtVal.trim();
    const dollars = v === "" ? null : Number(v);
    if (dollars !== null && Number.isNaN(dollars)) { setErr("Enter a number, or blank to use the plan price."); return; }
    setAmtEdit(null);
    await run(s.id, () => adminSetMonthlyAmount(s.id, dollars));
  }
  async function doDelete(s: Subscriber) {
    setBusyId(s.id); setErr(null);
    const r = await adminDeleteTenant(s.id);
    setBusyId(null);
    if (r.ok) { setRows((rs) => rs.filter((x) => x.id !== s.id)); setConfirmId(null); setTyped(""); router.refresh(); }
    else setErr(r.message ?? "Delete failed.");
  }

  return (
    <div>
      {/* Summary strip */}
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {[
          { k: "Subscribers", v: String(summary.total) },
          { k: "Paying", v: String(summary.paying) },
          { k: "Trialing", v: String(summary.trialing) },
          { k: "Comp", v: String(summary.comp) },
          { k: "MRR", v: `$${(summary.mrr / 100).toLocaleString()}` },
        ].map((c) => (
          <div key={c.k} className="rounded-xl border border-slate-200 bg-white px-4 py-3">
            <div className="text-[11px] uppercase tracking-wide text-slate-400">{c.k}</div>
            <div className="mt-0.5 text-xl font-semibold text-slate-900">{c.v}</div>
          </div>
        ))}
      </div>

      {!schemaReady && (
        <div className="mb-3 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Showing <b>derived</b> billing status from plan + signup date. Apply migration <code>0079_tenant_billing.sql</code> to store and edit real plan/trial/billing data.
        </div>
      )}
      {err && <div className="mb-3 rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">{err}</div>}

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full min-w-[920px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-4 py-2">Subscriber</th>
              <th className="px-4 py-2">Plan</th>
              <th className="px-4 py-2">Since</th>
              <th className="px-4 py-2">Monthly</th>
              <th className="px-4 py-2">Next due</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2 text-right">Manage</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-6 text-center text-slate-400">No subscribers.</td></tr>
            ) : rows.map((s) => {
              const badge = STATE_BADGE[s.state];
              const dueClass = s.daysLeft !== null && s.daysLeft < 0 ? "text-rose-600 font-medium"
                : s.daysLeft !== null && s.daysLeft <= 3 ? "text-amber-600 font-medium" : "text-slate-500";
              return (
                <tr key={s.id} className="border-t border-slate-100 align-top">
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-800">{s.name}</div>
                    <div className="font-mono text-[11px] text-slate-400">{s.slug ? `/${s.slug}` : s.id.slice(0, 8)} · {s.members} member{s.members === 1 ? "" : "s"}</div>
                    <a href={`/tenants/${s.id}/dashboard`} className="text-[11px] text-[#1e3a8a] hover:underline">Open workspace ↗</a>
                    {s.usage.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {s.usage.map((u) => (
                          <span key={u.key}
                            title={`${u.label}: ${u.used}${u.included > 0 ? ` / ${u.included} ${u.unit}` : ` ${u.unit}`}${u.over ? " — over limit" : ""}`}
                            className={`rounded px-1.5 py-0.5 text-[10px] ${u.over ? "bg-rose-100 text-rose-700" : "bg-slate-100 text-slate-500"}`}>
                            {u.label} {fmtNum(u.used)}{u.included > 0 ? `/${fmtNum(u.included)}` : ""}{u.over ? " ⚠" : ""}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>

                  <td className="px-4 py-3">
                    <select value={s.plan} disabled={busyId === s.id}
                      onChange={(e) => changePlan(s, e.target.value)}
                      className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 disabled:opacity-50">
                      {PLAN_OPTIONS.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
                    </select>
                  </td>

                  <td className="px-4 py-3 text-slate-500">{fmt(s.inception)}</td>

                  <td className="px-4 py-3">
                    {amtEdit === s.id ? (
                      <span className="flex items-center gap-1">
                        <span className="text-slate-400">$</span>
                        <input autoFocus value={amtVal} onChange={(e) => setAmtVal(e.target.value)} placeholder="plan"
                          className="w-16 rounded border border-slate-300 px-1.5 py-0.5 text-xs" />
                        <button onClick={() => saveAmount(s)} className="text-xs text-emerald-600 hover:underline">save</button>
                        <button onClick={() => setAmtEdit(null)} className="text-xs text-slate-400 hover:underline">×</button>
                      </span>
                    ) : (
                      <button onClick={() => { setAmtEdit(s.id); setAmtVal(s.monthlyOverride && s.monthlyCents !== null ? String(s.monthlyCents / 100) : ""); setErr(null); }}
                        className="group inline-flex items-center gap-1 text-slate-700 hover:text-[#1e3a8a]" title="Set a custom amount">
                        {s.state === "comp" ? <span className="text-slate-400">$0 (comp)</span> : money(s.monthlyCents)}
                        {s.monthlyOverride && <span className="rounded bg-slate-100 px-1 text-[9px] uppercase text-slate-500">custom</span>}
                        <span className="opacity-0 transition group-hover:opacity-100 text-[10px]">✎</span>
                      </button>
                    )}
                  </td>

                  <td className={`px-4 py-3 ${dueClass}`}>
                    {fmt(s.dueDate)}
                    {s.daysLeft !== null && (
                      <div className="text-[11px]">{s.daysLeft < 0 ? `${Math.abs(s.daysLeft)}d overdue` : `${s.daysLeft}d left`}</div>
                    )}
                  </td>

                  <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${badge.cls}`}>{badge.label}</span></td>

                  <td className="px-4 py-3">
                    <div className="flex flex-col items-end gap-1.5">
                      {confirmId === s.id ? (
                        <div className="flex flex-col items-end gap-1.5">
                          <input autoFocus value={typed} onChange={(e) => setTyped(e.target.value)} placeholder={`Type "${s.name}"`}
                            className="w-44 rounded-md border border-rose-300 px-2 py-1 text-xs outline-none focus:border-rose-500" />
                          <div className="flex gap-2">
                            <button onClick={() => { setConfirmId(null); setTyped(""); }} className="text-xs text-slate-400 hover:text-slate-700">Cancel</button>
                            <button disabled={typed !== s.name || busyId === s.id} onClick={() => doDelete(s)}
                              className="rounded-md bg-rose-600 px-3 py-1 text-xs font-medium text-white disabled:opacity-40">
                              {busyId === s.id ? "Deleting…" : "Delete forever"}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-wrap items-center justify-end gap-1.5">
                          {/* Extend trial */}
                          <div className="relative">
                            <button disabled={busyId === s.id} onClick={() => setTrialMenu(trialMenu === s.id ? null : s.id)}
                              className="rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-40">Extend trial ▾</button>
                            {trialMenu === s.id && (
                              <div className="absolute right-0 z-10 mt-1 w-28 rounded-md border border-slate-200 bg-white py-1 shadow-lg">
                                {[7, 14, 30, 90].map((d) => (
                                  <button key={d} onClick={() => extend(s, d)} className="block w-full px-3 py-1 text-left text-xs text-slate-600 hover:bg-slate-50">+{d} days</button>
                                ))}
                              </div>
                            )}
                          </div>
                          {/* Free-to-play */}
                          {s.state === "comp" ? (
                            <button disabled={busyId === s.id} onClick={() => comp(s, false)}
                              className="rounded-md border border-violet-200 px-2 py-1 text-xs text-violet-700 hover:bg-violet-50 disabled:opacity-40">End comp</button>
                          ) : (
                            <button disabled={busyId === s.id} onClick={() => comp(s, true)}
                              className="rounded-md border border-violet-200 px-2 py-1 text-xs text-violet-700 hover:bg-violet-50 disabled:opacity-40">Free-to-play</button>
                          )}
                          {/* Mark paying */}
                          {s.state !== "paying" && s.state !== "comp" && (
                            <button disabled={busyId === s.id} onClick={() => markPaying(s)}
                              className="rounded-md border border-emerald-200 px-2 py-1 text-xs text-emerald-700 hover:bg-emerald-50 disabled:opacity-40">Mark paid</button>
                          )}
                          {/* Delete */}
                          {s.isProtected ? (
                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700">Protected</span>
                          ) : (
                            <button onClick={() => { setConfirmId(s.id); setTyped(""); setErr(null); }} className="rounded-md px-2 py-1 text-xs text-rose-500 hover:bg-rose-50 hover:text-rose-700">Delete</button>
                          )}
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-slate-400">
        Monthly amount derives from the plan tier (click it to set a custom/negotiated price). Deleting a subscriber permanently removes <b>all</b> of its data via the cascade RPC — apply <code>0075_delete_tenant_cascade.sql</code> if a delete reports the function is missing.
      </p>
    </div>
  );
}
