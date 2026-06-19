"use client";

import { useState, useRef } from "react";
import { submitSiteRequest, listSiteRequests, type SiteRequest, type SiteRequestKind } from "@/app/platform/pages-actions";
import type { MarketingPage } from "@/lib/marketing/pages";

const SITE = "https://aibizconnect.app";
const KINDS: { value: SiteRequestKind; label: string; ph: string }[] = [
  { value: "change", label: "Change a page", ph: "e.g. On the Home hero, change the headline to “…” and make the CTA say “Get started free”." },
  { value: "add", label: "Add a new page", ph: "e.g. Add a Careers page with our mission, open roles, and a “Join us” CTA. Link it in the footer." },
  { value: "reorder", label: "Reorder / nav", ph: "e.g. In the top nav, move Pricing before Solutions. In the footer Product column, put AI Builder first." },
];

/** One-tap capability prompts — wire forms, calendars, bots, media, brand, SEO into the site via the AI. */
const CAP_PROMPTS: { label: string; text: string }[] = [
  { label: "+ Form", text: "Add a lead/contact form to this page that saves submissions to the CRM." },
  { label: "+ Calendar", text: "Add a booking calendar to this page so visitors can schedule a meeting." },
  { label: "+ AI assistant / bot", text: "Add the AI chat assistant to the site so it answers visitors and qualifies leads 24/7." },
  { label: "+ Slideshow / gallery", text: "Add an image slideshow / gallery to this page." },
  { label: "+ Photos / video", text: "Add photos and a short video to this page (from the Media Library)." },
  { label: "Fonts / logo / colors", text: "Update the brand on the site — fonts, logo, and colors." },
  { label: "Improve SEO / GEO", text: "Improve SEO/GEO on this page — titles, meta, structured data, and an FAQ." },
];

export interface SiteTool { label: string; href: string; icon: string; desc: string; external?: boolean }

export default function SitePagesConsole({ pages, groups, initial, tools }: { pages: MarketingPage[]; groups: string[]; initial: SiteRequest[]; tools: SiteTool[] }) {
  const [kind, setKind] = useState<SiteRequestKind>("change");
  const [route, setRoute] = useState<string>("/");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [requests, setRequests] = useState<SiteRequest[]>(initial);
  const panelRef = useRef<HTMLDivElement>(null);

  const ph = KINDS.find((k) => k.value === kind)!.ph;

  const startChange = (r: string) => { setKind("change"); setRoute(r); setMsg(null); panelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); };

  const submit = async () => {
    setBusy(true); setMsg(null);
    const r = await submitSiteRequest(kind, kind === "change" ? route : null, text);
    setBusy(false);
    if (!r.ok) { setMsg(r.error ?? "Could not submit."); return; }
    setText(""); setMsg("✓ Sent to the AI build agent. It'll be applied to the live site.");
    try { setRequests(await listSiteRequests()); } catch { /* ignore */ }
  };

  return (
    <div className="space-y-8">
      {/* Tools — the builders behind the site */}
      <div>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">Tools</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {tools.map((t) => (
            <a key={t.label} href={t.href} target={t.external ? "_blank" : undefined} rel={t.external ? "noreferrer" : undefined}
              className="group rounded-xl border border-slate-200 bg-white p-4 transition hover:border-[#1e3a8a]/40 hover:shadow">
              <div className="grid h-9 w-9 place-items-center rounded-lg bg-[#1e3a8a]/10 text-base">{t.icon}</div>
              <h4 className="mt-2 text-sm font-semibold text-slate-800 group-hover:text-[#1e3a8a]">{t.label}{t.external ? " ↗" : ""}</h4>
              <p className="mt-0.5 text-xs text-slate-500">{t.desc}</p>
            </a>
          ))}
        </div>
      </div>

      {/* Ask the AI */}
      <div ref={panelRef} className="rounded-xl border border-slate-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-slate-900">Ask the AI</h3>
        <p className="mt-0.5 text-xs text-slate-500">These pages are AI-built (not in the visual editor). Describe what you want — change a page, add a new one, or reorder the nav — and the AI applies it to the live site.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {KINDS.map((k) => (
            <button key={k.value} type="button" onClick={() => setKind(k.value)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium ${kind === k.value ? "bg-[#1e3a8a] text-white" : "border border-slate-300 text-slate-600 hover:bg-slate-50"}`}>{k.label}</button>
          ))}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] text-slate-400">Quick:</span>
          {CAP_PROMPTS.map((c) => (
            <button key={c.label} type="button" onClick={() => { setKind("change"); setText(c.text); setMsg(null); }}
              className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] text-slate-600 hover:border-[#1e3a8a]/40 hover:text-[#1e3a8a]">{c.label}</button>
          ))}
        </div>
        {kind === "change" && (
          <select value={route} onChange={(e) => setRoute(e.target.value)} className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
            {pages.map((p) => <option key={p.route} value={p.route}>{p.title} — {p.route}</option>)}
          </select>
        )}
        <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder={ph} rows={4}
          className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#1e3a8a] focus:outline-none" />
        {msg && <div className={`mt-2 text-xs ${msg.startsWith("✓") ? "text-emerald-600" : "text-red-600"}`}>{msg}</div>}
        <button type="button" disabled={busy || !text.trim()} onClick={submit}
          className="mt-3 rounded-lg bg-[#1e3a8a] px-4 py-2 text-sm font-medium text-white disabled:opacity-40">{busy ? "Sending…" : "Send to AI"}</button>
      </div>

      {/* Page catalog */}
      {groups.map((g) => {
        const inGroup = pages.filter((p) => p.group === g);
        if (!inGroup.length) return null;
        return (
          <div key={g}>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">{g}</h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {inGroup.map((p) => (
                <div key={p.route} className="flex flex-col rounded-xl border border-slate-200 bg-white p-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-slate-800">{p.title}</span>
                    <a href={`${SITE}${p.route}`} target="_blank" rel="noreferrer" className="text-xs font-medium text-[#1e3a8a] hover:underline">Open ↗</a>
                  </div>
                  <code className="mt-0.5 text-[11px] text-slate-400">{p.route}</code>
                  <p className="mt-2 flex-1 text-xs text-slate-500">{p.desc}</p>
                  <button type="button" onClick={() => startChange(p.route)} className="mt-3 self-start rounded-md border border-slate-300 px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-50">Change with AI</button>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {/* Request queue */}
      <div>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">Requests to the AI ({requests.length})</h3>
        {requests.length === 0 ? (
          <p className="text-sm text-slate-400">No requests yet. Use “Ask the AI” above.</p>
        ) : (
          <div className="space-y-2">
            {requests.map((r) => (
              <div key={r.id} className="rounded-lg border border-slate-200 bg-white px-4 py-3">
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                  <span className="rounded-full bg-[#1e3a8a]/10 px-2 py-0.5 font-semibold text-[#1e3a8a]">{r.kind}</span>
                  {r.route && <code className="text-slate-500">{r.route}</code>}
                  <span>· {new Date(r.created_at).toLocaleString()}</span>
                  {r.actor && <span>· {r.actor}</span>}
                </div>
                <p className="mt-1.5 whitespace-pre-wrap text-sm text-slate-700">{r.instruction}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
