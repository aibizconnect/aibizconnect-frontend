"use client";

import { useState } from "react";

/** Public review submission (brand-themed). Customer picks stars + writes a review. */
export default function ReviewForm({ tenantId }: { tenantId: string }) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [author, setAuthor] = useState("");
  const [body, setBody] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    if (!rating) { setErr("Please choose a rating."); return; }
    setState("sending"); setErr(null);
    try {
      const r = await fetch("/api/reviews/submit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tenantId, author, rating, body }) });
      const j = await r.json();
      if (j.ok) setState("done"); else { setState("error"); setErr(j.error ?? "Please try again."); }
    } catch { setState("error"); setErr("Network error."); }
  }

  if (state === "done") {
    return <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-8 text-center"><h2 className="text-2xl font-semibold">🙏 Thank you!</h2><p className="mt-2 text-slate-300">We really appreciate your feedback.</p></div>;
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
      <div className="flex justify-center gap-1 text-4xl">
        {[1, 2, 3, 4, 5].map((s) => (
          <button key={s} onMouseEnter={() => setHover(s)} onMouseLeave={() => setHover(0)} onClick={() => setRating(s)}
            className={(hover || rating) >= s ? "text-amber-400" : "text-slate-600"} aria-label={`${s} stars`}>★</button>
        ))}
      </div>
      <div className="mt-5 space-y-3">
        <input value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="Your name (optional)" className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-[#22d3ee]" />
        <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={4} placeholder="Tell us about your experience…" className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-[#22d3ee]" />
      </div>
      {err && <p className="mt-2 text-sm text-red-400">{err}</p>}
      <button onClick={submit} disabled={state === "sending"} className="mt-4 w-full rounded-lg bg-[#2563eb] px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50">{state === "sending" ? "Submitting…" : "Submit review"}</button>
    </div>
  );
}
