"use client";

import { useEffect, useState } from "react";
import {
  listPostsAction, getPostAction, createPostAction, updatePostAction, setPostStatusAction, deletePostAction, draftPostAction,
} from "@/app/tenants/[tenantId]/sites/blog/actions";
import type { BlogPost, BlogPostSummary } from "@/lib/server/blog";

/**
 * BLOG manager (D-345). Author posts with an AI draft, SEO fields and a publish gate. Published
 * posts read at /sites/<tenantId>/blog/<slug>. Plain-text body, blank line = new paragraph.
 */
const inp = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a]";
const lbl = "mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500";

export default function BlogManager({ tenantId }: { tenantId: string }) {
  const [posts, setPosts] = useState<BlogPostSummary[] | null>(null);
  const [editing, setEditing] = useState<BlogPost | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { listPostsAction(tenantId).then(setPosts).catch(() => setPosts([])); }, [tenantId]);

  async function open(id: string) { const p = await getPostAction(tenantId, id); if (p) setEditing(p); }
  async function create() {
    setBusy(true);
    try { const r = await createPostAction(tenantId); if (r.ok && r.id) await open(r.id); else alert(r.error ?? "Couldn't create the post."); }
    finally { setBusy(false); }
  }
  async function refreshAndClose() { setPosts(await listPostsAction(tenantId)); setEditing(null); }

  if (editing) return <Editor tenantId={tenantId} post={editing} onClose={refreshAndClose} />;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Blog posts</h2>
        <button onClick={create} disabled={busy} className="rounded-lg bg-[#1e3a8a] px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{busy ? "…" : "+ New post"}</button>
      </div>
      {posts === null ? <p className="py-8 text-center text-sm text-slate-400">Loading…</p> : posts.length === 0 ? (
        <p className="py-10 text-center text-sm text-slate-400">No posts yet — create one and let the AI draft it.</p>
      ) : (
        <div className="space-y-2">
          {posts.map((p) => (
            <div key={p.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="truncate font-medium text-slate-900">{p.title}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${p.status === "published" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{p.status}</span>
                </div>
                <div className="truncate text-xs text-slate-500">/{p.slug}{p.excerpt ? ` — ${p.excerpt}` : ""}</div>
              </div>
              <div className="flex shrink-0 gap-2">
                {p.status === "published" && <a href={`/sites/${tenantId}/blog/${p.slug}`} target="_blank" rel="noreferrer" className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:border-[#1e3a8a] hover:text-[#1e3a8a]">View ↗</a>}
                <button onClick={() => open(p.id)} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700">Edit</button>
                <button onClick={async () => { if (confirm(`Delete "${p.title}"?`)) { await deletePostAction(tenantId, p.id); setPosts(await listPostsAction(tenantId)); } }} className="rounded-lg px-2 py-1.5 text-sm text-slate-400 hover:text-red-600">✕</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Editor({ tenantId, post, onClose }: { tenantId: string; post: BlogPost; onClose: () => void }) {
  const [p, setP] = useState<BlogPost>(post);
  const [busy, setBusy] = useState<string | null>(null);
  const [brief, setBrief] = useState("");
  const [tagsText, setTagsText] = useState(post.tags.join(", "));
  const [msg, setMsg] = useState<string | null>(null);
  const set = <K extends keyof BlogPost>(k: K, v: BlogPost[K]) => setP((x) => ({ ...x, [k]: v }));

  async function save(): Promise<boolean> {
    setBusy("save"); setMsg(null);
    const tags = tagsText.split(",").map((t) => t.trim()).filter(Boolean);
    const r = await updatePostAction(tenantId, p.id, {
      title: p.title, slug: p.slug, excerpt: p.excerpt, coverImageUrl: p.coverImageUrl, body: p.body,
      tags, author: p.author, seoTitle: p.seoTitle, seoDescription: p.seoDescription,
    });
    setBusy(null);
    if (!r.ok) { setMsg(r.error ?? "Could not save."); return false; }
    setP((x) => ({ ...x, tags })); setMsg("Saved ✓"); return true;
  }
  async function togglePublish() {
    const next = p.status === "published" ? "draft" : "published";
    if (!(await save())) return;
    setBusy("publish");
    const r = await setPostStatusAction(tenantId, p.id, next);
    setBusy(null);
    if (r.ok) { setP((x) => ({ ...x, status: next, publishedAt: x.publishedAt ?? (next === "published" ? new Date().toISOString() : null) })); setMsg(next === "published" ? "Published ✓" : "Moved to draft."); }
    else setMsg(r.error ?? "Could not update status.");
  }
  async function aiDraft() {
    if (!brief.trim()) return;
    setBusy("draft"); setMsg(null);
    const r = await draftPostAction(tenantId, brief);
    setBusy(null);
    if (r.ok && r.draft) { const d = r.draft; setP((x) => ({ ...x, title: d.title, excerpt: d.excerpt, body: d.body, seoTitle: d.seoTitle, seoDescription: d.seoDescription })); setTagsText(d.tags.join(", ")); }
    else setMsg(r.message ?? "Draft failed.");
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button onClick={onClose} className="text-sm text-slate-400 hover:text-slate-600">← All posts</button>
        <div className="flex items-center gap-2">
          {p.status === "published" && <a href={`/sites/${tenantId}/blog/${p.slug}`} target="_blank" rel="noreferrer" className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:border-[#1e3a8a] hover:text-[#1e3a8a]">View ↗</a>}
          <button onClick={save} disabled={!!busy} className="rounded-lg border border-slate-300 px-4 py-1.5 text-sm text-slate-700 disabled:opacity-50">{busy === "save" ? "Saving…" : "Save"}</button>
          <button onClick={togglePublish} disabled={!!busy} className={`rounded-lg px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50 ${p.status === "published" ? "bg-slate-500" : "bg-emerald-600"}`}>{busy === "publish" ? "…" : p.status === "published" ? "Unpublish" : "Publish"}</button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="rounded-xl border border-violet-200 bg-violet-50 p-3">
            <div className={lbl}>✨ Draft with AI</div>
            <div className="flex gap-2">
              <input value={brief} onChange={(e) => setBrief(e.target.value)} placeholder="e.g. 5 ways local businesses get more reviews" className={inp} />
              <button onClick={aiDraft} disabled={busy === "draft"} className="shrink-0 rounded-lg bg-violet-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50">{busy === "draft" ? "…" : "Draft"}</button>
            </div>
          </div>
          <label><span className={lbl}>Title</span><input className={inp} value={p.title} onChange={(e) => set("title", e.target.value)} /></label>
          <label><span className={lbl}>URL slug</span><input className={inp} value={p.slug} onChange={(e) => set("slug", e.target.value)} /></label>
          <label><span className={lbl}>Excerpt</span><textarea className={`${inp} min-h-[60px]`} value={p.excerpt} onChange={(e) => set("excerpt", e.target.value)} /></label>
          <label><span className={lbl}>Cover image URL</span><input className={inp} value={p.coverImageUrl ?? ""} onChange={(e) => set("coverImageUrl", e.target.value || null)} placeholder="https://…" /></label>
          <div className="grid grid-cols-2 gap-3">
            <label><span className={lbl}>Author</span><input className={inp} value={p.author ?? ""} onChange={(e) => set("author", e.target.value || null)} /></label>
            <label><span className={lbl}>Tags (comma-sep)</span><input className={inp} value={tagsText} onChange={(e) => setTagsText(e.target.value)} /></label>
          </div>
          <label><span className={lbl}>Body (blank line = new paragraph)</span><textarea className={`${inp} min-h-[280px]`} value={p.body} onChange={(e) => set("body", e.target.value)} /></label>
          <div className="rounded-xl border border-slate-200 p-3">
            <div className={lbl}>SEO</div>
            <label className="mb-2 block"><span className="mb-1 block text-xs text-slate-500">SEO title</span><input className={inp} value={p.seoTitle ?? ""} onChange={(e) => set("seoTitle", e.target.value || null)} /></label>
            <label className="block"><span className="mb-1 block text-xs text-slate-500">Meta description</span><textarea className={`${inp} min-h-[50px]`} value={p.seoDescription ?? ""} onChange={(e) => set("seoDescription", e.target.value || null)} /></label>
          </div>
          {msg && <div className="rounded-md bg-slate-100 px-3 py-1.5 text-xs text-slate-700">{msg}</div>}
        </div>

        <div>
          <span className={lbl}>Preview</span>
          <article className="rounded-xl border border-slate-200 bg-white p-6">
            {p.coverImageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.coverImageUrl} alt="" className="mb-4 aspect-[16/9] w-full rounded-lg object-cover" />
            )}
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">{p.title || "Title…"}</h1>
            {(p.author || p.tags.length > 0) && <div className="mt-1 text-xs text-slate-400">{p.author}{p.author && p.tags.length ? " · " : ""}{p.tags.join(", ")}</div>}
            {p.excerpt && <p className="mt-3 text-base text-slate-500">{p.excerpt}</p>}
            <div className="mt-4 space-y-3">
              {p.body ? p.body.split(/\n{2,}/).map((para, i) => <p key={i} className="text-[15px] leading-relaxed text-slate-800">{para.split("\n").map((l, j) => <span key={j}>{l}<br /></span>)}</p>) : <p className="text-sm text-slate-300">Body preview…</p>}
            </div>
          </article>
        </div>
      </div>
    </div>
  );
}
