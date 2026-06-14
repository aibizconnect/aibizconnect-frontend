"use client";

import { useState } from "react";
import { buyCourse, enrollFree } from "@/app/learn/[tenantId]/[courseId]/actions";

/** Paywall / enroll CTA on the public course viewer (D-349). */
export default function CoursePaywall({ tenantId, courseId, priceLabel, isPaid }: { tenantId: string; courseId: string; priceLabel: string; isPaid: boolean }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function go() {
    setBusy(true); setMsg(null);
    try {
      if (isPaid) {
        const r = await buyCourse(tenantId, courseId);
        if (r.needLogin) { window.location.href = `/portal/${tenantId}`; return; }
        if (r.ok && r.url) { window.location.href = r.url; return; }
        setMsg(r.error ?? "Couldn't start checkout.");
      } else {
        const r = await enrollFree(tenantId, courseId);
        if (r.needLogin) { window.location.href = `/portal/${tenantId}`; return; }
        if (r.ok) { window.location.reload(); return; }
        setMsg(r.error ?? "Couldn't enroll.");
      }
    } finally { setBusy(false); }
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center">
      <div className="text-lg font-semibold">{isPaid ? `Unlock this course — ${priceLabel}` : "Enroll for free"}</div>
      <p className="mt-1 text-sm text-slate-400">{isPaid ? "One-time payment for lifetime access." : "Get instant access to every lesson."}</p>
      <button onClick={go} disabled={busy} className="mt-4 rounded-lg bg-[#2563eb] px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{busy ? "…" : isPaid ? `Buy — ${priceLabel}` : "Enroll free"}</button>
      {msg && <div className="mt-3 text-sm text-rose-300">{msg}</div>}
      <p className="mt-3 text-xs text-slate-500">You&apos;ll sign in with your email to access purchased courses anytime.</p>
    </div>
  );
}
