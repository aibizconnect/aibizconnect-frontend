"use client";

import { useEffect, useMemo, useState } from "react";
import {
  listCampaignsAction, saveCampaignAction, deleteCampaignAction, audienceCountAction,
  draftCampaignAction, sendCampaignTestAction, sendCampaignAction, marketingStatusAction,
  listTemplatesAction, saveTemplateAction, deleteTemplateAction,
  type MarketingStatus, type EmailTemplate,
} from "@/app/tenants/[tenantId]/marketing/actions";
import type { EmailCampaign } from "@/lib/server/email-campaigns";
import { confirmDialog, notify } from "@/lib/ui/dialogs";

/**
 * MARKETING hub (D-280). Email campaigns end-to-end under the DRAFTS-ONLY law:
 * AI drafts, you review, you press Send — nothing sends itself. Do-Not-Contact /
 * Unsubscribed / Bounced contacts are excluded from every audience, always.
 * Social + SMS are honest "Soon" cards with their designs noted.
 */

const inp = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a]";
const lbl = "mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500";

const newCampaign = (): EmailCampaign => ({
  id: crypto.randomUUID(), name: "New campaign", subject: "", preheader: "", body: "",
  audience: { mode: "all", tags: [] }, status: "draft",
  stats: { recipients: 0, sent: 0, failed: 0 }, log: [],
  createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), sentAt: null,
});

export default function MarketingHub({ tenantId, initialCampaigns, status }: {
  tenantId: string; initialCampaigns: EmailCampaign[]; status: MarketingStatus;
}) {
  const [tab, setTab] = useState<"campaigns" | "templates" | "social" | "sms">("campaigns");
  const [campaigns, setCampaigns] = useState(initialCampaigns);
  const [editing, setEditing] = useState<EmailCampaign | null>(null);

  const tabBtn = (k: typeof tab, label: string, soon = false) => (
    <button onClick={() => setTab(k)} className={`flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium ${tab === k ? "border-[#1e3a8a] text-[#1e3a8a]" : "border-transparent text-slate-500 hover:text-slate-700"}`}>
      {label}{soon && <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-slate-500">Soon</span>}
    </button>
  );

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Marketing</h1>
      <p className="mt-1 text-sm text-slate-500">Email campaigns to your contacts — AI-drafted, human-approved. Nothing ever sends without your explicit click, and opted-out contacts are always excluded.</p>

      {!status.emailReady && (
        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          <b>Email sending isn&apos;t set up yet.</b> You can build and AI-draft campaigns now; to send, add a verified sender in Sites → your website → Settings → Email sending.{status.emailReason ? ` (${status.emailReason})` : ""}
        </div>
      )}

      <div className="mt-4 flex gap-1 border-b border-slate-200">
        {tabBtn("campaigns", "Campaigns")}
        {tabBtn("templates", "Templates")}
        {tabBtn("social", "Social Planner", true)}
        {tabBtn("sms", "SMS Campaigns", true)}
      </div>

      {tab === "campaigns" && !editing && (
        <CampaignList campaigns={campaigns} onNew={() => setEditing(newCampaign())} onEdit={setEditing}
          onDelete={async (c) => {
            if (!(await confirmDialog(`Delete campaign "${c.name}"?`))) return;
            await deleteCampaignAction(tenantId, c.id);
            setCampaigns((p) => p.filter((x) => x.id !== c.id));
          }} />
      )}
      {tab === "campaigns" && editing && (
        <CampaignEditor tenantId={tenantId} campaign={editing} status={status}
          onClose={() => setEditing(null)}
          onSaved={(c) => setCampaigns((p) => (p.some((x) => x.id === c.id) ? p.map((x) => (x.id === c.id ? c : x)) : [c, ...p]))} />
      )}
      {tab === "templates" && <TemplatesTab tenantId={tenantId} onUse={(t) => { setEditing({ ...newCampaign(), name: t.name, subject: t.subject, preheader: t.preheader, body: t.body }); setTab("campaigns"); }} />}
      {tab === "social" && (
        <SoonCard title="Social Planner" body="Plan and schedule posts to Facebook, Instagram and LinkedIn from one calendar — your connected social accounts are already in Settings. Posting APIs land with the Automations engine." />
      )}
      {tab === "sms" && (
        <SoonCard title="SMS Campaigns" body="Bulk text campaigns over your connected Twilio number with mandatory SMS-consent filtering (the SMS Consent custom field is already in your CRM) and reply STOP handling. Built after carrier-compliance (A2P) registration." />
      )}
    </div>
  );
}

function SoonCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="mt-6 max-w-xl rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5">
      <div className="text-sm font-semibold text-slate-700">{title} <span className="ml-1 rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-slate-500">Soon</span></div>
      <p className="mt-1 text-sm text-slate-500">{body}</p>
    </div>
  );
}

function CampaignList({ campaigns, onNew, onEdit, onDelete }: {
  campaigns: EmailCampaign[]; onNew: () => void; onEdit: (c: EmailCampaign) => void; onDelete: (c: EmailCampaign) => void;
}) {
  return (
    <div className="mt-5 space-y-3">
      <button onClick={onNew} className="rounded-lg bg-[#1e3a8a] px-4 py-2 text-sm font-medium text-white">+ New campaign</button>
      {campaigns.length === 0 && <p className="py-8 text-center text-sm text-slate-400">No campaigns yet — create one and let the AI draft it.</p>}
      {campaigns.map((c) => (
        <div key={c.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="truncate font-medium text-slate-900">{c.name}</span>
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${c.status === "sent" ? "bg-emerald-100 text-emerald-700" : c.status === "sending" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-500"}`}>{c.status}</span>
            </div>
            <div className="truncate text-xs text-slate-500">{c.subject || "(no subject yet)"}{c.status === "sent" ? ` — ${c.stats.sent} sent${c.stats.failed ? `, ${c.stats.failed} failed` : ""}` : ""}</div>
          </div>
          <div className="flex shrink-0 gap-2">
            <button onClick={() => onEdit(c)} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:border-[#1e3a8a] hover:text-[#1e3a8a]">{c.status === "sent" ? "View" : "Edit"}</button>
            <button onClick={() => onDelete(c)} className="rounded-lg px-2 py-1.5 text-sm text-slate-400 hover:text-red-600">✕</button>
          </div>
        </div>
      ))}
    </div>
  );
}

function CampaignEditor({ tenantId, campaign: initial, status, onClose, onSaved }: {
  tenantId: string; campaign: EmailCampaign; status: MarketingStatus;
  onClose: () => void; onSaved: (c: EmailCampaign) => void;
}) {
  const [c, setC] = useState(initial);
  const [busy, setBusy] = useState<string | null>(null);
  const [brief, setBrief] = useState("");
  const [testTo, setTestTo] = useState("");
  const [count, setCount] = useState<{ count: number; sample: string[] } | null>(null);
  const sent = c.status === "sent";
  const set = <K extends keyof EmailCampaign>(k: K, v: EmailCampaign[K]) => setC((p) => ({ ...p, [k]: v }));

  useEffect(() => {
    let live = true;
    audienceCountAction(tenantId, c.audience).then((r) => { if (live) setCount(r); }).catch(() => {});
    return () => { live = false; };
  }, [tenantId, c.audience]);

  const save = async (silent = false): Promise<boolean> => {
    setBusy("save");
    const r = await saveCampaignAction(tenantId, c);
    setBusy(null);
    if (r.ok) { onSaved(c); if (!silent) notify("Saved ✓"); }
    else notify(r.message ?? "Could not save.");
    return r.ok;
  };

  const draft = async () => {
    setBusy("draft");
    const r = await draftCampaignAction(tenantId, brief);
    setBusy(null);
    if (r.ok) setC((p) => ({ ...p, subject: r.subject ?? p.subject, preheader: r.preheader ?? p.preheader, body: r.body ?? p.body }));
    else notify(r.message ?? "Draft failed.");
  };

  const sendTest = async () => {
    if (!testTo.trim()) { notify("Enter your email for the test."); return; }
    setBusy("test");
    const r = await sendCampaignTestAction(tenantId, c, testTo.trim());
    setBusy(null);
    notify(r.ok ? `Test sent to ${testTo.trim()} ✓` : r.error ?? "Test failed.");
  };

  const sendReal = async () => {
    if (!(await save(true))) return;
    const n = count?.count ?? 0;
    if (!(await confirmDialog(`Send "${c.name}" to ${n} contact${n === 1 ? "" : "s"} now? This cannot be undone.`))) return;
    setBusy("send");
    const r = await sendCampaignAction(tenantId, c.id);
    setBusy(null);
    if (r.ok) {
      const done = { ...c, status: "sent" as const, sentAt: new Date().toISOString(), stats: { ...c.stats, recipients: count?.count ?? 0, sent: r.sent ?? 0, failed: r.failed ?? 0 } };
      setC(done); onSaved(done);
      notify(`Campaign sent — ${r.sent} delivered to Resend${r.failed ? `, ${r.failed} failed` : ""}.`);
    } else notify(r.error ?? "Send failed.");
  };

  const tagChip = (t: string) => {
    const on = c.audience.tags.includes(t);
    return (
      <button key={t} disabled={sent} onClick={() => set("audience", { mode: "tags", tags: on ? c.audience.tags.filter((x) => x !== t) : [...c.audience.tags, t] })}
        className={`rounded-full px-2.5 py-1 text-xs ${on ? "bg-[#1e3a8a] text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>{t}</button>
    );
  };

  const preview = useMemo(() => c.body.split(/\n{2,}/).map((p, i) => <p key={i} className="mb-3 text-[15px] leading-relaxed text-slate-800">{p.split("\n").map((l, j) => <span key={j}>{l}<br /></span>)}</p>), [c.body]);

  return (
    <div className="mt-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button onClick={onClose} className="text-sm text-slate-400 hover:text-slate-600">← All campaigns</button>
        {!sent && (
          <div className="flex items-center gap-2">
            <button onClick={() => save()} disabled={!!busy} className="rounded-lg border border-slate-300 px-4 py-1.5 text-sm text-slate-700 disabled:opacity-50">{busy === "save" ? "Saving…" : "Save draft"}</button>
            <button onClick={sendReal} disabled={!!busy || !status.emailReady || !(count?.count) || !c.subject.trim() || !c.body.trim()}
              title={!status.emailReady ? "Set up a verified sender first" : undefined}
              className="rounded-lg bg-emerald-600 px-4 py-1.5 text-sm font-medium text-white disabled:opacity-40">{busy === "send" ? "Sending…" : `Send to ${count?.count ?? "…"} contacts`}</button>
          </div>
        )}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="space-y-4">
          <label><span className={lbl}>Campaign name (internal)</span>
            <input className={inp} disabled={sent} value={c.name} onChange={(e) => set("name", e.target.value)} /></label>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <span className={lbl}>Audience</span>
            <div className="flex gap-2">
              {(["all", "tags"] as const).map((m) => (
                <button key={m} disabled={sent} onClick={() => set("audience", { mode: m, tags: m === "all" ? [] : c.audience.tags })}
                  className={`rounded-lg px-3 py-1.5 text-sm ${c.audience.mode === m ? "bg-[#1e3a8a] text-white" : "bg-slate-100 text-slate-600"}`}>
                  {m === "all" ? "All contacts" : "By tags"}
                </button>
              ))}
            </div>
            {c.audience.mode === "tags" && (
              <div className="mt-3 flex max-h-36 flex-wrap gap-1.5 overflow-y-auto">{status.tags.map(tagChip)}</div>
            )}
            <p className="mt-3 text-xs text-slate-500">
              <b className="text-slate-700">{count ? `${count.count} sendable contact${count.count === 1 ? "" : "s"}` : "Counting…"}</b>
              {count?.sample.length ? ` — e.g. ${count.sample.slice(0, 3).join(", ")}` : ""}
            </p>
            <p className="mt-1 text-[11px] text-slate-400">Do Not Contact, Unsubscribed, Bounced and DND contacts are always excluded.</p>
          </div>

          {!sent && (
            <div className="rounded-xl border border-violet-200 bg-violet-50 p-4">
              <span className={lbl}>✨ Draft with AI</span>
              <textarea className={`${inp} min-h-[60px]`} value={brief} onChange={(e) => setBrief(e.target.value)}
                placeholder="What is this email about? e.g. Invite past clients to book a free spring portfolio review, friendly tone, one clear booking CTA." />
              <button onClick={draft} disabled={!!busy} className="mt-2 rounded-lg bg-violet-600 px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50">{busy === "draft" ? "Drafting…" : "Draft subject + body"}</button>
            </div>
          )}

          <label><span className={lbl}>Subject</span>
            <input className={inp} disabled={sent} value={c.subject} onChange={(e) => set("subject", e.target.value)} /></label>
          <label><span className={lbl}>Preheader (inbox preview line)</span>
            <input className={inp} disabled={sent} value={c.preheader} onChange={(e) => set("preheader", e.target.value)} /></label>
          <label><span className={lbl}>Body (plain text — blank line = new paragraph)</span>
            <textarea className={`${inp} min-h-[220px]`} disabled={sent} value={c.body} onChange={(e) => set("body", e.target.value)} /></label>

          {!sent && (
            <div className="flex items-center gap-2">
              <input className={inp} placeholder="you@yourbiz.com" value={testTo} onChange={(e) => setTestTo(e.target.value)} />
              <button onClick={sendTest} disabled={!!busy || !status.emailReady} className="shrink-0 rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 disabled:opacity-40">{busy === "test" ? "Sending…" : "Send me a test"}</button>
            </div>
          )}
        </div>

        <div>
          <span className={lbl}>Preview</span>
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="border-b border-slate-100 pb-3">
              <div className="text-sm font-semibold text-slate-900">{c.subject || <span className="text-slate-300">Subject…</span>}</div>
              <div className="text-xs text-slate-400">{c.preheader || "Preheader…"}</div>
            </div>
            <div className="pt-4">{c.body ? preview : <p className="text-sm text-slate-300">Body preview appears here…</p>}</div>
          </div>
          {c.log.length > 0 && (
            <div className="mt-4">
              <span className={lbl}>Send log</span>
              <div className="max-h-44 overflow-y-auto rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-500">
                {c.log.slice().reverse().map((l, i) => <div key={i}>{new Date(l.at).toLocaleString()} — {l.event}{l.detail ? `: ${l.detail}` : ""}</div>)}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TemplatesTab({ tenantId, onUse }: { tenantId: string; onUse: (t: EmailTemplate) => void }) {
  const [templates, setTemplates] = useState<EmailTemplate[] | null>(null);
  const [editing, setEditing] = useState<EmailTemplate | null>(null);
  useEffect(() => { listTemplatesAction(tenantId).then(setTemplates).catch(() => setTemplates([])); }, [tenantId]);
  const blank = (): EmailTemplate => ({ id: crypto.randomUUID(), name: "New template", subject: "", preheader: "", body: "", updatedAt: "" });

  if (!templates) return <p className="py-8 text-center text-sm text-slate-400">Loading…</p>;
  if (editing) {
    const set = (k: keyof EmailTemplate, v: string) => setEditing((p) => (p ? { ...p, [k]: v } : p));
    return (
      <div className="mt-5 max-w-xl space-y-3">
        <button onClick={() => setEditing(null)} className="text-sm text-slate-400 hover:text-slate-600">← Templates</button>
        <label><span className={lbl}>Name</span><input className={inp} value={editing.name} onChange={(e) => set("name", e.target.value)} /></label>
        <label><span className={lbl}>Subject</span><input className={inp} value={editing.subject} onChange={(e) => set("subject", e.target.value)} /></label>
        <label><span className={lbl}>Preheader</span><input className={inp} value={editing.preheader} onChange={(e) => set("preheader", e.target.value)} /></label>
        <label><span className={lbl}>Body</span><textarea className={`${inp} min-h-[180px]`} value={editing.body} onChange={(e) => set("body", e.target.value)} /></label>
        <button onClick={async () => { const r = await saveTemplateAction(tenantId, editing); if (r.ok) { setTemplates((p) => [...(p ?? []).filter((x) => x.id !== editing.id), editing].sort((a, b) => a.name.localeCompare(b.name))); setEditing(null); } else notify(r.message ?? "Could not save."); }}
          className="rounded-lg bg-[#1e3a8a] px-4 py-2 text-sm font-medium text-white">Save template</button>
      </div>
    );
  }
  return (
    <div className="mt-5 space-y-3">
      <button onClick={() => setEditing(blank())} className="rounded-lg bg-[#1e3a8a] px-4 py-2 text-sm font-medium text-white">+ New template</button>
      {templates.length === 0 && <p className="py-8 text-center text-sm text-slate-400">No templates yet — save a reusable subject + body once, start campaigns from it forever.</p>}
      {templates.map((t) => (
        <div key={t.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4">
          <div className="min-w-0">
            <div className="truncate font-medium text-slate-900">{t.name}</div>
            <div className="truncate text-xs text-slate-500">{t.subject || "(no subject)"}</div>
          </div>
          <div className="flex shrink-0 gap-2">
            <button onClick={() => onUse(t)} className="rounded-lg bg-[#1e3a8a] px-3 py-1.5 text-sm text-white">Use in campaign</button>
            <button onClick={() => setEditing(t)} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700">Edit</button>
            <button onClick={async () => { if (await confirmDialog(`Delete template "${t.name}"?`)) { await deleteTemplateAction(tenantId, t.id); setTemplates((p) => (p ?? []).filter((x) => x.id !== t.id)); } }}
              className="rounded-lg px-2 py-1.5 text-sm text-slate-400 hover:text-red-600">✕</button>
          </div>
        </div>
      ))}
    </div>
  );
}
