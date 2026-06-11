"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import type { ContactTask } from "@/lib/crm";
import { listTasksAction, addTaskAction, setTaskStatusAction, deleteTaskAction } from "@/app/tenants/[tenantId]/contacts/crm-actions";
import { notifyError } from "@/lib/ui/dialogs";

/** All-contacts tasks rollup (GHL Contacts → Tasks tab): open/done filter, due dates,
 *  complete toggle, quick add. Tasks can also be added per-contact on the detail page. */
export default function TasksRollup({ tenantId, contactId, compact }: { tenantId: string; contactId?: string; compact?: boolean }) {
  const [tasks, setTasks] = useState<ContactTask[]>([]);
  const [show, setShow] = useState<"open" | "done" | "all">("open");
  const [title, setTitle] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [pending, startT] = useTransition();

  const reload = () => startT(async () => {
    try { setTasks(await listTasksAction(tenantId, { contactId, status: show === "all" ? undefined : show })); }
    catch (e: any) { notifyError(e?.message || "Could not load tasks."); }
  });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(reload, [tenantId, contactId, show]);

  const add = async () => {
    if (!title.trim()) return;
    const r = await addTaskAction(tenantId, { contactId, title, dueAt: dueAt ? new Date(dueAt).toISOString() : undefined });
    if (!r.ok) { notifyError(r.error || "Could not add task."); return; }
    setTitle(""); setDueAt("");
    reload();
  };
  const toggle = async (t: ContactTask) => {
    const r = await setTaskStatusAction(tenantId, t.id, t.status === "done" ? "open" : "done");
    if (!r.ok) notifyError(r.error || "Could not update.");
    reload();
  };
  const del = async (id: string) => { await deleteTaskAction(tenantId, id); reload(); };

  const overdue = (t: ContactTask) => t.status === "open" && t.dueAt && new Date(t.dueAt) < new Date();
  const inp = "rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm";

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <input value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="Add a task…" className={`${inp} w-64`} />
        <input type="datetime-local" value={dueAt} onChange={(e) => setDueAt(e.target.value)} className={inp} title="Due (optional)" />
        <button onClick={add} className="rounded-lg bg-[#1e3a8a] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#1e40af]">Add</button>
        <div className="ml-auto flex overflow-hidden rounded-lg border border-slate-300 bg-white text-xs">
          {(["open", "done", "all"] as const).map((s) => (
            <button key={s} onClick={() => setShow(s)} className={`px-3 py-1.5 capitalize ${show === s ? "bg-[#1e3a8a] text-white" : "text-slate-600 hover:bg-slate-50"}`}>{s}</button>
          ))}
        </div>
      </div>
      <div className={`rounded-xl border border-slate-200 bg-white ${compact ? "" : "shadow-sm"}`}>
        {pending && tasks.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-slate-400">Loading…</div>
        ) : tasks.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-slate-400">No {show === "all" ? "" : show + " "}tasks.</div>
        ) : (
          <ul className="divide-y divide-slate-50">
            {tasks.map((t) => (
              <li key={t.id} className="flex items-center gap-3 px-4 py-2.5">
                <input type="checkbox" checked={t.status === "done"} onChange={() => toggle(t)} className="h-4 w-4" />
                <span className={`min-w-0 flex-1 truncate text-sm ${t.status === "done" ? "text-slate-400 line-through" : "text-slate-800"}`}>{t.title}</span>
                {t.dueAt && (
                  <span className={`whitespace-nowrap text-xs ${overdue(t) ? "font-medium text-red-600" : "text-slate-400"}`}>
                    {new Date(t.dueAt).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                  </span>
                )}
                {!contactId && t.contactId && (
                  <Link href={`/tenants/${tenantId}/contacts/${t.contactId}`} className="text-xs text-[#1e3a8a] hover:underline">contact ↗</Link>
                )}
                <button onClick={() => del(t.id)} className="text-xs text-red-400 hover:text-red-600">✕</button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
