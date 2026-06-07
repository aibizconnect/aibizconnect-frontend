"use client";

import { useState, useTransition } from "react";
import { setReviewStatusAction, deleteReviewAction } from "@/app/tenants/[tenantId]/reputation/actions";
import { reviewStats, type Review } from "@/lib/reputation";

const Stars = ({ n }: { n: number }) => <span className="text-amber-400">{"★".repeat(n)}<span className="text-slate-300">{"★".repeat(5 - n)}</span></span>;

export default function ReputationDashboard({ tenantId, initial }: { tenantId: string; initial: Review[] }) {
  const [reviews, setReviews] = useState<Review[]>(initial);
  const [pending, start] = useTransition();
  const stats = reviewStats(reviews);
  const reviewLink = `/review/${tenantId}`;

  const toggle = (r: Review) => start(async () => setReviews(await setReviewStatusAction(tenantId, r.id, r.status === "published" ? "hidden" : "published")));
  const del = (id: string) => start(async () => setReviews(await deleteReviewAction(tenantId, id)));

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Reputation</h1>
          <p className="text-sm text-slate-500">Collect, monitor &amp; showcase reviews. Share your review link to gather more.</p>
        </div>
        <a href={reviewLink} target="_blank" rel="noreferrer" className="rounded-lg bg-[#1e3a8a] px-4 py-2 text-sm font-medium text-white hover:bg-[#1e40af]">Review link ↗</a>
      </div>

      {/* stats */}
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm text-center">
          <div className="text-4xl font-semibold text-slate-900">{stats.avg || "—"}</div>
          <div className="mt-1"><Stars n={Math.round(stats.avg)} /></div>
          <div className="mt-1 text-xs text-slate-400">{stats.count} published review{stats.count === 1 ? "" : "s"}</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:col-span-2">
          {[5, 4, 3, 2, 1].map((star) => {
            const c = stats.distribution[star as 1 | 2 | 3 | 4 | 5];
            const pct = stats.count ? (c / stats.count) * 100 : 0;
            return (
              <div key={star} className="flex items-center gap-2 py-0.5 text-xs">
                <span className="w-6 text-slate-500">{star}★</span>
                <div className="h-2 flex-1 overflow-hidden rounded bg-slate-100"><div className="h-full bg-amber-400" style={{ width: `${pct}%` }} /></div>
                <span className="w-6 text-right text-slate-400">{c}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* list */}
      {reviews.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center text-sm text-slate-400">No reviews yet. Share your review link to collect the first one.</div>
      ) : (
        <div className="space-y-2">
          {reviews.map((r) => (
            <div key={r.id} className={`rounded-xl border bg-white p-4 shadow-sm ${r.status === "hidden" ? "border-slate-200 opacity-60" : "border-slate-200"}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2"><Stars n={r.rating} /><span className="text-sm font-medium text-slate-900">{r.author}</span><span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">{r.source}</span>{r.status === "hidden" && <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[10px] text-slate-500">hidden</span>}</div>
                  {r.body && <p className="mt-1 text-sm text-slate-600">{r.body}</p>}
                </div>
                <div className="flex shrink-0 gap-2">
                  <button onClick={() => toggle(r)} disabled={pending} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50">{r.status === "published" ? "Hide" : "Publish"}</button>
                  <button onClick={() => del(r.id)} disabled={pending} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50">Delete</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
