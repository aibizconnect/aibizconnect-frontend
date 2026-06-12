"use client";

import { useEffect, useRef, useState } from "react";
import {
  saveAiAgentAction, deleteAiAgentAction, runAgentTestTurnAction, listAgentAuditAction, type AgentAuditRow,
} from "@/app/tenants/[tenantId]/agents/ai-actions";
import { ROLE_LABELS, ROLE_PRESETS, type AiAgentDef, type AgentRole, type AgentTone } from "@/lib/agent/agents-store";
import { confirmDialog } from "@/lib/ui/dialogs";
import type { AgentChatMessage, AgentToolStep } from "@/lib/agent/agent-runtime";

/**
 * AI AGENTS hub (D-274) — the tenant-facing "AI Agents" menu, GHL-class but better:
 * agents run REAL audited tools in the Test console (read-only by default, live on
 * explicit opt-in), knowledge merges the tenant Business Profile automatically, and
 * every action lands in the audit trail. The legacy Agent Mesh stays under "Ops".
 */

const inp = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a]";
const lbl = "mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500";
const TONES: AgentTone[] = ["professional", "friendly", "concise", "enthusiastic"];
const ROLES = Object.keys(ROLE_LABELS) as AgentRole[];

const SKILLS: { key: keyof AiAgentDef["skills"]; label: string; desc: string; live: boolean }[] = [
  { key: "calendar", label: "Calendar & Bookings", desc: "List calendars, check live availability, book, reschedule and cancel appointments — with conflict checks, invites and reminders.", live: true },
  { key: "contacts", label: "Contacts & CRM", desc: "Find contacts, create new leads (deduped by email), update details, add tags (auto-created in your tag registry) and notes.", live: true },
  { key: "email", label: "Email", desc: "Send emails from your verified sender identity (set up in Sites → website → Settings → Email sending; the agent explains if it isn't configured yet).", live: true },
  { key: "sms", label: "SMS", desc: "Text people from your connected Twilio number.", live: true },
  { key: "voice", label: "Voice", desc: "Answer phone calls and book appointments by voice (Twilio Voice streaming — design ready, build queued).", live: false },
  { key: "reviews", label: "Reviews", desc: "Monitor and respond to Google reviews (needs the Google Business connection — design ready).", live: false },
];

const CHANNELS: { key: keyof AiAgentDef["channels"]; label: string; desc: string; live: boolean }[] = [
  { key: "webchat", label: "Website chat", desc: "A floating AI chat bubble on your published websites. Visitors can ask questions, check availability and book — the agent captures them as CRM leads. Anonymous-safe: no CRM reads, no sends, no cancellations.", live: true },
];

const newAgent = (): AiAgentDef => ({
  id: crypto.randomUUID(),
  name: "Booking Assistant",
  role: "va_bookings",
  tone: "professional",
  instructions: ROLE_PRESETS.va_bookings,
  skills: { calendar: true, contacts: false, email: false, sms: false, voice: false, reviews: false },
  knowledge: { businessProfileMerged: true, snippets: [] },
  channels: { webchat: false },
  widget: { position: "bottom-right", color: "", greeting: "", size: "standard" },
  enabled: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

export default function AiAgentsHub({ tenantId, initialAgents, ops }: {
  tenantId: string;
  initialAgents: AiAgentDef[];
  ops?: React.ReactNode; // legacy Agent Mesh panel
}) {
  const [tab, setTab] = useState<"agents" | "audit" | "ops">("agents");
  const [agents, setAgents] = useState<AiAgentDef[]>(initialAgents);
  const [editing, setEditing] = useState<AiAgentDef | null>(null);

  const tabBtn = (k: typeof tab, label: string) => (
    <button onClick={() => setTab(k)}
      className={`border-b-2 px-3 py-2 text-sm font-medium ${tab === k ? "border-[#1e3a8a] text-[#1e3a8a]" : "border-transparent text-slate-500 hover:text-slate-700"}`}>
      {label}
    </button>
  );

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900">AI Agents</h1>
      <p className="mt-1 text-sm text-slate-500">Build AI staff for your business — booking assistants, receptionists, qualifiers. They use your real calendars and business profile, and every action is audited.</p>

      <div className="mt-4 flex gap-1 border-b border-slate-200">
        {tabBtn("agents", "Agents")}
        {tabBtn("audit", "Usage & Audit")}
        {ops && tabBtn("ops", "Ops (Agent Mesh)")}
      </div>

      {tab === "agents" && !editing && (
        <AgentGrid agents={agents} onNew={() => setEditing(newAgent())} onEdit={setEditing}
          onToggle={async (a) => {
            const next = { ...a, enabled: !a.enabled };
            setAgents((p) => p.map((x) => (x.id === a.id ? next : x)));
            await saveAiAgentAction(tenantId, next);
          }} />
      )}
      {tab === "agents" && editing && (
        <AgentEditor tenantId={tenantId} agent={editing}
          onClose={() => setEditing(null)}
          onSaved={(a) => setAgents((p) => (p.some((x) => x.id === a.id) ? p.map((x) => (x.id === a.id ? a : x)) : [...p, a]))}
          onDeleted={(id) => { setAgents((p) => p.filter((x) => x.id !== id)); setEditing(null); }} />
      )}
      {tab === "audit" && <AuditTab tenantId={tenantId} />}
      {tab === "ops" && ops}
    </div>
  );
}

function AgentGrid({ agents, onNew, onEdit, onToggle }: {
  agents: AiAgentDef[]; onNew: () => void; onEdit: (a: AiAgentDef) => void; onToggle: (a: AiAgentDef) => void;
}) {
  return (
    <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {agents.map((a) => (
        <div key={a.id} className="flex flex-col rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="font-semibold text-slate-900">{a.name}</div>
              <div className="text-xs text-slate-500">{ROLE_LABELS[a.role]}</div>
            </div>
            <button onClick={() => onToggle(a)} title={a.enabled ? "Enabled — click to pause" : "Paused — click to enable"}
              className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${a.enabled ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
              {a.enabled ? "Enabled" : "Paused"}
            </button>
          </div>
          <div className="mt-3 flex flex-wrap gap-1">
            {SKILLS.filter((s) => a.skills[s.key]).map((s) => (
              <span key={s.key} className="rounded bg-[#1e3a8a]/10 px-2 py-0.5 text-[11px] text-[#1e3a8a]">{s.label}</span>
            ))}
          </div>
          <div className="mt-auto pt-4">
            <button onClick={() => onEdit(a)} className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:border-[#1e3a8a] hover:text-[#1e3a8a]">Configure & Test</button>
          </div>
        </div>
      ))}
      <button onClick={onNew} className="flex min-h-[150px] items-center justify-center rounded-xl border-2 border-dashed border-slate-300 text-sm font-medium text-slate-500 hover:border-[#1e3a8a] hover:text-[#1e3a8a]">
        + New agent
      </button>
    </div>
  );
}

function AgentEditor({ tenantId, agent: initial, onClose, onSaved, onDeleted }: {
  tenantId: string; agent: AiAgentDef;
  onClose: () => void; onSaved: (a: AiAgentDef) => void; onDeleted: (id: string) => void;
}) {
  const [a, setA] = useState<AiAgentDef>(initial);
  const [sub, setSub] = useState<"general" | "skills" | "channels" | "knowledge" | "test">("general");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const set = <K extends keyof AiAgentDef>(k: K, v: AiAgentDef[K]) => setA((p) => ({ ...p, [k]: v }));

  const save = async () => {
    setBusy(true); setMsg("");
    const r = await saveAiAgentAction(tenantId, a);
    setBusy(false);
    setMsg(r.ok ? "Saved ✓" : r.message ?? "Could not save.");
    if (r.ok) onSaved(a);
  };

  const subBtn = (k: typeof sub, label: string) => (
    <button onClick={() => setSub(k)}
      className={`rounded-md px-3 py-1.5 text-sm ${sub === k ? "bg-[#1e3a8a] text-white" : "text-slate-600 hover:bg-slate-100"}`}>{label}</button>
  );

  return (
    <div className="mt-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button onClick={onClose} className="text-sm text-slate-400 hover:text-slate-600">← All agents</button>
        <div className="flex items-center gap-2">
          {msg && <span className={`text-xs ${msg.startsWith("Saved") ? "text-emerald-600" : "text-red-600"}`}>{msg}</span>}
          <button onClick={save} disabled={busy} className="rounded-lg bg-[#1e3a8a] px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50">{busy ? "Saving…" : "Save agent"}</button>
        </div>
      </div>

      <div className="mt-3 flex gap-1 rounded-lg bg-slate-50 p-1">
        {subBtn("general", "General")}{subBtn("skills", "Skills")}{subBtn("channels", "Channels")}{subBtn("knowledge", "Knowledge")}{subBtn("test", "Test")}
      </div>

      {sub === "general" && (
        <div className="mt-4 grid max-w-2xl grid-cols-1 gap-4 sm:grid-cols-2">
          <label><span className={lbl}>Agent name</span>
            <input className={inp} value={a.name} onChange={(e) => set("name", e.target.value)} placeholder="Booking Assistant" /></label>
          <label><span className={lbl}>Role</span>
            <select className={inp} value={a.role} onChange={(e) => {
              const role = e.target.value as AgentRole;
              setA((p) => ({ ...p, role, instructions: !p.instructions.trim() || Object.values(ROLE_PRESETS).includes(p.instructions) ? ROLE_PRESETS[role] : p.instructions }));
            }}>
              {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
            </select></label>
          <label><span className={lbl}>Tone</span>
            <select className={inp} value={a.tone} onChange={(e) => set("tone", e.target.value as AgentTone)}>
              {TONES.map((t) => <option key={t} value={t}>{t[0].toUpperCase() + t.slice(1)}</option>)}
            </select></label>
          <label className="flex items-end gap-2 pb-1 text-sm text-slate-600">
            <input type="checkbox" checked={a.enabled} onChange={(e) => set("enabled", e.target.checked)} /> Enabled
          </label>
          <label className="sm:col-span-2"><span className={lbl}>Instructions</span>
            <textarea className={`${inp} min-h-[120px]`} value={a.instructions} onChange={(e) => set("instructions", e.target.value)}
              placeholder="How should this agent behave? What should it always / never do?" /></label>
          <div className="sm:col-span-2">
            <button onClick={async () => { if (await confirmDialog("Delete this agent?")) { await deleteAiAgentAction(tenantId, a.id); onDeleted(a.id); } }}
              className="text-xs text-red-500 hover:text-red-700">Delete agent</button>
          </div>
        </div>
      )}

      {sub === "skills" && (
        <div className="mt-4 max-w-2xl space-y-3">
          {SKILLS.map((s) => (
            <label key={s.key} className={`flex items-start gap-3 rounded-xl border p-3 ${s.live ? "border-slate-200 bg-white" : "border-slate-100 bg-slate-50 opacity-70"}`}>
              <input type="checkbox" className="mt-1" disabled={!s.live} checked={a.skills[s.key]}
                onChange={(e) => set("skills", { ...a.skills, [s.key]: e.target.checked })} />
              <span>
                <span className="flex items-center gap-2 text-sm font-medium text-slate-800">
                  {s.label}
                  {!s.live && <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-slate-500">Soon</span>}
                </span>
                <span className="text-xs text-slate-500">{s.desc}</span>
              </span>
            </label>
          ))}
        </div>
      )}

      {sub === "channels" && (
        <div className="mt-4 max-w-2xl space-y-3">
          {CHANNELS.map((c) => (
            <label key={c.key} className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-3">
              <input type="checkbox" className="mt-1" checked={a.channels[c.key]}
                onChange={(e) => set("channels", { ...a.channels, [c.key]: e.target.checked })} />
              <span>
                <span className="text-sm font-medium text-slate-800">{c.label}</span>
                <span className="block text-xs text-slate-500">{c.desc}</span>
              </span>
            </label>
          ))}
          {["SMS conversations", "Facebook / Instagram DMs", "WhatsApp", "Phone (Voice)"].map((label) => (
            <div key={label} className="flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 p-3 opacity-70">
              <span className="text-sm font-medium text-slate-600">{label}</span>
              <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-slate-500">Soon</span>
            </div>
          ))}
          {a.channels.webchat && (
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="mb-3 text-sm font-semibold text-slate-800">Bubble appearance <span className="font-normal text-slate-400">— you decide the look and position</span></div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label><span className={lbl}>Position</span>
                  <select className={inp} value={a.widget.position} onChange={(e) => set("widget", { ...a.widget, position: e.target.value as AiAgentDef["widget"]["position"] })}>
                    <option value="bottom-right">Bottom right</option>
                    <option value="bottom-left">Bottom left</option>
                  </select></label>
                <label><span className={lbl}>Bubble size</span>
                  <select className={inp} value={a.widget.size} onChange={(e) => set("widget", { ...a.widget, size: e.target.value as AiAgentDef["widget"]["size"] })}>
                    <option value="compact">Compact</option>
                    <option value="standard">Standard</option>
                    <option value="large">Large</option>
                  </select></label>
                <label><span className={lbl}>Color</span>
                  <span className="flex items-center gap-2">
                    <input type="color" value={a.widget.color || "#1e3a8a"} disabled={!a.widget.color}
                      onChange={(e) => set("widget", { ...a.widget, color: e.target.value })}
                      className="h-9 w-12 cursor-pointer rounded border border-slate-300 disabled:opacity-40" />
                    <label className="flex items-center gap-1.5 text-xs text-slate-600">
                      <input type="checkbox" checked={!a.widget.color}
                        onChange={(e) => set("widget", { ...a.widget, color: e.target.checked ? "" : "#1e3a8a" })} />
                      Use the site&apos;s brand color
                    </label>
                  </span></label>
                <label><span className={lbl}>Greeting message</span>
                  <input className={inp} value={a.widget.greeting} placeholder="Hi! I can answer questions and book appointments. How can I help?"
                    onChange={(e) => set("widget", { ...a.widget, greeting: e.target.value })} /></label>
              </div>
              {/* Mini preview: corner placement + size + color at a glance. */}
              <div className="relative mt-4 h-24 overflow-hidden rounded-lg border border-dashed border-slate-300 bg-slate-50">
                <span className="absolute left-2 top-2 text-[10px] uppercase tracking-wide text-slate-400">Preview — your published page</span>
                <span style={{
                  position: "absolute", bottom: 10, [a.widget.position === "bottom-left" ? "left" : "right"]: 10,
                  width: { compact: 32, standard: 40, large: 48 }[a.widget.size], height: { compact: 32, standard: 40, large: 48 }[a.widget.size],
                  borderRadius: "50%", background: a.widget.color || "#1e3a8a", boxShadow: "0 4px 12px rgba(0,0,0,.25)",
                  display: "flex", alignItems: "center", justifyContent: "center", color: "#fff",
                } as React.CSSProperties}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M4 4h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H8.8L5 20.6A1 1 0 0 1 3.4 19.8V6a2 2 0 0 1 .6-1.4A2 2 0 0 1 4 4z" /></svg>
                </span>
              </div>
              <p className="mt-3 rounded-lg border border-sky-200 bg-sky-50 p-2 text-xs text-sky-800">
                Save the agent and the bubble appears on your published sites with these settings.
              </p>
            </div>
          )}
        </div>
      )}

      {sub === "knowledge" && (
        <div className="mt-4 max-w-2xl space-y-4">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
            Your <b>Business Profile</b> (name, phone, address, industry, hours) is merged into this agent automatically — one source of truth, set in Settings → Business Profile.
          </div>
          <div>
            <span className={lbl}>Extra knowledge (FAQs, policies, service details)</span>
            {a.knowledge.snippets.map((s) => (
              <div key={s.id} className="mb-2 flex items-start gap-2">
                <textarea className={`${inp} min-h-[60px]`} value={s.content}
                  onChange={(e) => set("knowledge", { ...a.knowledge, snippets: a.knowledge.snippets.map((x) => (x.id === s.id ? { ...x, content: e.target.value } : x)) })} />
                <button onClick={() => set("knowledge", { ...a.knowledge, snippets: a.knowledge.snippets.filter((x) => x.id !== s.id) })}
                  className="mt-1 text-slate-400 hover:text-red-500" title="Remove">✕</button>
              </div>
            ))}
            <button onClick={() => set("knowledge", { ...a.knowledge, snippets: [...a.knowledge.snippets, { id: crypto.randomUUID(), content: "", source: "manual" }] })}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:border-[#1e3a8a] hover:text-[#1e3a8a]">+ Add knowledge</button>
          </div>
        </div>
      )}

      {sub === "test" && <TestConsole tenantId={tenantId} agent={a} />}
    </div>
  );
}

function TestConsole({ tenantId, agent }: { tenantId: string; agent: AiAgentDef }) {
  const [messages, setMessages] = useState<(AgentChatMessage & { steps?: AgentToolStep[] })[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [live, setLive] = useState(false);
  const [error, setError] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const send = async () => {
    const text = input.trim();
    if (!text || busy) return;
    setInput(""); setError("");
    const transcript: AgentChatMessage[] = [...messages.map(({ role, text }) => ({ role, text })), { role: "user", text }];
    setMessages((p) => [...p, { role: "user", text }]);
    setBusy(true);
    try {
      const r = await runAgentTestTurnAction(tenantId, agent, transcript, live);
      if (r.error) setError(r.error);
      if (r.reply || r.steps.length) setMessages((p) => [...p, { role: "agent", text: r.reply || "(no reply)", steps: r.steps }]);
    } finally { setBusy(false); }
  };

  return (
    <div className="mt-4 max-w-2xl">
      <label className={`flex items-center gap-2 rounded-lg border p-2 text-xs ${live ? "border-amber-300 bg-amber-50 text-amber-800" : "border-slate-200 bg-slate-50 text-slate-500"}`}>
        <input type="checkbox" checked={live} onChange={(e) => setLive(e.target.checked)} />
        Allow LIVE actions (real bookings, reschedules, cancellations — invites and reminders really send). Off = read-only: the agent sees real calendars and availability but cannot change anything.
      </label>

      <div className="mt-3 h-80 overflow-y-auto rounded-xl border border-slate-200 bg-white p-3">
        {messages.length === 0 && <p className="py-10 text-center text-sm text-slate-400">Say hi — ask about the business, or try “book me a discovery call next week”.</p>}
        {messages.map((m, i) => (
          <div key={i} className={`mb-3 ${m.role === "user" ? "text-right" : ""}`}>
            {m.steps && m.steps.length > 0 && (
              <div className="mb-1 flex flex-wrap gap-1">
                {m.steps.map((s, j) => (
                  <span key={j} title={s.summary} className={`rounded px-1.5 py-0.5 text-[10px] ${s.ok ? "bg-sky-100 text-sky-700" : "bg-red-100 text-red-700"}`}>⚙ {s.tool}</span>
                ))}
              </div>
            )}
            <span className={`inline-block max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm ${m.role === "user" ? "bg-[#1e3a8a] text-white" : "bg-slate-100 text-slate-800"}`}>{m.text}</span>
          </div>
        ))}
        {busy && <p className="text-xs text-slate-400">thinking…</p>}
        <div ref={endRef} />
      </div>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

      <div className="mt-2 flex gap-2">
        <input className={inp} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Message your agent…" />
        <button onClick={send} disabled={busy} className="rounded-lg bg-[#1e3a8a] px-4 py-2 text-sm font-medium text-white disabled:opacity-50">Send</button>
      </div>
      <p className="mt-2 text-[11px] text-slate-400">Tip: changes you make in the other tabs apply here immediately — no save needed to test.</p>
    </div>
  );
}

function AuditTab({ tenantId }: { tenantId: string }) {
  const [rows, setRows] = useState<AgentAuditRow[] | null>(null);
  useEffect(() => { listAgentAuditAction(tenantId).then(setRows).catch(() => setRows([])); }, [tenantId]);
  if (!rows) return <p className="py-8 text-center text-sm text-slate-400">Loading…</p>;
  if (!rows.length) return <p className="py-8 text-center text-sm text-slate-400">No agent activity yet — run a conversation in an agent's Test tab.</p>;
  return (
    <div className="mt-4 overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead><tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-400">
          <th className="py-2 pr-4">When</th><th className="py-2 pr-4">Action</th><th className="py-2">Details</th>
        </tr></thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-slate-100">
              <td className="whitespace-nowrap py-2 pr-4 text-slate-500">{new Date(r.createdAt).toLocaleString()}</td>
              <td className="py-2 pr-4 font-medium text-slate-700">{r.action}</td>
              <td className="max-w-[420px] truncate py-2 text-xs text-slate-500">{JSON.stringify(r.meta)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
