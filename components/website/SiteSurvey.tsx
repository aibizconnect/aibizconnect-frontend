"use client";

import { useState } from "react";

type Q = { label: string; kind: "single" | "multiple" | "text" | "email" | "rating"; options?: { text: string }[]; required?: boolean };

/**
 * Live multi-step survey/quiz on a published site. One question per step with Back/Next + progress.
 * On finish → POST /api/leads/submit (same durable lead pipeline as the contact form: stores into
 * form_submissions + best-effort CRM contact). No send/charge.
 */
export default function SiteSurvey({
  tenantId, websiteId, pageId, heading, questions, submitLabel, successMessage,
}: {
  tenantId: string; websiteId?: string; pageId?: string;
  heading?: string; questions: Q[]; submitLabel?: string; successMessage?: string;
}) {
  const qs = (questions ?? []).filter((q) => q.label);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string | string[]>>({});
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [err, setErr] = useState<string | null>(null);

  if (!qs.length) return null;
  const q = qs[step];
  const last = step === qs.length - 1;
  const val = answers[step];

  const setVal = (v: string | string[]) => setAnswers((a) => ({ ...a, [step]: v }));
  const toggleMulti = (opt: string) => {
    const cur = Array.isArray(val) ? val : [];
    setVal(cur.includes(opt) ? cur.filter((x) => x !== opt) : [...cur, opt]);
  };
  const answered = (): boolean => {
    if (!q.required) return true;
    if (Array.isArray(val)) return val.length > 0;
    return !!(val && String(val).trim());
  };

  async function finish() {
    setState("sending"); setErr(null);
    const fields: Record<string, string> = {};
    let email = "";
    qs.forEach((qq, i) => {
      const a = answers[i];
      const text = Array.isArray(a) ? a.join(", ") : (a ?? "");
      if (text) fields[qq.label] = String(text);
      if (qq.kind === "email" && typeof a === "string") email = a;
    });
    try {
      const r = await fetch("/api/leads/submit", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId, websiteId, pageId, source: "survey", email: email || undefined, fields }),
      });
      const j = await r.json();
      if (j.ok) setState("done"); else { setState("error"); setErr(j.error ?? "Please try again."); }
    } catch { setState("error"); setErr("Network error. Please try again."); }
  }

  if (state === "done") {
    return (
      <section className="mx-auto max-w-xl px-6 py-12 text-center">
        <p className="rounded-xl border border-emerald-300 bg-emerald-50 p-5 text-emerald-800">✓ {successMessage || "Thanks for your response!"}</p>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-xl px-6 py-10">
      {heading && <h2 className="mb-2 text-center text-2xl font-semibold">{heading}</h2>}
      {/* progress */}
      <div className="mb-5 h-1.5 overflow-hidden rounded-full bg-slate-200">
        <div className="h-full rounded-full bg-[var(--abc-color-primary,#2563eb)] transition-all" style={{ width: `${((step + 1) / qs.length) * 100}%` }} />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="mb-3 text-base font-medium text-slate-800">{q.label}{q.required ? " *" : ""}</div>

        {(q.kind === "single" || q.kind === "multiple") && (
          <div className="space-y-2">
            {(q.options ?? []).map((o, j) => {
              const on = q.kind === "single" ? val === o.text : Array.isArray(val) && val.includes(o.text);
              return (
                <label key={j} className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm ${on ? "border-[#1e3a8a] bg-[#1e3a8a]/5" : "border-slate-200 hover:border-slate-300"}`}>
                  <input type={q.kind === "single" ? "radio" : "checkbox"} checked={!!on} onChange={() => (q.kind === "single" ? setVal(o.text) : toggleMulti(o.text))} />
                  {o.text}
                </label>
              );
            })}
          </div>
        )}
        {q.kind === "text" && <textarea rows={3} value={(val as string) ?? ""} onChange={(e) => setVal(e.target.value)} placeholder="Your answer…" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />}
        {q.kind === "email" && <input type="email" value={(val as string) ?? ""} onChange={(e) => setVal(e.target.value)} placeholder="you@email.com" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />}
        {q.kind === "rating" && (
          <div className="flex gap-1 text-2xl">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" onClick={() => setVal(String(n))} className={Number(val) >= n ? "text-amber-400" : "text-slate-300"}>★</button>
            ))}
          </div>
        )}

        {err && <p className="mt-3 text-sm text-red-600">{err}</p>}

        <div className="mt-5 flex items-center justify-between">
          <button type="button" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}
            className="rounded-lg px-4 py-2 text-sm font-medium text-slate-500 hover:bg-slate-50 disabled:opacity-40">← Back</button>
          {last ? (
            <button type="button" onClick={finish} disabled={!answered() || state === "sending"}
              className="rounded-lg bg-[var(--abc-color-primary,#2563eb)] px-5 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50">
              {state === "sending" ? "Submitting…" : (submitLabel || "Submit")}
            </button>
          ) : (
            <button type="button" onClick={() => setStep((s) => s + 1)} disabled={!answered()}
              className="rounded-lg bg-[var(--abc-color-primary,#2563eb)] px-5 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50">Next →</button>
          )}
        </div>
      </div>
    </section>
  );
}
