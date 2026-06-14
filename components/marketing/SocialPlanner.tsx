"use client";

import { useEffect, useMemo, useState } from "react";
import {
  listSocialPostsAction, saveSocialPostAction, deleteSocialPostAction, publishSocialPostAction, draftSocialPostAction,
} from "@/app/tenants/[tenantId]/marketing/actions";
import type { SocialPost } from "@/lib/server/social-planner";
import type { SocialAccountView } from "@/lib/server/social";

/**
 * SOCIAL PLANNER (D-344). Compose once → pick connected accounts → keep a draft, schedule it
 * (the cron worker posts at the slot), or Post-now. LinkedIn/Facebook/Instagram via the tenant's
 * stored OAuth tokens. Optional per-network text variants + an image URL. AI draft grounded in
 * the Business Profile.
 */

const inp = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a]";
const lbl = "mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500";
const PROVIDER_COLOR: Record<string, string> = { facebook: "#1877F2", instagram: "#E1306C", linkedin: "#0A66C2" };
const STATUS_TINT: Record<string, string> = { draft: "bg-slate-100 text-slate-500", scheduled: "bg-amber-100 text-amber-700", posting: "bg-sky-100 text-sky-700", posted: "bg-emerald-100 text-emerald-700", failed: "bg-rose-100 text-rose-700" };

function newPost(): SocialPost {
  const now = new Date().toISOString();
  return { id: crypto.randomUUID(), content: "", accountIds: [], mediaUrls: [], variants: {}, scheduledAt: null, status: "draft", results: [], createdAt: now, updatedAt: now };
}
function isoToLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso); const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function AccountChip({ a, on, onClick }: { a: SocialAccountView; on: boolean; onClick?: () => void }) {
  const c = PROVIDER_COLOR[a.provider] ?? "#64748b";
  const label = a.accountName || a.accountUsername || a.provider;
  return (
    <button type="button" onClick={onClick} className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs ${on ? "border-transparent text-white" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`} style={on ? { background: c } : undefined}>
      <span className="grid h-4 w-4 place-items-center rounded-full text-[9px] font-bold text-white" style={{ background: on ? "rgba(255,255,255,.25)" : c }}>{a.provider[0].toUpperCase()}</span>
      {label}
    </button>
  );
}

export default function SocialPlanner({ tenantId, accounts }: { tenantId: string; accounts: SocialAccountView[] }) {
  const [posts, setPosts] = useState<SocialPost[] | null>(null);
  const [editing, setEditing] = useState<SocialPost | null>(null);
  useEffect(() => { listSocialPostsAction(tenantId).then(setPosts).catch(() => setPosts([])); }, [tenantId]);

  const accountById = useMemo(() => Object.fromEntries(accounts.map((a) => [a.id, a])), [accounts]);
  const groups = useMemo(() => {
    const list = posts ?? [];
    return {
      scheduled: list.filter((p) => p.status === "scheduled" || p.status === "posting").sort((a, b) => String(a.scheduledAt).localeCompare(String(b.scheduledAt))),
      drafts: list.filter((p) => p.status === "draft"),
      history: list.filter((p) => p.status === "posted" || p.status === "failed").sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    };
  }, [posts]);

  if (accounts.length === 0) {
    return (
      <div className="mt-6 max-w-xl rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5">
        <div className="text-sm font-semibold text-slate-700">Connect a social account first</div>
        <p className="mt-1 text-sm text-slate-500">Connect Facebook, Instagram or LinkedIn in <b>Settings → Integrations</b>, then come back here to compose and schedule posts to all of them at once.</p>
      </div>
    );
  }
  if (editing) {
    return <Composer tenantId={tenantId} accounts={accounts} post={editing} onClose={() => setEditing(null)}
      onChanged={async () => { setPosts(await listSocialPostsAction(tenantId)); setEditing(null); }} />;
  }

  return (
    <div className="mt-5 space-y-6">
      <button onClick={() => setEditing(newPost())} className="rounded-lg bg-[#1e3a8a] px-4 py-2 text-sm font-medium text-white">+ New post</button>
      <p className="text-xs text-slate-500">Posts publish on the tenant&apos;s connected accounts. Scheduled posts go out automatically at their slot; nothing posts unless you schedule it or press Post now.</p>
      {posts === null ? <p className="py-8 text-center text-sm text-slate-400">Loading…</p> : (
        <>
          <PostGroup title="Scheduled" empty="Nothing scheduled." posts={groups.scheduled} accountById={accountById} onEdit={setEditing} tenantId={tenantId} setPosts={setPosts} />
          <PostGroup title="Drafts" empty="No drafts." posts={groups.drafts} accountById={accountById} onEdit={setEditing} tenantId={tenantId} setPosts={setPosts} />
          <PostGroup title="Posted" empty="Nothing posted yet." posts={groups.history} accountById={accountById} onEdit={setEditing} tenantId={tenantId} setPosts={setPosts} />
        </>
      )}
    </div>
  );
}

function PostGroup({ title, empty, posts, accountById, onEdit, tenantId, setPosts }: {
  title: string; empty: string; posts: SocialPost[]; accountById: Record<string, SocialAccountView>;
  onEdit: (p: SocialPost) => void; tenantId: string; setPosts: (v: SocialPost[]) => void;
}) {
  return (
    <section>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</h3>
      {posts.length === 0 ? <p className="text-sm text-slate-400">{empty}</p> : (
        <div className="space-y-2">
          {posts.map((p) => (
            <div key={p.id} className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="mb-1 flex flex-wrap items-center gap-1.5">
                    {p.accountIds.map((id) => { const a = accountById[id]; if (!a) return null; const c = PROVIDER_COLOR[a.provider] ?? "#64748b"; return <span key={id} className="grid h-5 w-5 place-items-center rounded-full text-[10px] font-bold text-white" style={{ background: c }} title={a.accountName ?? a.provider}>{a.provider[0].toUpperCase()}</span>; })}
                    <span className={`ml-1 rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ${STATUS_TINT[p.status] ?? ""}`}>{p.status}</span>
                    {p.scheduledAt && (p.status === "scheduled" || p.status === "posting") && <span className="text-[11px] text-slate-400">{new Date(p.scheduledAt).toLocaleString()}</span>}
                  </div>
                  <div className="truncate text-sm text-slate-700">{p.content || "(no text)"}</div>
                  {p.results.some((r) => !r.ok) && <div className="mt-1 text-[11px] text-rose-600">{p.results.filter((r) => !r.ok).map((r) => `${accountById[r.accountId]?.provider ?? "account"}: ${r.error}`).join(" · ")}</div>}
                </div>
                <div className="flex shrink-0 gap-2 text-sm">
                  <button onClick={() => onEdit(p)} className="rounded-lg border border-slate-300 px-3 py-1.5 text-slate-700 hover:border-[#1e3a8a] hover:text-[#1e3a8a]">{p.status === "posted" ? "View" : "Edit"}</button>
                  <button onClick={async () => { if (confirm("Delete this post?")) { await deleteSocialPostAction(tenantId, p.id); setPosts(await listSocialPostsAction(tenantId)); } }} className="rounded-lg px-2 py-1.5 text-slate-400 hover:text-red-600">✕</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function Composer({ tenantId, accounts, post, onClose, onChanged }: {
  tenantId: string; accounts: SocialAccountView[]; post: SocialPost; onClose: () => void; onChanged: () => Promise<void>;
}) {
  const [p, setP] = useState<SocialPost>(post);
  const [busy, setBusy] = useState<string | null>(null);
  const [brief, setBrief] = useState("");
  const [when, setWhen] = useState(isoToLocalInput(post.scheduledAt));
  const [perNetwork, setPerNetwork] = useState(Object.keys(post.variants).length > 0);
  const [msg, setMsg] = useState<string | null>(null);
  const done = post.status === "posted";

  const toggleAccount = (id: string) => setP((x) => ({ ...x, accountIds: x.accountIds.includes(id) ? x.accountIds.filter((a) => a !== id) : [...x.accountIds, id] }));
  const setVariant = (id: string, text: string) => setP((x) => ({ ...x, variants: { ...x.variants, [id]: text } }));

  async function persist(next: SocialPost): Promise<boolean> {
    const r = await saveSocialPostAction(tenantId, next);
    if (!r.ok) { setMsg(r.error ?? "Could not save."); return false; }
    return true;
  }
  async function saveDraft() {
    setBusy("save"); setMsg(null);
    try { const next = { ...p, status: (p.status === "posted" ? "posted" : "draft") as SocialPost["status"], scheduledAt: when ? new Date(when).toISOString() : null }; if (await persist(next)) await onChanged(); }
    finally { setBusy(null); }
  }
  async function schedule() {
    if (!p.accountIds.length) { setMsg("Pick at least one account."); return; }
    if (!when) { setMsg("Choose a date & time to schedule."); return; }
    const iso = new Date(when).toISOString();
    if (new Date(iso).getTime() < Date.now() + 30_000) { setMsg("Pick a time in the future."); return; }
    setBusy("schedule"); setMsg(null);
    try { if (await persist({ ...p, status: "scheduled", scheduledAt: iso })) await onChanged(); }
    finally { setBusy(null); }
  }
  async function postNow() {
    if (!p.accountIds.length) { setMsg("Pick at least one account."); return; }
    if (!confirm(`Post now to ${p.accountIds.length} account(s)?`)) return;
    setBusy("post"); setMsg(null);
    try {
      if (!(await persist({ ...p, scheduledAt: when ? new Date(when).toISOString() : null }))) return;
      const r = await publishSocialPostAction(tenantId, p.id);
      if (r.ok) { setMsg(`Posted (${r.results.filter((x) => x.ok).length}/${r.results.length} accounts).`); await onChanged(); }
      else setMsg(r.error ?? r.results.map((x) => x.error).filter(Boolean).join(" · ") ?? "Post failed.");
    } finally { setBusy(null); }
  }
  async function aiDraft() {
    if (!brief.trim()) return;
    setBusy("draft"); setMsg(null);
    try { const r = await draftSocialPostAction(tenantId, brief); if (r.ok && r.text) setP((x) => ({ ...x, content: r.text! })); else setMsg(r.message ?? "Draft failed."); }
    finally { setBusy(null); }
  }

  const selected = accounts.filter((a) => p.accountIds.includes(a.id));

  return (
    <div className="mt-5 max-w-2xl space-y-4">
      <button onClick={onClose} className="text-sm text-slate-400 hover:text-slate-600">← All posts</button>

      <div>
        <div className={lbl}>Post to</div>
        <div className="flex flex-wrap gap-1.5">{accounts.map((a) => <AccountChip key={a.id} a={a} on={p.accountIds.includes(a.id)} onClick={done ? undefined : () => toggleAccount(a.id)} />)}</div>
      </div>

      {!done && (
        <div className="rounded-xl border border-violet-200 bg-violet-50 p-3">
          <div className={lbl}>✨ Draft with AI</div>
          <div className="flex gap-2">
            <input value={brief} onChange={(e) => setBrief(e.target.value)} placeholder="e.g. announce our spring sale, friendly tone" className={inp} />
            <button onClick={aiDraft} disabled={busy === "draft"} className="shrink-0 rounded-lg bg-violet-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50">{busy === "draft" ? "…" : "Draft"}</button>
          </div>
        </div>
      )}

      <div>
        <div className={lbl}>Content</div>
        <textarea value={p.content} onChange={(e) => setP({ ...p, content: e.target.value })} disabled={done} rows={5} className={inp} placeholder="What do you want to share?" />
        <div className="mt-1 text-xs text-slate-400">{p.content.length} chars</div>
      </div>

      <div>
        <div className={lbl}>Image URL (optional)</div>
        <input value={p.mediaUrls[0] ?? ""} onChange={(e) => setP({ ...p, mediaUrls: e.target.value.trim() ? [e.target.value.trim()] : [] })} disabled={done} className={inp} placeholder="https://… (required for Instagram)" />
      </div>

      {selected.length > 1 && !done && (
        <div>
          <label className="flex items-center gap-2 text-sm text-slate-600"><input type="checkbox" checked={perNetwork} onChange={(e) => setPerNetwork(e.target.checked)} /> Customize text per network</label>
          {perNetwork && (
            <div className="mt-2 space-y-2">
              {selected.map((a) => (
                <div key={a.id}>
                  <div className="mb-1 text-xs text-slate-500">{a.accountName || a.provider} <span className="text-slate-400">(blank = use main text)</span></div>
                  <textarea value={p.variants[a.id] ?? ""} onChange={(e) => setVariant(a.id, e.target.value)} rows={2} className={inp} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div>
        <div className={lbl}>Schedule (optional)</div>
        <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} disabled={done} className={`${inp} max-w-xs`} />
      </div>

      {msg && <div className="rounded-md bg-slate-100 px-3 py-1.5 text-xs text-slate-700">{msg}</div>}

      {done ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          Posted {new Date(p.updatedAt).toLocaleString()} — {p.results.filter((r) => r.ok).length}/{p.results.length} accounts.
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
          <button onClick={saveDraft} disabled={!!busy} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 disabled:opacity-50">{busy === "save" ? "Saving…" : "Save draft"}</button>
          <button onClick={schedule} disabled={!!busy} className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-800 disabled:opacity-50">{busy === "schedule" ? "Scheduling…" : "Schedule"}</button>
          <button onClick={postNow} disabled={!!busy || !p.accountIds.length || (!p.content.trim() && !p.mediaUrls.length)} className="ml-auto rounded-lg bg-emerald-600 px-5 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy === "post" ? "Posting…" : "Post now"}</button>
        </div>
      )}
    </div>
  );
}
