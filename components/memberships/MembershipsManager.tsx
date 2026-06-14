"use client";

import { useEffect, useState, useTransition } from "react";
import { createCourseAction, generateCourseAction, setCourseStatusAction, deleteCourseAction, addLessonAction, updateLessonAction, deleteLessonAction, updateCourseAction, listEnrollmentsAction, enrollByEmailAction, removeEnrollmentAction } from "@/app/tenants/[tenantId]/memberships/actions";
import type { Course, Enrollment } from "@/lib/memberships";
import { confirmDialog } from "@/lib/ui/dialogs";

export default function MembershipsManager({ tenantId, initial }: { tenantId: string; initial: Course[] }) {
  const [courses, setCourses] = useState<Course[]>(initial);
  const [topic, setTopic] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [membersId, setMembersId] = useState<string | null>(null);
  const [newLesson, setNewLesson] = useState("");
  const [edit, setEdit] = useState<{ id: string; title: string; body: string } | null>(null);
  const [pending, start] = useTransition();

  const refreshCourse = (c: Course | null) => { if (c) setCourses((cs) => cs.map((x) => x.id === c.id ? c : x)); };
  const gen = () => start(async () => { setCourses(await generateCourseAction(tenantId, topic)); setTopic(""); });
  const create = () => start(async () => setCourses(await createCourseAction(tenantId, "New Course")));
  const toggle = (c: Course) => start(async () => setCourses(await setCourseStatusAction(tenantId, c.id, c.status === "published" ? "draft" : "published")));
  const del = async (id: string) => { if (await confirmDialog("Delete this course and its lessons?", { danger: true, confirmText: "Delete" })) start(async () => setCourses(await deleteCourseAction(tenantId, id))); };
  const addL = (courseId: string) => start(async () => { refreshCourse(await addLessonAction(tenantId, courseId, newLesson || "New lesson")); setNewLesson(""); });
  const saveL = (courseId: string) => { if (!edit) return; start(async () => { refreshCourse(await updateLessonAction(tenantId, courseId, edit.id, { title: edit.title, body: edit.body })); setEdit(null); }); };
  const delL = (courseId: string, id: string) => start(async () => refreshCourse(await deleteLessonAction(tenantId, courseId, id)));

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Courses &amp; Member Hub</h1>
        <p className="text-sm text-slate-500">Build courses for your members — AI drafts the whole outline; you refine and publish. A clean hub, not a noisy forum.</p>
      </div>

      <div className="mb-6 rounded-xl border border-indigo-200 bg-indigo-50/50 p-4">
        <div className="text-sm font-medium text-indigo-900">✨ Build a course with AI</div>
        <p className="mb-3 text-xs text-indigo-700/70">Enter a topic — AI drafts a full course outline with lessons.</p>
        <div className="flex gap-2">
          <input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. AI Automation for Realtors" className="flex-1 rounded-lg border border-indigo-200 px-3 py-2 text-sm" />
          <button onClick={gen} disabled={pending} className="rounded-lg bg-[#1e3a8a] px-4 py-2 text-sm font-medium text-white hover:bg-[#1e40af] disabled:opacity-50">{pending ? "Building…" : "Generate course"}</button>
          <button onClick={create} disabled={pending} className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50">Blank</button>
        </div>
      </div>

      {courses.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center text-sm text-slate-400">No courses yet. Generate one with AI above.</div>
      ) : (
        <div className="space-y-3">
          {courses.map((c) => (
            <div key={c.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2"><span className="font-medium text-slate-900">{c.title}</span><span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${c.status === "published" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{c.status}</span><span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${c.priceCents > 0 ? "bg-violet-100 text-violet-700" : "bg-slate-100 text-slate-500"}`}>{c.priceCents > 0 ? `${c.currency} ${(c.priceCents / 100).toFixed(2)}` : "Free"}</span></div>
                  <div className="text-xs text-slate-500">{c.lessons.length} lessons · {c.description}</div>
                </div>
                <div className="flex shrink-0 gap-2">
                  {c.status === "published" && <a href={`/learn/${tenantId}/${c.id}`} target="_blank" rel="noreferrer" className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-sky-600 hover:bg-slate-50">View ↗</a>}
                  <button onClick={() => { setMembersId(membersId === c.id ? null : c.id); setOpenId(null); }} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50">{membersId === c.id ? "Hide" : "Offer & members"}</button>
                  <button onClick={() => { setOpenId(openId === c.id ? null : c.id); setMembersId(null); }} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50">{openId === c.id ? "Hide" : "Lessons"}</button>
                  <button onClick={() => toggle(c)} disabled={pending} className="rounded-lg bg-[#1e3a8a] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#1e40af] disabled:opacity-50">{c.status === "published" ? "Unpublish" : "Publish"}</button>
                  <button onClick={() => del(c.id)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50">Delete</button>
                </div>
              </div>

              {openId === c.id && (
                <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
                  {c.lessons.map((l, i) => (
                    <div key={l.id} className="rounded-lg border border-slate-200 p-3">
                      {edit?.id === l.id ? (
                        <div className="space-y-2">
                          <input value={edit.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} className="w-full rounded border border-slate-300 px-2 py-1 text-sm font-medium" />
                          <textarea value={edit.body} onChange={(e) => setEdit({ ...edit, body: e.target.value })} rows={3} className="w-full rounded border border-slate-300 px-2 py-1 text-sm" />
                          <div className="flex gap-2"><button onClick={() => saveL(c.id)} className="rounded bg-[#1e3a8a] px-3 py-1 text-xs text-white">Save</button><button onClick={() => setEdit(null)} className="text-xs text-slate-400">cancel</button></div>
                        </div>
                      ) : (
                        <div className="flex items-start justify-between gap-2">
                          <div><div className="text-sm font-medium text-slate-800">{i + 1}. {l.title}</div><div className="text-xs text-slate-500 line-clamp-2">{l.body}</div></div>
                          <div className="flex shrink-0 gap-2"><button onClick={() => setEdit({ id: l.id, title: l.title, body: l.body })} className="text-xs text-sky-600 hover:underline">Edit</button><button onClick={() => delL(c.id, l.id)} className="text-xs text-red-500 hover:underline">✕</button></div>
                        </div>
                      )}
                    </div>
                  ))}
                  <div className="flex gap-2"><input value={newLesson} onChange={(e) => setNewLesson(e.target.value)} placeholder="New lesson title" className="flex-1 rounded border border-slate-300 px-2 py-1 text-sm" /><button onClick={() => addL(c.id)} disabled={pending} className="rounded border border-slate-200 px-3 py-1 text-xs text-slate-600 hover:bg-slate-50">＋ Add lesson</button></div>
                </div>
              )}

              {membersId === c.id && <CourseMembers tenantId={tenantId} course={c} onCourse={refreshCourse} />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** Offer (price + cover) + enrollment management for one course. */
function CourseMembers({ tenantId, course, onCourse }: { tenantId: string; course: Course; onCourse: (c: Course | null) => void }) {
  const [dollars, setDollars] = useState((course.priceCents / 100).toString());
  const [currency, setCurrency] = useState(course.currency || "USD");
  const [cover, setCover] = useState(course.coverImageUrl ?? "");
  const [enrollments, setEnrollments] = useState<Enrollment[] | null>(null);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => { listEnrollmentsAction(tenantId, course.id).then(setEnrollments).catch(() => setEnrollments([])); }, [tenantId, course.id]);

  async function saveOffer() {
    setBusy(true); setMsg(null);
    const priceCents = Math.max(0, Math.round(parseFloat(dollars || "0") * 100));
    const c = await updateCourseAction(tenantId, course.id, { priceCents, currency: currency.toUpperCase(), coverImageUrl: cover.trim() || null });
    setBusy(false); onCourse(c); setMsg("Offer saved ✓");
  }
  async function addEnroll() {
    if (!email.trim()) return;
    setBusy(true); setMsg(null);
    const r = await enrollByEmailAction(tenantId, course.id, email.trim());
    setBusy(false);
    if (!r.ok) setMsg(r.error ?? "Could not enroll."); else { setEnrollments(r.enrollments); setEmail(""); }
  }

  return (
    <div className="mt-3 grid gap-4 border-t border-slate-100 pt-3 sm:grid-cols-2">
      <div>
        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Offer</div>
        <div className="space-y-2">
          <div className="flex gap-2">
            <label className="flex flex-1 flex-col gap-1 text-xs text-slate-500">Price (0 = free)<input value={dollars} onChange={(e) => setDollars(e.target.value)} type="number" min="0" step="0.01" className="rounded border border-slate-300 px-2 py-1 text-sm" /></label>
            <label className="flex w-20 flex-col gap-1 text-xs text-slate-500">Currency<input value={currency} onChange={(e) => setCurrency(e.target.value)} className="rounded border border-slate-300 px-2 py-1 text-sm uppercase" /></label>
          </div>
          <label className="flex flex-col gap-1 text-xs text-slate-500">Cover image URL<input value={cover} onChange={(e) => setCover(e.target.value)} placeholder="https://…" className="rounded border border-slate-300 px-2 py-1 text-sm" /></label>
          <button onClick={saveOffer} disabled={busy} className="rounded-lg bg-[#1e3a8a] px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50">Save offer</button>
          {msg && <div className="text-xs text-emerald-600">{msg}</div>}
          <p className="text-[11px] text-slate-400">Paid courses need Stripe connected (Settings → Integrations). Buyers pay once, then unlock instantly.</p>
        </div>
      </div>
      <div>
        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Members {enrollments && `(${enrollments.length})`}</div>
        <div className="mb-2 flex gap-2">
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="grant access: email" className="flex-1 rounded border border-slate-300 px-2 py-1 text-sm" />
          <button onClick={addEnroll} disabled={busy} className="rounded border border-slate-200 px-3 py-1 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-50">Add</button>
        </div>
        <div className="max-h-44 space-y-1 overflow-y-auto">
          {enrollments === null ? <p className="text-xs text-slate-400">Loading…</p> : enrollments.length === 0 ? <p className="text-xs text-slate-400">No members yet.</p> : enrollments.map((e) => (
            <div key={e.id} className="flex items-center justify-between rounded border border-slate-100 px-2 py-1 text-xs">
              <span className="truncate text-slate-700">{e.email}<span className="ml-1 text-slate-400">· {e.source}</span></span>
              <button onClick={async () => setEnrollments(await removeEnrollmentAction(tenantId, course.id, e.id))} className="text-slate-400 hover:text-red-600">✕</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
