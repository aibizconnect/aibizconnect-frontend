"use client";

import { useState } from "react";

/**
 * Live contact form on a published site / funnel step. A visitor submits their own
 * details → POST /api/leads/submit → a Contact appears in the tenant's CRM. No send/charge.
 */
type Field = { name: string; label: string; type: string };

export default function SiteContactForm({ tenantId, heading, fields, submitLabel }: { tenantId: string; heading?: string; fields?: Field[]; submitLabel?: string }) {
  const flds: Field[] = fields && fields.length ? fields : [
    { name: "name", label: "Your name", type: "text" },
    { name: "email", label: "Email", type: "email" },
    { name: "message", label: "How can we help?", type: "textarea" },
  ];
  const [values, setValues] = useState<Record<string, string>>({});
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("sending"); setErr(null);
    try {
      const r = await fetch("/api/leads/submit", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId, name: values.name, email: values.email, phone: values.phone, message: values.message, source: "website form" }),
      });
      const j = await r.json();
      if (j.ok) setState("done"); else { setState("error"); setErr(j.error ?? "Please try again."); }
    } catch { setState("error"); setErr("Network error. Please try again."); }
  }

  if (state === "done") {
    return (
      <section className="mx-auto max-w-xl px-6 py-16 text-center">
        {heading && <h2 className="text-2xl font-semibold">{heading}</h2>}
        <p className="mt-3 rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-emerald-800">✓ Thanks — we&apos;ve got your details and will be in touch shortly.</p>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-xl px-6 py-16">
      {heading && <h2 className="mb-5 text-center text-2xl font-semibold">{heading}</h2>}
      <form onSubmit={submit} className="space-y-3">
        {flds.map((f) => (
          <label key={f.name} className="block">
            <span className="mb-1 block text-sm font-medium">{f.label}</span>
            {f.type === "textarea" ? (
              <textarea required={f.name === "email"} rows={4} value={values[f.name] ?? ""} onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2" />
            ) : (
              <input type={f.type === "email" ? "email" : f.type === "tel" ? "tel" : "text"} required={f.name === "email"} value={values[f.name] ?? ""} onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2" />
            )}
          </label>
        ))}
        {err && <p className="text-sm text-red-600">{err}</p>}
        <button type="submit" disabled={state === "sending"} className="w-full rounded-lg bg-[var(--abc-color-primary,#2563eb)] px-5 py-2.5 font-medium text-white transition hover:opacity-90 disabled:opacity-50">
          {state === "sending" ? "Sending…" : (submitLabel || "Send")}
        </button>
      </form>
    </section>
  );
}
