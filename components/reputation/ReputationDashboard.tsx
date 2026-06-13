"use client";

import { useEffect, useState, useTransition } from "react";
import {
  setReviewStatusAction, deleteReviewAction, reputationBootstrapAction, sendReviewRequestAction,
  type ReqContact,
} from "@/app/tenants/[tenantId]/reputation/actions";
import { reviewStats, type Review } from "@/lib/reputation";
import type { ReviewRequest } from "@/lib/server/review-requests";

const Stars = ({ n }: { n: number }) => <span className="text-amber-400">{"★".repeat(n)}<span className="text-slate-300">{"★".repeat(5 - n)}</span></span>;

export default function ReputationDashboard({ tenantId, initial }: { tenantId: string; initial: Review[] }) {
  const [tab, setTab] = useState<"reviews" | "requests" | "widget" | "listings">("reviews");
  const [reviews, setReviews] = useState<Review[]>(initial);
  const [pending, start] = useTransition();
  const stats = reviewStats(reviews);
  const reviewLink = `/review/${tenantId}`;

  const toggle = (r: Review) => start(async () => setReviews(await setReviewStatusAction(tenantId, r.id, r.status === "published" ? "hidden" : "published")));
  const del = (id: string) => start(async () => setReviews(await deleteReviewAction(tenantId, id)));

  const tabBtn = (k: typeof tab, label: string, soon = false) => (
    <button onClick={() => !soon && setTab(k)} className={`-mb-px flex items-center gap-1 border-b-2 px-1 pb-2 text-sm font-medium ${tab === k ? "border-[#1e3a8a] text-[#1e3a8a]" : "border-transparent text-slate-500 hover:text-slate-800"} ${soon ? "cursor-default opacity-50" : ""}`}>
      {label}{soon && <span className="rounded bg-slate-100 px-1 text-[9px] uppercase text-slate-400">soon</span>}
    </button>
  );

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Reputation</h1>
          <p className="text-sm text-slate-500">Collect, monitor &amp; showcase reviews.</p>
        </div>
        <a href={reviewLink} target="_blank" rel="noreferrer" className="rounded-lg bg-[#1e3a8a] px-4 py-2 text-sm font-medium text-white hover:bg-[#1e40af]">Review link ↗</a>
      </div>

      <div className="mb-5 flex gap-5 border-b border-slate-200">
        {tabBtn("reviews", "Reviews")}{tabBtn("requests", "Requests")}{tabBtn("widget", "Widget")}{tabBtn("listings", "Listings", true)}
      </div>

      {tab === "reviews" && (
        <>
          <div className="mb-6 grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-white p-5 text-center shadow-sm">
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
          {reviews.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center text-sm text-slate-400">No reviews yet. Share your review link or send a request.</div>
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
        </>
      )}

      {tab === "requests" && <RequestsTab tenantId={tenantId} />}
      {tab === "widget" && <WidgetTab tenantId={tenantId} />}
    </div>
  );
}

function RequestsTab({ tenantId }: { tenantId: string }) {
  const [contacts, setContacts] = useState<ReqContact[]>([]);
  const [requests, setRequests] = useState<ReviewRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [contactId, setContactId] = useState("");
  const [channel, setChannel] = useState<"email" | "sms">("email");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => { reputationBootstrapAction(tenantId).then((b) => { setContacts(b.contacts); setRequests(b.requests); }).catch(() => {}).finally(() => setLoading(false)); }, [tenantId]);

  async function send() {
    if (!contactId) return;
    setBusy(true); setMsg(null);
    try { const r = await sendReviewRequestAction(tenantId, contactId, channel); setRequests(r.requests); setMsg(r.ok ? "Request sent." : (r.error ?? "Could not send.")); }
    finally { setBusy(false); }
  }
  if (loading) return <p className="text-sm text-slate-400">Loading…</p>;
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="mb-2 text-sm font-semibold text-slate-700">Send a review request</div>
        <div className="flex flex-wrap items-center gap-2">
          <select value={contactId} onChange={(e) => setContactId(e.target.value)} className="min-w-[220px] flex-1 rounded-lg border border-slate-300 px-2 py-2 text-sm">
            <option value="">— choose a contact —</option>
            {contacts.map((c) => <option key={c.id} value={c.id}>{c.name}{c.email ? ` · ${c.email}` : c.phone ? ` · ${c.phone}` : ""}</option>)}
          </select>
          <select value={channel} onChange={(e) => setChannel(e.target.value as "email" | "sms")} className="rounded-lg border border-slate-300 px-2 py-2 text-sm"><option value="email">Email</option><option value="sms">SMS</option></select>
          <button onClick={send} disabled={busy || !contactId} className="rounded-lg bg-[#1e3a8a] px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{busy ? "Sending…" : "Send request"}</button>
        </div>
        {msg && <p className="mt-2 text-xs text-slate-500">{msg}</p>}
        <p className="mt-2 text-[11px] text-slate-400">1:1 send — opted-out (DND / Unsubscribed) contacts are skipped. Email needs a verified sender; SMS needs Twilio connected.</p>
      </div>

      <div>
        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Sent requests</div>
        {requests.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-400">No requests sent yet.</p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-2">Contact</th><th className="px-4 py-2">Channel</th><th className="px-4 py-2">Status</th><th className="px-4 py-2">Sent</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {requests.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2 text-slate-700">{r.contactName}</td>
                    <td className="px-4 py-2 capitalize text-slate-500">{r.channel}</td>
                    <td className="px-4 py-2"><span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${r.status === "sent" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>{r.status}</span>{r.error && <span className="ml-1 text-[11px] text-rose-500" title={r.error}>⚠</span>}</td>
                    <td className="px-4 py-2 text-slate-400">{new Date(r.sentAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function WidgetTab({ tenantId }: { tenantId: string }) {
  const [origin, setOrigin] = useState("");
  useEffect(() => { setOrigin(window.location.origin); }, []);
  const url = `${origin}/reviews/${tenantId}/widget`;
  const embed = `<iframe src="${url}" width="100%" height="420" style="border:none" loading="lazy"></iframe>`;
  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">Embed your published reviews on any website — it updates automatically as you publish new ones.</p>
      <div>
        <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Embed code</div>
        <textarea readOnly value={embed} rows={3} onClick={(e) => (e.target as HTMLTextAreaElement).select()} className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 font-mono text-xs text-slate-700" />
        <button onClick={async () => { try { await navigator.clipboard.writeText(embed); alert("Embed code copied."); } catch { /* */ } }} className="mt-2 rounded-lg bg-[#1e3a8a] px-3 py-1.5 text-sm font-medium text-white">Copy embed code</button>
        <a href={url} target="_blank" rel="noreferrer" className="ml-2 text-sm text-[#1e3a8a] hover:underline">Preview ↗</a>
      </div>
      <div>
        <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Live preview</div>
        {origin && <iframe src={url} className="h-[420px] w-full rounded-xl border border-slate-200" />}
      </div>
    </div>
  );
}
