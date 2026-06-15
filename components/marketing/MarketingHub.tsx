"use client";

import { useEffect, useMemo, useState } from "react";
import {
  listCampaignsAction, saveCampaignAction, deleteCampaignAction, audienceCountAction,
  draftCampaignAction, sendCampaignTestAction, sendCampaignAction, marketingStatusAction,
  listTemplatesAction, saveTemplateAction, deleteTemplateAction,
  listSmsCampaignsAction, saveSmsCampaignAction, deleteSmsCampaignAction, smsAudienceCountAction,
  draftSmsCampaignAction, sendSmsTestAction, sendSmsCampaignAction,
  listTriggerLinksAction, saveTriggerLinkAction, deleteTriggerLinkAction,
  getEmailBrandingAction, saveEmailBrandingAction,
  type MarketingStatus, type EmailTemplate,
} from "@/app/tenants/[tenantId]/marketing/actions";
import type { EmailBranding } from "@/lib/server/email-branding";
import type { EmailCampaign } from "@/lib/server/email-campaigns";
import type { SmsCampaign } from "@/lib/server/sms-campaigns";
import type { TriggerLink } from "@/lib/server/trigger-links";
import type { SocialAccountView } from "@/lib/server/social";
import SocialPlanner from "@/components/marketing/SocialPlanner";
import { confirmDialog, notify } from "@/lib/ui/dialogs";
import { REALTOR_EMAIL_PRESETS, REALTOR_SMS_PRESETS } from "@/lib/marketing/realtor-presets";

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

export default function MarketingHub({ tenantId, initialCampaigns, status, socialAccounts }: {
  tenantId: string; initialCampaigns: EmailCampaign[]; status: MarketingStatus; socialAccounts: SocialAccountView[];
}) {
  const [tab, setTab] = useState<"campaigns" | "templates" | "sms" | "links" | "social" | "branding">("campaigns");
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
        {tabBtn("branding", "Email Branding")}
        {tabBtn("sms", "SMS Campaigns")}
        {tabBtn("links", "Trigger Links")}
        {tabBtn("social", "Social Planner")}
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
      {tab === "branding" && <BrandingTab tenantId={tenantId} />}
      {tab === "social" && <SocialPlanner tenantId={tenantId} accounts={socialAccounts} />}
      {tab === "sms" && <SmsTab tenantId={tenantId} status={status} />}
      {tab === "links" && <LinksTab tenantId={tenantId} status={status} />}
    </div>
  );
}

// ── Trigger Links (D-319) ─────────────────────────────────────────────────────
function LinksTab({ tenantId, status }: { tenantId: string; status: MarketingStatus }) {
  const [links, setLinks] = useState<TriggerLink[] | null>(null);
  const [modal, setModal] = useState<TriggerLink | "new" | null>(null);
  const [origin, setOrigin] = useState("");
  useEffect(() => { setOrigin(window.location.origin); listTriggerLinksAction(tenantId).then(setLinks).catch(() => setLinks([])); }, [tenantId]);
  const shortUrl = (slug: string) => `${origin}/l/${slug}`;
  async function copy(t: string) { try { await navigator.clipboard.writeText(t); alert("Link copied."); } catch { /* */ } }

  return (
    <div className="mt-5 space-y-3">
      <button onClick={() => setModal("new")} className="rounded-lg bg-[#1e3a8a] px-4 py-2 text-sm font-medium text-white">+ New trigger link</button>
      <p className="text-xs text-slate-500">Trackable short links. Drop one in an email or SMS; clicks are counted and (when sent to a known contact) the link&apos;s tags are applied — so a click can drive segmentation.</p>
      {links === null ? <p className="py-8 text-center text-sm text-slate-400">Loading…</p> : links.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-400">No trigger links yet.</p>
      ) : links.map((l) => (
        <div key={l.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4">
          <div className="min-w-0">
            <div className="font-medium text-slate-900">{l.name}</div>
            <div className="truncate text-xs text-slate-500">{shortUrl(l.slug)} → {l.redirectUrl}</div>
            <div className="mt-0.5 flex flex-wrap gap-1 text-[11px] text-slate-400">{l.clicks} clicks{l.tagsToAdd.length > 0 && <> · tags: {l.tagsToAdd.join(", ")}</>}</div>
          </div>
          <div className="flex shrink-0 gap-2 text-sm">
            <button onClick={() => copy(shortUrl(l.slug))} className="rounded-lg border border-slate-300 px-3 py-1.5 text-slate-700 hover:border-[#1e3a8a] hover:text-[#1e3a8a]">Copy</button>
            <button onClick={() => setModal(l)} className="rounded-lg border border-slate-300 px-3 py-1.5 text-slate-700">Edit</button>
            <button onClick={async () => { if (confirm(`Delete "${l.name}"?`)) setLinks(await deleteTriggerLinkAction(tenantId, l.id)); }} className="rounded-lg px-2 py-1.5 text-slate-400 hover:text-red-600">✕</button>
          </div>
        </div>
      ))}
      {modal && <LinkModal tenantId={tenantId} initial={modal === "new" ? null : modal} tags={status.tags} onClose={() => setModal(null)} onSaved={(list) => { setLinks(list); setModal(null); }} />}
    </div>
  );
}

function LinkModal({ tenantId, initial, tags, onClose, onSaved }: { tenantId: string; initial: TriggerLink | null; tags: string[]; onClose: () => void; onSaved: (list: TriggerLink[]) => void }) {
  const [name, setName] = useState(initial?.name ?? "");
  const [url, setUrl] = useState(initial?.redirectUrl ?? "https://");
  const [picked, setPicked] = useState<string[]>(initial?.tagsToAdd ?? []);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  async function save() {
    setBusy(true); setErr(null);
    try { const r = await saveTriggerLinkAction(tenantId, { id: initial?.id, name, redirectUrl: url, tagsToAdd: picked }); if (!r.ok) setErr(r.error ?? "Save failed."); else onSaved(r.links); }
    finally { setBusy(false); }
  }
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/40 p-4 pt-24" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-3 text-base font-semibold text-slate-900">{initial ? "Edit trigger link" : "New trigger link"}</h2>
        <div className="space-y-3">
          <label className="block text-sm"><span className="mb-1 block text-xs text-slate-500">Name</span><input value={name} onChange={(e) => setName(e.target.value)} className={inp} placeholder="Spring offer" /></label>
          <label className="block text-sm"><span className="mb-1 block text-xs text-slate-500">Redirect URL</span><input value={url} onChange={(e) => setUrl(e.target.value)} className={inp} placeholder="https://…" /></label>
          <div>
            <span className="mb-1 block text-xs text-slate-500">Apply tags on click (optional)</span>
            <div className="flex flex-wrap gap-1">
              {tags.length === 0 && <span className="text-xs text-slate-400">No tags yet — create tags in Contacts.</span>}
              {tags.map((t) => { const on = picked.includes(t); return <button key={t} onClick={() => setPicked(on ? picked.filter((x) => x !== t) : [...picked, t])} className={`rounded-full px-2 py-0.5 text-[11px] ${on ? "bg-[#1e3a8a] text-white" : "text-slate-600 ring-1 ring-slate-200"}`}>{t}</button>; })}
            </div>
          </div>
          {err && <div className="rounded-md bg-rose-50 px-3 py-1.5 text-xs text-rose-700">{err}</div>}
          <div className="flex justify-end gap-2">
            <button onClick={onClose} className="rounded-lg px-3 py-1.5 text-sm text-slate-500 hover:text-slate-800">Cancel</button>
            <button onClick={save} disabled={busy} className="rounded-lg bg-[#1e3a8a] px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50">{busy ? "Saving…" : "Save"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── SMS Campaigns (D-316..318) — mirrors email; human-approved Send; STOP appended ───────
const newSms = (): SmsCampaign => ({
  id: crypto.randomUUID(), name: "New SMS", body: "", audience: { mode: "all", tags: [] }, status: "draft",
  stats: { recipients: 0, sent: 0, failed: 0 }, log: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), sentAt: null,
});

function SmsTab({ tenantId, status }: { tenantId: string; status: MarketingStatus }) {
  const [list, setList] = useState<SmsCampaign[] | null>(null);
  const [editing, setEditing] = useState<SmsCampaign | null>(null);
  useEffect(() => { listSmsCampaignsAction(tenantId).then(setList).catch(() => setList([])); }, [tenantId]);

  if (editing) return <SmsEditor tenantId={tenantId} campaign={editing} status={status} onClose={() => setEditing(null)} onSaved={(c) => setList((p) => (p ?? []).some((x) => x.id === c.id) ? (p ?? []).map((x) => x.id === c.id ? c : x) : [c, ...(p ?? [])])} />;

  return (
    <div className="mt-5 space-y-3">
      {!status.smsReady && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800"><b>Texting isn&apos;t connected yet.</b> You can build & AI-draft SMS now; to send, connect Twilio in Settings → Integrations.</div>
      )}
      <button onClick={() => setEditing(newSms())} className="rounded-lg bg-[#1e3a8a] px-4 py-2 text-sm font-medium text-white">+ New SMS</button>

      {/* Real-estate SMS starters */}
      <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
        <div className="mb-1 text-sm font-semibold text-slate-800">🏡 Real-estate text starters</div>
        <p className="mb-3 text-xs text-slate-500">Tap one to start a draft. Edit the <code>[bracketed]</code> bits; “Reply STOP to opt out” is appended automatically.</p>
        <div className="flex flex-wrap gap-2">
          {REALTOR_SMS_PRESETS.map((p) => (
            <button key={p.name} onClick={() => setEditing({ ...newSms(), name: p.name, body: p.body })}
              title={p.body} className="rounded-full border border-emerald-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:border-[#1e3a8a] hover:text-[#1e3a8a]">{p.name}</button>
          ))}
        </div>
      </div>

      {list === null ? <p className="py-8 text-center text-sm text-slate-400">Loading…</p> : list.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-400">No SMS campaigns yet — create one and let the AI draft it.</p>
      ) : list.map((c) => (
        <div key={c.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2"><span className="truncate font-medium text-slate-900">{c.name}</span>
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${c.status === "sent" ? "bg-emerald-100 text-emerald-700" : c.status === "sending" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-500"}`}>{c.status}</span></div>
            <div className="truncate text-xs text-slate-500">{c.body || "(no message yet)"}{c.status === "sent" ? ` — ${c.stats.sent} sent${c.stats.failed ? `, ${c.stats.failed} failed` : ""}` : ""}</div>
          </div>
          <div className="flex shrink-0 gap-2">
            <button onClick={() => setEditing(c)} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:border-[#1e3a8a] hover:text-[#1e3a8a]">{c.status === "sent" ? "View" : "Edit"}</button>
            <button onClick={async () => { if (confirm(`Delete "${c.name}"?`)) { await deleteSmsCampaignAction(tenantId, c.id); setList((p) => (p ?? []).filter((x) => x.id !== c.id)); } }} className="rounded-lg px-2 py-1.5 text-sm text-slate-400 hover:text-red-600">✕</button>
          </div>
        </div>
      ))}
    </div>
  );
}

function SmsEditor({ tenantId, campaign, status, onClose, onSaved }: { tenantId: string; campaign: SmsCampaign; status: MarketingStatus; onClose: () => void; onSaved: (c: SmsCampaign) => void }) {
  const [c, setC] = useState(campaign);
  const [busy, setBusy] = useState<string | null>(null);
  const [brief, setBrief] = useState("");
  const [testTo, setTestTo] = useState("");
  const [count, setCount] = useState<{ count: number; sample: string[] } | null>(null);
  const sent = c.status === "sent";
  const set = <K extends keyof SmsCampaign>(k: K, v: SmsCampaign[K]) => setC((p) => ({ ...p, [k]: v }));

  useEffect(() => { let live = true; smsAudienceCountAction(tenantId, c.audience).then((r) => { if (live) setCount(r); }).catch(() => {}); return () => { live = false; }; }, [tenantId, c.audience]);

  async function save(next?: Partial<SmsCampaign>) { const merged = { ...c, ...next }; setBusy("save"); try { const r = await saveSmsCampaignAction(tenantId, merged); if (r.ok) { setC(merged); onSaved(merged); } } finally { setBusy(null); } }
  async function draft() { if (!brief.trim()) return; setBusy("draft"); try { const r = await draftSmsCampaignAction(tenantId, brief); if (r.ok && r.body) setC((p) => ({ ...p, body: r.body! })); } finally { setBusy(null); } }
  async function test() { if (!testTo.trim()) return; setBusy("test"); try { const r = await sendSmsTestAction(tenantId, c, testTo); alert(r.ok ? "Test text sent." : (r.error ?? "Could not send test.")); } finally { setBusy(null); } }
  async function send() {
    if (!confirm(`Send "${c.name}" to ${count?.count ?? 0} contact(s)? This cannot be undone.`)) return;
    setBusy("send");
    try { await save(); const r = await sendSmsCampaignAction(tenantId, c.id); if (r.ok) { const updated = { ...c, status: "sent" as const, sentAt: new Date().toISOString(), stats: { ...c.stats, sent: r.sent ?? 0, failed: r.failed ?? 0 } }; setC(updated); onSaved(updated); alert(`Sent: ${r.sent} delivered${r.failed ? `, ${r.failed} failed` : ""}.`); } else alert(r.error ?? "Send failed."); }
    finally { setBusy(null); }
  }

  const len = c.body.length;
  return (
    <div className="mt-5 space-y-4">
      <button onClick={onClose} className="text-sm text-slate-500 hover:text-slate-800">← All SMS campaigns</button>
      <input value={c.name} onChange={(e) => set("name", e.target.value)} disabled={sent} className={inp} placeholder="Campaign name" />

      {!sent && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
          <div className={lbl}>AI draft</div>
          <div className="flex gap-2">
            <input value={brief} onChange={(e) => setBrief(e.target.value)} placeholder="e.g. flash sale this weekend, 20% off" className={inp} />
            <button onClick={draft} disabled={busy === "draft"} className="shrink-0 rounded-lg bg-[#1e3a8a] px-3 py-2 text-sm font-medium text-white disabled:opacity-50">{busy === "draft" ? "…" : "Draft"}</button>
          </div>
        </div>
      )}

      <div>
        <div className={lbl}>Message</div>
        <textarea value={c.body} onChange={(e) => set("body", e.target.value)} disabled={sent} rows={4} className={inp} placeholder="Your text message…" />
        <div className="mt-1 flex justify-between text-xs text-slate-400"><span>{len} chars{len > 160 ? ` · ${Math.ceil(len / 153)} segments` : ""}</span><span>“Reply STOP to opt out” is appended automatically</span></div>
      </div>

      <div>
        <div className={lbl}>Audience</div>
        <div className="flex flex-wrap items-center gap-2">
          <select value={c.audience.mode} onChange={(e) => set("audience", { ...c.audience, mode: e.target.value as "all" | "tags" })} disabled={sent} className="rounded-lg border border-slate-300 px-2 py-2 text-sm">
            <option value="all">All contacts with a phone</option><option value="tags">By tag</option>
          </select>
          {c.audience.mode === "tags" && (
            <div className="flex flex-wrap gap-1">
              {status.tags.length === 0 && <span className="text-xs text-slate-400">No tags yet.</span>}
              {status.tags.map((t) => { const on = c.audience.tags.includes(t); return <button key={t} disabled={sent} onClick={() => set("audience", { ...c.audience, tags: on ? c.audience.tags.filter((x) => x !== t) : [...c.audience.tags, t] })} className={`rounded-full px-2 py-0.5 text-[11px] ${on ? "bg-[#1e3a8a] text-white" : "text-slate-600 ring-1 ring-slate-200"}`}>{t}</button>; })}
            </div>
          )}
          <span className="ml-auto text-xs text-slate-500">{count ? `${count.count} sendable` : "…"}</span>
        </div>
        <p className="mt-1 text-[11px] text-slate-400">Do-Not-Contact, Unsubscribed, and no-phone contacts are always excluded.</p>
      </div>

      {!sent ? (
        <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
          <button onClick={() => save()} disabled={busy === "save"} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700">{busy === "save" ? "Saving…" : "Save draft"}</button>
          <div className="flex items-center gap-1">
            <input value={testTo} onChange={(e) => setTestTo(e.target.value)} placeholder="+1416…" className="w-32 rounded-lg border border-slate-300 px-2 py-2 text-sm" />
            <button onClick={test} disabled={busy === "test" || !status.smsReady} className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 disabled:opacity-50">Send test</button>
          </div>
          <button onClick={send} disabled={busy === "send" || !status.smsReady || !c.body.trim() || (count?.count ?? 0) === 0} className="ml-auto rounded-lg bg-emerald-600 px-5 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy === "send" ? "Sending…" : `Send to ${count?.count ?? 0}`}</button>
        </div>
      ) : (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">Sent {c.sentAt ? new Date(c.sentAt).toLocaleString() : ""} — {c.stats.sent} delivered{c.stats.failed ? `, ${c.stats.failed} failed` : ""}.</div>
      )}
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
  async function savePreset(p: typeof REALTOR_EMAIL_PRESETS[number]) {
    const t: EmailTemplate = { id: crypto.randomUUID(), name: p.name, subject: p.subject, preheader: p.preheader, body: p.body, updatedAt: "" };
    const r = await saveTemplateAction(tenantId, t);
    if (r.ok) { setTemplates((prev) => [...(prev ?? []).filter((x) => x.id !== t.id), t].sort((a, b) => a.name.localeCompare(b.name))); notify(`Saved "${p.name}" to your templates ✓`); }
    else notify(r.message ?? "Could not save.");
  }
  return (
    <div className="mt-5 space-y-3">
      <button onClick={() => setEditing(blank())} className="rounded-lg bg-[#1e3a8a] px-4 py-2 text-sm font-medium text-white">+ New template</button>

      {/* Real-estate starter library (built-in presets) */}
      <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
        <div className="mb-1 text-sm font-semibold text-slate-800">🏡 Real-estate starter templates</div>
        <p className="mb-3 text-xs text-slate-500">Ready-to-edit emails for realtors. <b>Use in campaign</b> prefills a new draft; <b>Save</b> adds it to your templates. Fill in the <code>[bracketed]</code> details and review before sending.</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {REALTOR_EMAIL_PRESETS.map((p) => (
            <div key={p.name} className="flex items-center justify-between gap-2 rounded-lg border border-emerald-200 bg-white p-3">
              <div className="min-w-0">
                <div className="truncate text-sm font-medium text-slate-900">{p.name}</div>
                <div className="truncate text-xs text-slate-500">{p.subject}</div>
              </div>
              <div className="flex shrink-0 gap-1.5">
                <button onClick={() => onUse({ id: crypto.randomUUID(), name: p.name, subject: p.subject, preheader: p.preheader, body: p.body, updatedAt: "" })} className="rounded-lg bg-[#1e3a8a] px-2.5 py-1.5 text-xs font-medium text-white">Use</button>
                <button onClick={() => savePreset(p)} className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs text-slate-700 hover:border-[#1e3a8a] hover:text-[#1e3a8a]">Save</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="pt-1 text-sm font-semibold uppercase tracking-wide text-slate-400">Your templates</div>
      {templates.length === 0 && <p className="py-8 text-center text-sm text-slate-400">No saved templates yet — save a reusable subject + body once, start campaigns from it forever.</p>}
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

// ── Email branding (D-360): header / HTML+text signature / footer, with a forced unsubscribe ──
function BrandingTab({ tenantId }: { tenantId: string }) {
  const [b, setB] = useState<EmailBranding | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { getEmailBrandingAction(tenantId).then(setB).catch(() => setB({ header: "", signature: "", signatureText: "", footer: "" })); }, [tenantId]);
  if (!b) return <p className="py-8 text-center text-sm text-slate-400">Loading…</p>;
  const set = (k: keyof EmailBranding, v: string) => setB((p) => (p ? { ...p, [k]: v } : p));
  async function save() {
    if (!b) return;
    setBusy(true);
    try { const r = await saveEmailBrandingAction(tenantId, b); notify(r.ok ? "Email branding saved ✓" : "Could not save."); }
    finally { setBusy(false); }
  }
  return (
    <div className="mt-5 max-w-2xl space-y-4">
      <p className="text-sm text-slate-500">Applied to every marketing email. Design a banner in Canva (or anywhere) and paste it as HTML or an <code>&lt;img&gt;</code> tag.</p>

      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
        🔒 <b>Unsubscribe is automatic and permanent.</b> Every recipient gets a personal one-click unsubscribe link (plus a List-Unsubscribe header for Gmail / Apple Mail), inserted between your signature and footer. You don&apos;t add it — and it can&apos;t be removed. Required by CASL / CAN-SPAM.
      </div>

      <label className="block"><span className={lbl}>Header — HTML (e.g. a Canva banner)</span>
        <textarea value={b.header} onChange={(e) => set("header", e.target.value)} rows={3} className={`${inp} font-mono text-xs`} placeholder={'<img src="https://…/banner.png" alt="" style="max-width:100%"/>'} /></label>

      <label className="block"><span className={lbl}>Signature — HTML</span>
        <textarea value={b.signature} onChange={(e) => set("signature", e.target.value)} rows={5} className={`${inp} font-mono text-xs`} placeholder={'Jane Agent<br/>Broker, ABC Realty<br/><a href="tel:+14165551234">(416) 555-1234</a>'} /></label>

      <label className="block"><span className={lbl}>Signature — plain text (shown when the recipient&apos;s app blocks HTML)</span>
        <textarea value={b.signatureText} onChange={(e) => set("signatureText", e.target.value)} rows={4} className={inp} placeholder={"Jane Agent\nBroker, ABC Realty\n(416) 555-1234"} /></label>

      <label className="block"><span className={lbl}>Footer — HTML (your mailing address etc.)</span>
        <textarea value={b.footer} onChange={(e) => set("footer", e.target.value)} rows={3} className={`${inp} font-mono text-xs`} placeholder="ABC Realty · 123 Main St, Toronto ON · (416) 555-1234" /></label>

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-500">
        <b className="text-slate-600">Order in every email:</b> Header → your message → Signature → <span className="font-semibold text-emerald-700">Unsubscribe (forced)</span> → Footer. Use <b>Send me a test</b> in any campaign to preview it.
      </div>

      <button onClick={save} disabled={busy} className="rounded-lg bg-[#1e3a8a] px-5 py-2 text-sm font-medium text-white disabled:opacity-50">{busy ? "Saving…" : "Save email branding"}</button>
    </div>
  );
}
