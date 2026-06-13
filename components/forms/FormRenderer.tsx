"use client";

import { useState } from "react";
import type { FormField, FormSettings } from "@/lib/server/forms";

/**
 * Public form renderer (D-312). Renders a tenant_forms definition and POSTs to /api/leads/submit
 * (stamps form_id → stores a submission + best-effort CRM contact). Standard keys (name/email/
 * phone/message) go top-level so the contact is created; everything else rides in `fields`.
 */
const STD = new Set(["name", "email", "phone", "message"]);

export default function FormRenderer({ tenantId, formId, name, fields, settings, embedded }: {
  tenantId: string; formId: string; name: string; fields: FormField[]; settings: FormSettings; embedded?: boolean;
}) {
  const ordered = [...(fields ?? [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const [values, setValues] = useState<Record<string, string>>({});
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [err, setErr] = useState<string | null>(null);

  const set = (k: string, v: string) => setValues((p) => ({ ...p, [k]: v }));

  async function submit() {
    for (const f of ordered) if (f.required && !String(values[f.key] ?? "").trim()) { setErr(`${f.label} is required.`); return; }
    setState("sending"); setErr(null);
    const top: Record<string, string> = {};
    const extra: Record<string, string> = {};
    for (const f of ordered) {
      const v = String(values[f.key] ?? "").trim();
      if (!v) continue;
      // Route to a standard slot by key, or infer from type so the CRM contact still forms.
      const slot = STD.has(f.key) ? f.key : f.type === "email" ? "email" : f.type === "phone" ? "phone" : null;
      if (slot) top[slot] = v; else extra[f.label] = v;
    }
    try {
      const r = await fetch("/api/leads/submit", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId, formId, source: name, ...top, fields: extra }),
      });
      const j = await r.json();
      if (j.ok) {
        if (settings.redirectUrl) { window.location.href = settings.redirectUrl; return; }
        setState("done");
      } else { setState("error"); setErr(j.error ?? "Please try again."); }
    } catch { setState("error"); setErr("Network error. Please try again."); }
  }

  if (state === "done") {
    return <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-6 text-center text-emerald-800">✓ {settings.thankYouMessage}</div>;
  }

  const input = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100";
  return (
    <form onSubmit={(e) => { e.preventDefault(); void submit(); }} className={embedded ? "" : "rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"}>
      <div className="space-y-4">
        {ordered.map((f) => (
          <label key={f.key} className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">{f.label}{f.required && <span className="text-rose-500"> *</span>}</span>
            {f.type === "textarea" ? (
              <textarea rows={4} value={values[f.key] ?? ""} placeholder={f.placeholder} onChange={(e) => set(f.key, e.target.value)} className={input} />
            ) : f.type === "select" ? (
              <select value={values[f.key] ?? ""} onChange={(e) => set(f.key, e.target.value)} className={input}>
                <option value="">{f.placeholder || "Select…"}</option>
                {(f.options ?? []).map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            ) : f.type === "radio" ? (
              <div className="space-y-1.5">
                {(f.options ?? []).map((o) => (
                  <label key={o} className="flex items-center gap-2 text-sm text-slate-700"><input type="radio" name={f.key} checked={values[f.key] === o} onChange={() => set(f.key, o)} />{o}</label>
                ))}
              </div>
            ) : f.type === "checkbox" ? (
              <label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={values[f.key] === "yes"} onChange={(e) => set(f.key, e.target.checked ? "yes" : "")} />{f.placeholder || f.label}</label>
            ) : (
              <input type={f.type === "phone" ? "tel" : f.type} value={values[f.key] ?? ""} placeholder={f.placeholder} onChange={(e) => set(f.key, e.target.value)} className={input} />
            )}
          </label>
        ))}
        {err && <p className="text-sm text-rose-600">{err}</p>}
        <button type="submit" disabled={state === "sending"} className="w-full rounded-lg bg-[#1e3a8a] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1b337a] disabled:opacity-50">
          {state === "sending" ? "Submitting…" : settings.submitButtonText}
        </button>
      </div>
    </form>
  );
}
