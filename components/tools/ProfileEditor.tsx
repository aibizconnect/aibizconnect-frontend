"use client";

import { useState, useTransition } from "react";
import { saveProfileAction } from "@/app/tenants/[tenantId]/tools/actions";
import type { ToolProfile } from "@/lib/tools/registry";

const FIELDS: { key: keyof ToolProfile; label: string; type?: "textarea" | "select"; options?: string[]; placeholder?: string }[] = [
  { key: "businessName", label: "Business name", placeholder: "e.g. Acme Co." },
  { key: "industry", label: "Industry", placeholder: "e.g. Real Estate" },
  { key: "product", label: "Product / Service", type: "textarea", placeholder: "What you sell and its key benefits" },
  { key: "audience", label: "Target audience", placeholder: "e.g. First-time home buyers in Richmond Hill" },
  { key: "pricePoint", label: "Price point", type: "select", options: ["Budget", "Mid-Market", "Premium"] },
  { key: "geo", label: "Geographic focus", placeholder: "e.g. Richmond Hill, Ontario" },
];

export default function ProfileEditor({ tenantId, initial }: { tenantId: string; initial: ToolProfile }) {
  const [p, setP] = useState<ToolProfile>(initial);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState("");
  const [pending, start] = useTransition();
  const set = (k: keyof ToolProfile, v: string) => { setP((q) => ({ ...q, [k]: v })); setSaved(false); };

  const save = () => start(async () => {
    setErr("");
    const r = await saveProfileAction(tenantId, p);
    setSaved(r.ok);
    if (!r.ok) setErr(r.error || "Could not save (profile table may not be applied yet).");
  });

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="space-y-4">
        {FIELDS.map((f) => (
          <div key={f.key}>
            <label className="mb-1 block text-sm font-medium text-slate-700">{f.label}</label>
            {f.type === "textarea" ? (
              <textarea value={p[f.key]} onChange={(e) => set(f.key, e.target.value)} placeholder={f.placeholder} rows={3}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#1e3a8a]" />
            ) : f.type === "select" ? (
              <select value={p[f.key]} onChange={(e) => set(f.key, e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#1e3a8a]">
                {f.options?.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            ) : (
              <input value={p[f.key]} onChange={(e) => set(f.key, e.target.value)} placeholder={f.placeholder}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#1e3a8a]" />
            )}
          </div>
        ))}
      </div>
      {err && <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{err}</div>}
      <button onClick={save} disabled={pending} className="mt-5 rounded-lg bg-[#1e3a8a] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
        {pending ? "Saving…" : saved ? "Saved ✓" : "Save profile"}
      </button>
    </div>
  );
}
