"use client";

import { useState, useTransition } from "react";
import { composeCampaignAction, setSiteDesignAction, decideApprovalAction, addSubdomainAction, addCustomDomainAction, removeDomainAction, dnsChallengeAction, verifyDomainAction, applyTemplateAction } from "@/app/tenants/[tenantId]/agents/actions";
import type { CampaignResult } from "@/lib/agent/orchestrator";
import type { ApprovalRow } from "@/lib/agent/approvals";
import type { DomainRow } from "@/lib/domains";
import type { ApplyTemplateResult } from "@/lib/templates-apply";

type TemplateCard = { key: string; label: string; industry: string; tagline: string; description: string; pageCount: number; brandHint: { primary: string; accent: string; mood: string } };

const ROOT = "aibizconnect.app";

type Agent = { role: string; domain: string; label: string; status: "live" | "stub"; capability: string };
type DomainSpec = { domain: string; label: string; actions: readonly string[]; capabilities: readonly string[]; liveEnabled: boolean; dryRunProven: boolean };

function domainStatus(d?: DomainSpec): { text: string; cls: string } {
  if (!d) return { text: "Coming soon", cls: "bg-zinc-700 text-zinc-300" };
  if (d.liveEnabled && d.dryRunProven && d.domain === "website") return { text: "Live", cls: "bg-emerald-600/20 text-emerald-300 ring-1 ring-emerald-600/40" };
  if (d.dryRunProven) return { text: "Proven · key-gated", cls: "bg-sky-600/20 text-sky-300 ring-1 ring-sky-600/40" };
  return { text: "Dry-run", cls: "bg-amber-600/20 text-amber-300 ring-1 ring-amber-600/40" };
}

const sourceBadge = (s: string) =>
  s === "llm" ? "bg-violet-600/20 text-violet-300" : s === "fallback" || s === "template" ? "bg-zinc-700 text-zinc-300" : "bg-zinc-700 text-zinc-300";

export default function AgentsPanel({ tenantId, agents, domains, designEnabled = false, approvals: initialApprovals = [], tenantDomains: initialDomains = [], templates = [] }: { tenantId: string; agents: Agent[]; domains: DomainSpec[]; designEnabled?: boolean; approvals?: ApprovalRow[]; tenantDomains?: DomainRow[]; templates?: TemplateCard[] }) {
  const [goal, setGoal] = useState("");
  const [result, setResult] = useState<CampaignResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [design, setDesign] = useState(designEnabled);
  const [designPending, startDesign] = useTransition();
  const [approvals, setApprovals] = useState<ApprovalRow[]>(initialApprovals);
  const [approvalPending, startApproval] = useTransition();
  const [doms, setDoms] = useState<DomainRow[]>(initialDomains);
  const [subInput, setSubInput] = useState("");
  const [customInput, setCustomInput] = useState("");
  const [domError, setDomError] = useState<string | null>(null);
  const [domPending, startDom] = useTransition();

  function addSub() {
    setDomError(null);
    startDom(async () => {
      const r = await addSubdomainAction(tenantId, subInput);
      if (r.ok) { setSubInput(""); setDoms(r.domains); } else setDomError(r.error ?? "Failed");
    });
  }
  function addCustom() {
    setDomError(null);
    startDom(async () => {
      const r = await addCustomDomainAction(tenantId, customInput, "tenant");
      if (r.ok) { setCustomInput(""); setDoms(r.domains); } else setDomError(r.upgrade ? `${r.error} (upgrade required)` : (r.error ?? "Failed"));
    });
  }
  function removeDom(id: string) {
    startDom(async () => { const r = await removeDomainAction(tenantId, id); setDoms(r.domains); });
  }
  const [challenge, setChallenge] = useState<{ id: string; host: string; token: string } | null>(null);
  function showDns(id: string) {
    startDom(async () => {
      const r = await dnsChallengeAction(tenantId, id);
      if (r.ok && r.host && r.token) setChallenge({ id, host: r.host, token: r.token });
      else setDomError(r.error ?? "Could not generate DNS challenge");
    });
  }
  function verify(id: string) {
    setDomError(null);
    startDom(async () => {
      const r = await verifyDomainAction(tenantId, id);
      setDoms(r.domains);
      if (!r.active) setDomError(r.error ?? "Not verified yet");
      else setChallenge(null);
    });
  }

  // Start-from-Template
  const [tplKey, setTplKey] = useState<string>(templates[0]?.key ?? "");
  const [bizName, setBizName] = useState("");
  const [applyBrand, setApplyBrand] = useState(true);
  const [tplResult, setTplResult] = useState<ApplyTemplateResult | null>(null);
  const [tplError, setTplError] = useState<string | null>(null);
  const [tplPending, startTpl] = useTransition();
  function buildFromTemplate() {
    setTplError(null); setTplResult(null);
    startTpl(async () => {
      const r = await applyTemplateAction(tenantId, tplKey, bizName, applyBrand);
      if (r.ok && r.result) setTplResult(r.result); else setTplError(r.error ?? "Failed");
    });
  }

  function decide(id: string, decision: "approved" | "denied") {
    setApprovals((a) => a.filter((x) => x.id !== id)); // optimistic
    startApproval(async () => {
      const res = await decideApprovalAction(tenantId, id, decision);
      if (res.ok) setApprovals(res.approvals);
    });
  }

  function toggleDesign() {
    const next = !design;
    setDesign(next); // optimistic
    startDesign(async () => {
      const res = await setSiteDesignAction(tenantId, next);
      if (!res.ok) setDesign(res.enabled); // revert to server truth on failure
    });
  }

  const byDomain = new Map<string, DomainSpec>(domains.map((d) => [d.domain, d]));
  const grouped = agents.reduce<Record<string, Agent[]>>((acc, a) => { (acc[a.domain] ??= []).push(a); return acc; }, {});
  const order = ["website", "email", "social", "ads", "chatbot", "voice"];
  const domainKeys = Object.keys(grouped).sort((a, b) => order.indexOf(a) - order.indexOf(b));

  function run() {
    setError(null); setResult(null);
    start(async () => {
      const res = await composeCampaignAction(tenantId, goal);
      if (res.ok) setResult(res.result); else setError(res.error);
    });
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-10 text-zinc-100">
      <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Agent Mesh</h1>
          <p className="mt-1 text-sm text-zinc-400">Your AI team across every channel. Live agents act now; others are coming online behind safety gates.</p>
        </div>
        {/* Per-tenant publish/flip control for the new design system */}
        <button
          onClick={toggleDesign} disabled={designPending}
          className={`shrink-0 rounded-xl px-4 py-2 text-sm font-medium ring-1 transition disabled:opacity-50 ${design ? "bg-emerald-600/20 text-emerald-300 ring-emerald-600/40" : "bg-zinc-800 text-zinc-300 ring-zinc-700 hover:bg-zinc-700"}`}
          title="Switch your public site between the classic look and the new design system"
        >
          {designPending ? "Saving…" : design ? "New design: ON" : "New design: OFF"}
        </button>
      </header>

      {/* Start from a template — one-click build my site (drafts only) */}
      {templates.length > 0 && (
        <section className="mb-10 rounded-2xl border border-indigo-800/40 bg-indigo-950/10 p-5">
          <h2 className="text-sm font-medium text-indigo-200">Start from a template</h2>
          <p className="mb-3 text-xs text-zinc-500">Pick your industry and we&apos;ll generate a full draft site, on-brand. Nothing goes live — review, then publish each page (it passes our quality gate) and flip the new design when you&apos;re ready.</p>

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {templates.map((t) => (
              <button key={t.key} onClick={() => setTplKey(t.key)} type="button"
                className={`rounded-xl border p-3 text-left transition ${tplKey === t.key ? "border-indigo-500 bg-indigo-600/10" : "border-zinc-800 bg-zinc-950/40 hover:border-zinc-700"}`}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{t.label}</span>
                  <span className="flex gap-1">
                    <span className="h-3 w-3 rounded-full" style={{ background: t.brandHint.primary }} />
                    <span className="h-3 w-3 rounded-full" style={{ background: t.brandHint.accent }} />
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-zinc-500">{t.tagline}</p>
                <p className="mt-1 text-[10px] uppercase tracking-wide text-zinc-600">{t.pageCount} page{t.pageCount > 1 ? "s" : ""} · {t.industry}</p>
              </button>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <input value={bizName} onChange={(e) => setBizName(e.target.value)} placeholder="Your business name"
              className="flex-1 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm outline-none placeholder:text-zinc-600 focus:border-indigo-500" />
            <label className="flex items-center gap-1.5 text-xs text-zinc-400">
              <input type="checkbox" checked={applyBrand} onChange={(e) => setApplyBrand(e.target.checked)} className="accent-indigo-500" />
              Apply suggested brand colors
            </label>
            <button onClick={buildFromTemplate} disabled={tplPending || !tplKey}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50">
              {tplPending ? "Building…" : "Generate draft site"}
            </button>
          </div>

          {tplError && <p className="mt-3 text-sm text-red-400">{tplError}</p>}
          {tplResult && (
            <div className="mt-4 rounded-xl border border-emerald-800/40 bg-emerald-950/20 p-3">
              <p className="text-sm text-emerald-300">{tplResult.note}</p>
              <ul className="mt-2 space-y-1 text-xs">
                {tplResult.pages.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-2">
                    <span className="text-zinc-300">{p.title} <span className="text-zinc-600">· {p.sectionCount} sections</span></span>
                    <a href={p.previewPath} target="_blank" rel="noreferrer" className="font-mono text-[11px] text-sky-400 hover:underline">{p.slug} ↗</a>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-[11px] text-zinc-500">Next: publish each page (Website editor) — the quality gate runs automatically — then toggle &quot;New design&quot; above to go live with the new look.</p>
            </div>
          )}
        </section>
      )}

      {/* Campaign launcher */}
      <section className="mb-10 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
        <h2 className="text-sm font-medium text-zinc-300">Compose a campaign</h2>
        <p className="mb-3 text-xs text-zinc-500">One goal → cohesive website, email &amp; social plans, quality-checked. Dry-run only — nothing is published or sent.</p>
        <div className="flex gap-2">
          <input
            value={goal} onChange={(e) => setGoal(e.target.value)}
            placeholder="e.g. Launch our new AI automation service for small businesses"
            className="flex-1 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm outline-none placeholder:text-zinc-600 focus:border-indigo-500"
            onKeyDown={(e) => { if (e.key === "Enter" && !pending) run(); }}
          />
          <button onClick={run} disabled={pending}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50">
            {pending ? "Composing…" : "Compose"}
          </button>
        </div>

        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

        {result && (
          <div className="mt-4">
            <div className="mb-3 flex items-center gap-2 text-sm">
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${result.cohesive ? "bg-emerald-600/20 text-emerald-300" : "bg-amber-600/20 text-amber-300"}`}>
                {result.cohesive ? "Cohesive ✓" : "Needs attention"}
              </span>
              <span className="text-xs text-zinc-500">brand source: {result.brandSource}</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {result.steps.map((s) => (
                <div key={s.domain} className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium capitalize">{s.domain}</span>
                    <span className={`rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wide ${sourceBadge(s.source)}`}>{s.source}</span>
                  </div>
                  <p className="mt-1 text-xs text-zinc-500">{s.role}</p>
                  <ul className="mt-2 space-y-1 text-xs text-zinc-400">
                    <li>plan valid: {s.validation.ok ? "✓" : "✗"}</li>
                    <li>dry-run actions: {s.dryRun.actions}</li>
                    {s.critic && <li>quality: <span className={s.critic.pass ? "text-emerald-400" : "text-red-400"}>{s.critic.score}/100 {s.critic.pass ? "pass" : "fail"}</span></li>}
                    {s.validation.gatedActionIds.length > 0 && <li className="text-amber-400">{s.validation.gatedActionIds.length} action(s) need approval</li>}
                  </ul>
                </div>
              ))}
            </div>
            {result.notes.length > 0 && <ul className="mt-3 list-disc pl-5 text-xs text-amber-400">{result.notes.map((n, i) => <li key={i}>{n}</li>)}</ul>}
          </div>
        )}
      </section>

      {/* Domains & Websites — subdomain (free) + custom domain (entitlement-gated) */}
      <section className="mb-10 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
        <h2 className="text-sm font-medium text-zinc-300">Domains &amp; Websites</h2>
        <p className="mb-3 text-xs text-zinc-500">Every site gets a free <span className="font-mono">name.{ROOT}</span> subdomain. Custom domains are a paid upgrade.</p>

        {doms.length > 0 && (
          <ul className="mb-4 space-y-2">
            {doms.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-zinc-800 bg-zinc-950/50 p-3">
                <div className="min-w-0">
                  <span className="font-mono text-sm">{d.subdomain ? `${d.subdomain}.${ROOT}` : d.custom_domain}</span>
                  {d.is_primary && <span className="ml-2 rounded bg-indigo-600/20 px-1.5 py-0.5 text-[10px] text-indigo-300">primary</span>}
                  <div className="mt-0.5 flex flex-wrap gap-2 text-[11px] text-zinc-500">
                    <span>{d.custom_domain ? "custom" : "subdomain"}</span>
                    <span>· payer: {d.payer}</span>
                    {d.custom_domain && <span className={`· ${d.custom_domain_status === "active" ? "text-emerald-400" : "text-amber-400"}`}>· {d.custom_domain_status}</span>}
                  </div>
                </div>
                <div className="flex shrink-0 gap-2">
                  {d.custom_domain && d.custom_domain_status !== "active" && (
                    <>
                      <button onClick={() => showDns(d.id)} disabled={domPending} className="rounded-lg border border-zinc-700 px-2.5 py-1 text-xs text-zinc-300 hover:bg-zinc-800 disabled:opacity-50">DNS</button>
                      <button onClick={() => verify(d.id)} disabled={domPending} className="rounded-lg bg-sky-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-sky-500 disabled:opacity-50">Verify</button>
                    </>
                  )}
                  <button onClick={() => removeDom(d.id)} disabled={domPending} className="rounded-lg border border-zinc-700 px-2.5 py-1 text-xs text-zinc-400 hover:bg-zinc-800 disabled:opacity-50">Remove</button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex gap-2">
            <div className="flex flex-1 items-center rounded-lg border border-zinc-700 bg-zinc-950 pr-2">
              <input value={subInput} onChange={(e) => setSubInput(e.target.value)} placeholder="your-name" className="w-full bg-transparent px-3 py-2 text-sm outline-none placeholder:text-zinc-600" />
              <span className="font-mono text-xs text-zinc-500">.{ROOT}</span>
            </div>
            <button onClick={addSub} disabled={domPending} className="rounded-lg bg-zinc-700 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-600 disabled:opacity-50">Add free</button>
          </div>
          <div className="flex gap-2">
            <input value={customInput} onChange={(e) => setCustomInput(e.target.value)} placeholder="yourbrand.com" className="flex-1 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm outline-none placeholder:text-zinc-600" />
            <button onClick={addCustom} disabled={domPending} className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50">Add custom</button>
          </div>
        </div>
        {challenge && (
          <div className="mt-3 rounded-xl border border-sky-800/40 bg-sky-950/20 p-3 text-xs">
            <p className="text-sky-200">Add this TXT record at your DNS provider, then click Verify:</p>
            <div className="mt-2 grid gap-1 font-mono text-[11px] text-zinc-300">
              <div><span className="text-zinc-500">Type:</span> TXT</div>
              <div><span className="text-zinc-500">Host:</span> {challenge.host}</div>
              <div className="break-all"><span className="text-zinc-500">Value:</span> {challenge.token}</div>
            </div>
          </div>
        )}
        {domError && <p className="mt-2 text-sm text-amber-400">{domError}</p>}
      </section>

      {/* Approvals queue (UI-2) — Human-Approval (G) breakpoints awaiting a decision */}
      {approvals.length > 0 && (
        <section className="mb-10 rounded-2xl border border-amber-700/40 bg-amber-950/20 p-5">
          <h2 className="text-sm font-medium text-amber-300">Approvals needed <span className="ml-1 rounded-full bg-amber-600/30 px-2 py-0.5 text-xs">{approvals.length}</span></h2>
          <p className="mb-3 text-xs text-amber-200/70">These actions spend money, send, or place a call — they require your approval before anything happens.</p>
          <ul className="space-y-2">
            {approvals.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-800/40 bg-zinc-950/50 p-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium capitalize">{a.domain ?? "agent"}{a.role ? ` · ${a.role}` : ""}</div>
                  <div className="text-xs text-zinc-400">{a.reason ?? "Human approval required"}</div>
                  {a.gated_action_ids?.length ? <div className="mt-0.5 font-mono text-[11px] text-amber-300/80">{a.gated_action_ids.join(", ")}</div> : null}
                </div>
                <div className="flex shrink-0 gap-2">
                  <button onClick={() => decide(a.id, "approved")} disabled={approvalPending} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-500 disabled:opacity-50">Approve</button>
                  <button onClick={() => decide(a.id, "denied")} disabled={approvalPending} className="rounded-lg border border-zinc-600 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-800 disabled:opacity-50">Deny</button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Agent roster grouped by domain */}
      <section className="space-y-6">
        {domainKeys.map((dk) => {
          const st = domainStatus(byDomain.get(dk));
          return (
            <div key={dk}>
              <div className="mb-2 flex items-center gap-2">
                <h3 className="text-sm font-semibold capitalize">{byDomain.get(dk)?.label ?? dk}</h3>
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${st.cls}`}>{st.text}</span>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {grouped[dk].map((a) => (
                  <div key={a.role} className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{a.label}</span>
                      <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-zinc-400">{a.capability}</span>
                    </div>
                    <p className="mt-1 font-mono text-[11px] text-zinc-500">{a.role}</p>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
}
