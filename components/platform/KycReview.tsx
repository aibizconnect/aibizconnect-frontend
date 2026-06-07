"use client";

import { useCallback, useEffect, useState } from "react";
import { listKycCases, reviewKycDecision, type KycCaseView } from "@/app/platform/kyc-actions";

/**
 * Platform KYC review (admin only). Shows NON-PII verification cases and lets a reviewer
 * approve / reject / override with a reason. No identity documents or PII are ever shown — only the
 * lifecycle status, provider session reference, and the non-PII decision summary.
 */

const STATUS_UI: Record<string, { label: string; cls: string }> = {
  pending_start: { label: "Not started", cls: "bg-slate-100 text-slate-500" },
  provider_initiated: { label: "Awaiting user", cls: "bg-slate-100 text-slate-500" },
  provider_in_progress: { label: "Processing", cls: "bg-sky-100 text-sky-700" },
  provider_verified: { label: "Provider verified", cls: "bg-amber-100 text-amber-700" },
  provider_rejected: { label: "Provider rejected", cls: "bg-red-100 text-red-700" },
  provider_failed: { label: "Failed", cls: "bg-red-100 text-red-700" },
  platform_approved: { label: "Approved", cls: "bg-emerald-100 text-emerald-700" },
  platform_rejected: { label: "Rejected", cls: "bg-red-100 text-red-700" },
  platform_overridden: { label: "Overridden", cls: "bg-violet-100 text-violet-700" },
};

function Pill({ status }: { status: string }) {
  const ui = STATUS_UI[status] ?? { label: status, cls: "bg-slate-100 text-slate-500" };
  return <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${ui.cls}`}>{ui.label}</span>;
}

export default function KycReview() {
  const [cases, setCases] = useState<KycCaseView[] | null>(null);
  const [all, setAll] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setCases(await listKycCases({ all }));
  }, [all]);
  useEffect(() => { load().catch(() => setCases([])); }, [load]);

  const decide = async (tenantId: string, decision: "approved" | "rejected" | "overridden") => {
    setBusy(tenantId + decision); setMsg(null);
    const r = await reviewKycDecision(tenantId, decision, reasons[tenantId] ?? "");
    setBusy(null);
    setMsg(r.ok ? `Recorded: ${decision}.` : (r.message ?? "Could not record decision."));
    await load();
  };

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm text-slate-500">Provider-hosted identity checks. No documents or PII are stored or shown — only status + a non-PII summary.</p>
        <label className="flex items-center gap-2 text-xs text-slate-500">
          <input type="checkbox" checked={all} onChange={(e) => setAll(e.target.checked)} className="h-4 w-4 accent-[#1e3a8a]" /> Show all
        </label>
      </div>
      {msg && <div className="mb-3 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-700">{msg}</div>}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-4 py-2">Workspace</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Summary</th>
              <th className="px-4 py-2">Decision</th>
            </tr>
          </thead>
          <tbody>
            {cases === null
              ? <tr><td colSpan={4} className="px-4 py-6 text-center text-slate-400">Loading…</td></tr>
              : cases.length === 0
                ? <tr><td colSpan={4} className="px-4 py-6 text-center text-slate-400">No verification cases{all ? "" : " needing review"}.</td></tr>
                : cases.map((c) => {
                  const d = c.provider_decision || {};
                  const summary = [d.doc_type ? `doc: ${d.doc_type}` : null, c.provider_risk_level ? `risk: ${c.provider_risk_level}` : null, c.provider_reason ? `reason: ${c.provider_reason}` : null].filter(Boolean).join(" · ");
                  const decided = c.status.startsWith("platform_");
                  return (
                    <tr key={c.tenant_id} className="border-t border-slate-100 align-top">
                      <td className="px-4 py-3">
                        <div className="font-mono text-[11px] text-slate-500">{c.tenant_id.slice(0, 8)}…</div>
                        <div className="text-[11px] text-slate-400">{c.provider_session_id ? `${c.provider_session_id.slice(0, 14)}…` : "no session"}</div>
                      </td>
                      <td className="px-4 py-3"><Pill status={c.status} /></td>
                      <td className="px-4 py-3 text-[12px] text-slate-600">
                        {summary || <span className="text-slate-400">—</span>}
                        {decided && c.platform_reviewer_id && <div className="mt-1 text-[11px] text-slate-400">by {c.platform_reviewer_id}{c.platform_reason ? ` · ${c.platform_reason}` : ""}</div>}
                      </td>
                      <td className="px-4 py-3">
                        <input
                          value={reasons[c.tenant_id] ?? ""}
                          onChange={(e) => setReasons((r) => ({ ...r, [c.tenant_id]: e.target.value }))}
                          placeholder="reason (optional)"
                          className="mb-2 w-44 rounded-lg border border-slate-300 px-2 py-1 text-xs"
                        />
                        <div className="flex flex-wrap gap-1.5">
                          <button disabled={busy === c.tenant_id + "approved"} onClick={() => decide(c.tenant_id, "approved")} className="rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-medium text-white hover:opacity-90 disabled:opacity-40">Approve</button>
                          <button disabled={busy === c.tenant_id + "rejected"} onClick={() => decide(c.tenant_id, "rejected")} className="rounded-md bg-red-500 px-2.5 py-1 text-xs font-medium text-white hover:opacity-90 disabled:opacity-40">Reject</button>
                          <button disabled={busy === c.tenant_id + "overridden"} onClick={() => decide(c.tenant_id, "overridden")} className="rounded-md border border-slate-300 px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-40">Override</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
