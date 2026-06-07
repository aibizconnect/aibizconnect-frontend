"use client";

import { useCallback, useEffect, useState } from "react";
import { getStrategy, generateStrategy, type StrategyRecord } from "./actions";

const INTENT_CLS: Record<string, string> = {
  informational: "bg-sky-100 text-sky-700",
  commercial: "bg-amber-100 text-amber-700",
  transactional: "bg-emerald-100 text-emerald-700",
  navigational: "bg-slate-100 text-slate-600",
};
const PRIORITY_CLS: Record<string, string> = {
  quick_win: "bg-emerald-100 text-emerald-700",
  big_bet: "bg-violet-100 text-violet-700",
  fill_in: "bg-slate-100 text-slate-500",
};
const PRIORITY_LABEL: Record<string, string> = { quick_win: "Quick win", big_bet: "Big bet", fill_in: "Fill-in" };

function Tag({ text, cls }: { text: string; cls: string }) {
  return <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${cls}`}>{text.replace(/_/g, " ")}</span>;
}

export default function StrategyView({ tenantId, isAdmin }: { tenantId: string; isAdmin: boolean }) {
  const [s, setS] = useState<StrategyRecord | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [view, setView] = useState<"map" | "queue" | "calendar">("map");

  const load = useCallback(async () => { setS(await getStrategy(tenantId)); setLoaded(true); }, [tenantId]);
  useEffect(() => { load().catch(() => setLoaded(true)); }, [load]);

  const generate = async () => {
    setBusy(true); setMsg(null);
    const r = await generateStrategy(tenantId);
    setBusy(false);
    if (!r.ok) { setMsg(r.message ?? "Could not generate."); return; }
    await load();
  };

  if (!loaded) return <div className="py-16 text-center text-sm text-slate-400">Loading your content strategy…</div>;

  return (
    <div className="max-w-4xl">
      <div className="mb-1 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">Content Strategy</h1>
        {isAdmin && (
          <button onClick={generate} disabled={busy} className="rounded-lg bg-[#1e3a8a] px-4 py-2 text-sm font-medium text-white disabled:opacity-40">
            {busy ? "Generating…" : s ? "Regenerate" : "Generate strategy"}
          </button>
        )}
      </div>
      <p className="mb-5 text-sm text-slate-500">A topical-authority plan built from your business profile — pillars, clusters, a prioritized queue, and a 12-week calendar. Set your <b>industry</b> in Settings → Business Profile for the most relevant plan.</p>

      {msg && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{msg}</div>}

      {!s ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <p className="text-sm text-slate-500">No strategy yet.{isAdmin ? " Click “Generate strategy” to build one from your business profile." : " Ask an admin to generate one."}</p>
        </div>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span className="rounded bg-slate-100 px-2 py-1">Niche: <b className="text-slate-700">{s.niche}</b></span>
            {s.updated_at && <span>Updated {new Date(s.updated_at).toLocaleDateString()}</span>}
            <span>· {s.queue.length} content ideas</span>
          </div>

          <div className="mb-5 flex gap-1 border-b border-slate-200">
            {([["map", "Topic map"], ["queue", "Priority queue"], ["calendar", "12-week calendar"]] as [typeof view, string][]).map(([k, label]) => (
              <button key={k} onClick={() => setView(k)} className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition ${view === k ? "border-[#1e3a8a] text-[#1e3a8a]" : "border-transparent text-slate-500 hover:text-slate-700"}`}>{label}</button>
            ))}
          </div>

          {view === "map" && (
            <div className="space-y-4">
              {s.pillars.map((p, i) => (
                <div key={i} className="rounded-xl border border-slate-200 bg-white p-4">
                  <h2 className="mb-3 text-sm font-semibold text-slate-800">📚 {p.title} <span className="text-xs font-normal text-slate-400">(pillar)</span></h2>
                  <div className="grid gap-3 sm:grid-cols-3">
                    {p.cluster.map((c, j) => (
                      <div key={j} className="rounded-lg border border-slate-100 bg-slate-50/50 p-3">
                        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{c.title}</div>
                        <ul className="space-y-1.5">
                          {c.articles.map((a, k) => (
                            <li key={k} className="text-[13px] leading-snug text-slate-700">
                              {a.title}
                              <span className="ml-1"><Tag text={a.intent} cls={INTENT_CLS[a.intent] ?? "bg-slate-100"} /></span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {view === "queue" && (
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-400">
                  <tr><th className="px-4 py-2">#</th><th className="px-4 py-2">Title</th><th className="px-4 py-2">Intent</th><th className="px-4 py-2">Priority</th><th className="px-4 py-2 text-right">Words</th></tr>
                </thead>
                <tbody>
                  {s.queue.map((q, i) => (
                    <tr key={i} className="border-t border-slate-100">
                      <td className="px-4 py-2 text-slate-400">{i + 1}</td>
                      <td className="px-4 py-2 text-slate-700">{q.title}<div className="font-mono text-[10px] text-slate-400">{q.keyword}</div></td>
                      <td className="px-4 py-2"><Tag text={q.intent} cls={INTENT_CLS[q.intent] ?? "bg-slate-100"} /></td>
                      <td className="px-4 py-2"><Tag text={PRIORITY_LABEL[q.priority] ?? q.priority} cls={PRIORITY_CLS[q.priority] ?? "bg-slate-100"} /></td>
                      <td className="px-4 py-2 text-right text-slate-500">{q.est_words}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {view === "calendar" && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {s.calendar.map((w) => (
                <div key={w.week} className="rounded-xl border border-slate-200 bg-white p-3">
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Week {w.week}</div>
                  {w.items.length === 0 ? <p className="text-xs text-slate-400">—</p> : (
                    <ul className="space-y-1.5">
                      {w.items.map((it, i) => <li key={i} className="text-[13px] leading-snug text-slate-700">• {it.title}</li>)}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
