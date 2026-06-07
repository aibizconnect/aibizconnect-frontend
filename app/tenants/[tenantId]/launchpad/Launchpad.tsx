"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  getLaunchpadState, verifyStep, setStepSkipped, setFollowupPrefs, dismissLaunchpad,
  type LaunchpadState, type LaunchpadStep,
} from "./actions";

const STATUS_UI: Record<string, { label: string; cls: string }> = {
  complete: { label: "Done", cls: "bg-emerald-100 text-emerald-700" },
  pending: { label: "To do", cls: "bg-slate-100 text-slate-500" },
  in_progress: { label: "In progress", cls: "bg-amber-100 text-amber-700" },
  skipped: { label: "Skipped", cls: "bg-slate-100 text-slate-400" },
  not_applicable: { label: "Optional", cls: "bg-slate-100 text-slate-400" },
};

function Check({ done }: { done: boolean }) {
  return (
    <span className={`grid h-7 w-7 flex-none place-items-center rounded-full border ${done ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-300 text-transparent"}`}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="h-4 w-4"><path d="M20 6 9 17l-5-5" /></svg>
    </span>
  );
}

export default function Launchpad({ tenantId, isAdmin }: { tenantId: string; isAdmin: boolean }) {
  const [state, setState] = useState<LaunchpadState | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    const s = await getLaunchpadState(tenantId);
    setState(s);
  }, [tenantId]);
  useEffect(() => { load().catch((e) => setError(e?.message ?? "Could not load.")); }, [load]);

  const recheck = async (key: string) => {
    setBusy(key); setError(null); setNotice(null);
    const r = await verifyStep(tenantId, key);
    setBusy(null);
    setNotice(r.ok ? "Step verified ✓" : "Not done yet — finish the step, then re-check.");
    await load();
  };
  const skip = async (key: string, skipped: boolean) => {
    setBusy(key); setError(null);
    const r = await setStepSkipped(tenantId, key, skipped);
    setBusy(null);
    if (!r.ok) { setError(r.message ?? "Could not update."); return; }
    await load();
  };
  const saveFollowup = async (patch: Partial<LaunchpadState["followup"]>) => {
    if (!state) return;
    const next = { ...state.followup, ...patch };
    setState({ ...state, followup: next });
    const r = await setFollowupPrefs(tenantId, next);
    if (!r.ok) setError(r.message ?? "Could not save follow-up settings.");
    else setNotice(next.enabled ? `Follow-up reminders scheduled${r.scheduled ? ` (${r.scheduled} drafts)` : ""}. Nothing sends until a send is enabled.` : "Follow-up reminders turned off.");
  };

  if (!state) return <div className="py-16 text-center text-sm text-slate-400">Loading your Launchpad…</div>;

  const allDone = state.progress >= 100;
  const ordered = [...state.steps].sort((a, b) => Number(a.optional) - Number(b.optional));

  return (
    <div className="max-w-3xl">
      <div className="mb-1 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">Launchpad</h1>
        {isAdmin && <button onClick={() => dismissLaunchpad(tenantId, true).then(() => setNotice("Hidden from your dashboard. You can still open it from the menu."))} className="text-xs text-slate-400 hover:text-slate-600">Hide</button>}
      </div>
      <p className="mb-5 text-sm text-slate-500">{allDone ? "You're all set — every required step is done. 🎉" : "Finish these steps to get your business fully live. We check each one automatically."}</p>

      {/* Progress */}
      <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-medium text-slate-700">Setup progress</span>
          <span className="font-semibold text-[#1e3a8a]">{state.progress}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-gradient-to-r from-[#1e3a8a] to-[#22d3ee] transition-all" style={{ width: `${state.progress}%` }} />
        </div>
      </div>

      {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      {notice && <div className="mb-4 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-700">{notice}</div>}

      {/* Steps */}
      <div className="space-y-2.5">
        {ordered.map((s: LaunchpadStep) => {
          const ui = STATUS_UI[s.status] ?? STATUS_UI.pending;
          const done = s.status === "complete";
          return (
            <div key={s.step_key} className={`flex items-start gap-3 rounded-xl border bg-white p-4 ${done ? "border-emerald-100" : "border-slate-200"}`}>
              <Check done={done} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-slate-800">{s.title}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${ui.cls}`}>{ui.label}</span>
                  {s.optional && <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] uppercase text-slate-400">optional</span>}
                </div>
                <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{s.desc}</p>
                {!done && s.status !== "not_applicable" && (
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Link href={s.route} className="rounded-lg bg-[#1e3a8a] px-3 py-1.5 text-xs font-medium text-white hover:opacity-90">{s.status === "skipped" ? "Set up" : "Finish this"}</Link>
                    <button disabled={busy === s.step_key} onClick={() => recheck(s.step_key)} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-40">{busy === s.step_key ? "Checking…" : "Re-check"}</button>
                    {isAdmin && s.optional && s.status !== "skipped" && <button disabled={busy === s.step_key} onClick={() => skip(s.step_key, true)} className="text-xs text-slate-400 hover:text-slate-600">Skip</button>}
                    {isAdmin && s.status === "skipped" && <button disabled={busy === s.step_key} onClick={() => skip(s.step_key, false)} className="text-xs text-slate-400 hover:text-slate-600">Un-skip</button>}
                  </div>
                )}
                {done && Object.keys(s.evidence).length > 0 && (
                  <p className="mt-1 text-[11px] text-emerald-600">{evidenceText(s)}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Follow-up sequence */}
      <div className="mt-7 rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-800">Follow-up reminders</h2>
            <p className="mt-0.5 text-xs leading-relaxed text-slate-500">Nudge yourself (or your team) to finish setup on day 1, 3, and 7. Reminders are prepared as <b>drafts</b> — nothing is sent automatically.</p>
          </div>
          <label className="flex flex-none cursor-pointer items-center gap-2">
            <input type="checkbox" disabled={!isAdmin} checked={state.followup.enabled} onChange={(e) => saveFollowup({ enabled: e.target.checked })} className="h-4 w-4 accent-[#1e3a8a]" />
            <span className="text-xs font-medium text-slate-600">{state.followup.enabled ? "On" : "Off"}</span>
          </label>
        </div>
        {state.followup.enabled && (
          <div className="mt-3 flex flex-wrap gap-4 border-t border-slate-100 pt-3">
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input type="checkbox" disabled={!isAdmin} checked={state.followup.email} onChange={(e) => saveFollowup({ email: e.target.checked })} className="h-4 w-4 accent-[#1e3a8a]" /> Email
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input type="checkbox" disabled={!isAdmin} checked={state.followup.sms} onChange={(e) => saveFollowup({ sms: e.target.checked })} className="h-4 w-4 accent-[#1e3a8a]" /> SMS
              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] uppercase text-slate-400">Twilio soon</span>
            </label>
          </div>
        )}
        {!isAdmin && <p className="mt-2 text-[11px] text-slate-400">Admin required to change follow-up settings.</p>}
      </div>
    </div>
  );
}

function evidenceText(s: LaunchpadStep): string {
  const e = s.evidence as any;
  switch (s.step_key) {
    case "website": return `${e.publishedPages} published page(s)`;
    case "domain": return e.domain ? `${e.domain} (${e.status})` : "verified";
    case "email": return e.sender ? `Sending as ${e.sender}` : "verified";
    case "social": return `${e.accounts} account(s) connected`;
    case "account": return "Profile complete";
    case "brand": return e.hasLogo ? "Logo + brand set" : "Brand customized";
    default: return "Done";
  }
}
