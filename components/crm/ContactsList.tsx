"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import type { ContactFull, ContactFilters, SmartList } from "@/lib/crm";
import {
  listContactsPageAction, createContactAction, bulkTagAction, bulkDeleteAction,
  importContactsAction, listTagsAction, listSmartListsAction, createSmartListAction, deleteSmartListAction,
} from "@/app/tenants/[tenantId]/contacts/crm-actions";
import { notifyError, confirmDialog } from "@/lib/ui/dialogs";

/**
 * Contacts list (GHL-parity, D-230): Smart Lists strip (All + saved filter views),
 * server-side search / tag / source / date filters, sortable columns, 50/page
 * pagination, bulk bar (Add tag / Remove tag / Delete / Export CSV — NO send actions,
 * CON-V16), + Add contact, CSV import with column mapping + email dedupe.
 */

const PAGE_SIZE = 50;

const initials = (name: string, email: string) => {
  const n = (name || email || "?").trim();
  const parts = n.split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
};
const AVATAR_BG = ["#1e3a8a", "#0e7490", "#b45309", "#7c3aed", "#be185d", "#15803d"];
const avatarColor = (s: string) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return AVATAR_BG[h % AVATAR_BG.length]; };

const csvEscape = (v: unknown) => { const s = String(v ?? ""); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
function downloadCsv(rows: ContactFull[], filename: string) {
  const head = "name,email,phone,company,tags,score,source,created";
  const body = rows.map((c) => [c.name, c.email, c.phone, c.company ?? "", c.tags.join(";"), c.score, c.source ?? "", c.createdAt ?? ""].map(csvEscape).join(","));
  const blob = new Blob([[head, ...body].join("\n")], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

// Tiny CSV parser (quotes + commas) — enough for contact files.
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], cell = "", inQ = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQ) {
      if (ch === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else inQ = false; }
      else cell += ch;
    } else if (ch === '"') inQ = true;
    else if (ch === ",") { row.push(cell); cell = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell); cell = "";
      if (row.some((c) => c.trim())) rows.push(row);
      row = [];
    } else cell += ch;
  }
  row.push(cell);
  if (row.some((c) => c.trim())) rows.push(row);
  return rows;
}

export default function ContactsList({ tenantId }: { tenantId: string }) {
  const [rows, setRows] = useState<ContactFull[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [q, setQ] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [source, setSource] = useState("");
  const [createdFrom, setCreatedFrom] = useState("");
  const [createdTo, setCreatedTo] = useState("");
  const [sort, setSort] = useState<"name" | "created_at" | "score">("created_at");
  const [dir, setDir] = useState<"asc" | "desc">("desc");
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [allTags, setAllTags] = useState<{ name: string; color: string }[]>([]);
  const [smartLists, setSmartLists] = useState<SmartList[]>([]);
  const [activeList, setActiveList] = useState<string>("");   // "" = All
  const [filterOpen, setFilterOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [pending, startT] = useTransition();
  const reloadRef = useRef(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const filters: ContactFilters = useMemo(
    () => ({ q: q || undefined, tags: tags.length ? tags : undefined, source: source || undefined, createdFrom: createdFrom ? new Date(createdFrom).toISOString() : undefined, createdTo: createdTo ? new Date(new Date(createdTo).getTime() + 86400_000).toISOString() : undefined, sort, dir, page, pageSize: PAGE_SIZE }),
    [q, tags, source, createdFrom, createdTo, sort, dir, page],
  );

  const reload = (f: ContactFilters = filters) => {
    const id = ++reloadRef.current;
    startT(async () => {
      try {
        const r = await listContactsPageAction(tenantId, f);
        if (id === reloadRef.current) { setRows(r.rows); setTotal(r.total); setSel(new Set()); }
      } catch (e: any) { notifyError(e?.message || "Could not load contacts."); }
    });
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => reload(), [tags.join(","), source, createdFrom, createdTo, sort, dir, page]);
  useEffect(() => { // debounced search
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { setPage(0); reload({ ...filters, q: q || undefined, page: 0 }); }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);
  useEffect(() => {
    listTagsAction(tenantId).then(setAllTags).catch(() => {});
    listSmartListsAction(tenantId).then(setSmartLists).catch(() => {});
  }, [tenantId]);

  const applySmartList = (sl?: SmartList) => {
    setActiveList(sl?.id ?? "");
    const f = sl?.filters ?? {};
    setQ(f.q ?? ""); setTags(f.tags ?? []); setSource(f.source ?? "");
    setCreatedFrom(f.createdFrom ? f.createdFrom.slice(0, 10) : ""); setCreatedTo(f.createdTo ? f.createdTo.slice(0, 10) : "");
    setSort(f.sort ?? "created_at"); setDir(f.dir ?? "desc"); setPage(0);
  };
  const saveSmartList = async () => {
    const name = window.prompt("Name this smart list:");
    if (!name) return;
    const r = await createSmartListAction(tenantId, name, { q: q || undefined, tags: tags.length ? tags : undefined, source: source || undefined, createdFrom: filters.createdFrom, createdTo: filters.createdTo, sort, dir });
    if (!r.ok) { notifyError(r.error || "Could not save."); return; }
    setSmartLists(await listSmartListsAction(tenantId));
  };
  const removeSmartList = async (id: string) => {
    if (!(await confirmDialog("Delete this smart list? (Contacts are not affected.)", { danger: true, confirmText: "Delete" }))) return;
    await deleteSmartListAction(tenantId, id);
    if (activeList === id) applySmartList(undefined);
    setSmartLists(await listSmartListsAction(tenantId));
  };

  const toggleSort = (k: typeof sort) => { if (sort === k) setDir((d) => (d === "asc" ? "desc" : "asc")); else { setSort(k); setDir(k === "name" ? "asc" : "desc"); } setPage(0); };
  const sortIcon = (k: typeof sort) => sort === k ? (dir === "asc" ? " ▲" : " ▼") : "";

  const allChecked = rows.length > 0 && rows.every((r) => sel.has(r.id));
  const toggleAll = () => setSel(allChecked ? new Set() : new Set(rows.map((r) => r.id)));

  const bulkTag = async (mode: "add" | "remove") => {
    const tag = window.prompt(`${mode === "add" ? "Add" : "Remove"} which tag?`);
    if (!tag) return;
    const r = await bulkTagAction(tenantId, Array.from(sel), tag, mode);
    if (!r.ok) notifyError(r.error || "Tag update failed.");
    reload();
  };
  const bulkDel = async () => {
    if (!(await confirmDialog(`Delete ${sel.size} contact${sel.size === 1 ? "" : "s"}? This cannot be undone.`, { danger: true, confirmText: "Delete" }))) return;
    const r = await bulkDeleteAction(tenantId, Array.from(sel));
    if (!r.ok) notifyError(r.error || "Delete failed.");
    reload();
  };
  const exportCsv = async (selectedOnly: boolean) => {
    if (selectedOnly) { downloadCsv(rows.filter((r) => sel.has(r.id)), "contacts.csv"); return; }
    const all = await listContactsPageAction(tenantId, { ...filters, page: 0, pageSize: 1000 });
    downloadCsv(all.rows, "contacts.csv");
    if (all.total > 1000) notifyError(`Exported the first 1000 of ${all.total} — narrow the filters for the rest.`);
  };

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const filterCount = (tags.length ? 1 : 0) + (source ? 1 : 0) + (createdFrom || createdTo ? 1 : 0);
  const inp = "rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm";

  return (
    <div>
      {/* ── Smart Lists strip ── */}
      <div className="mb-3 flex flex-wrap items-center gap-1.5">
        <button onClick={() => applySmartList(undefined)}
          className={`rounded-full px-3 py-1 text-xs font-medium ${activeList === "" ? "bg-[#1e3a8a] text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>All</button>
        {smartLists.map((sl) => (
          <span key={sl.id} className={`group inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${activeList === sl.id ? "bg-[#1e3a8a] text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
            <button onClick={() => applySmartList(sl)}>{sl.name}</button>
            <button onClick={() => removeSmartList(sl.id)} title="Delete smart list" className="opacity-0 transition group-hover:opacity-70">✕</button>
          </span>
        ))}
        <button onClick={saveSmartList} title="Save the current filters as a smart list"
          className="rounded-full border border-dashed border-slate-300 px-3 py-1 text-xs text-slate-500 hover:border-slate-400">＋ Smart list</button>
      </div>

      {/* ── Toolbar: search · filters · import/export · add ── */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, email, phone…" className={`${inp} w-64`} />
        <div className="relative">
          <button onClick={() => setFilterOpen((o) => !o)} className={`${inp} hover:bg-slate-50`}>
            Filters{filterCount ? ` (${filterCount})` : ""} ▾
          </button>
          {filterOpen && (
            <div className="absolute z-30 mt-1 w-72 rounded-xl border border-slate-200 bg-white p-3 shadow-lg">
              <div className="mb-2 text-xs font-medium text-slate-600">Tags</div>
              <div className="mb-3 flex max-h-28 flex-wrap gap-1 overflow-auto">
                {allTags.length === 0 && <span className="text-xs text-slate-400">No tags yet.</span>}
                {allTags.map((t) => (
                  <button key={t.name} onClick={() => { setTags((arr) => arr.includes(t.name) ? arr.filter((x) => x !== t.name) : [...arr, t.name]); setPage(0); }}
                    className={`rounded-full px-2 py-0.5 text-[11px] ${tags.includes(t.name) ? "text-white" : "text-slate-600 ring-1 ring-slate-200"}`}
                    style={tags.includes(t.name) ? { background: t.color } : {}}>{t.name}</button>
                ))}
              </div>
              <label className="mb-2 block text-xs text-slate-600">Source
                <input value={source} onChange={(e) => { setSource(e.target.value); setPage(0); }} placeholder="e.g. calendar booking" className={`${inp} mt-1 w-full`} />
              </label>
              <div className="grid grid-cols-2 gap-2">
                <label className="block text-xs text-slate-600">Created from<input type="date" value={createdFrom} onChange={(e) => { setCreatedFrom(e.target.value); setPage(0); }} className={`${inp} mt-1 w-full`} /></label>
                <label className="block text-xs text-slate-600">to<input type="date" value={createdTo} onChange={(e) => { setCreatedTo(e.target.value); setPage(0); }} className={`${inp} mt-1 w-full`} /></label>
              </div>
              {filterCount > 0 && <button onClick={() => { setTags([]); setSource(""); setCreatedFrom(""); setCreatedTo(""); setPage(0); }} className="mt-2 text-xs text-red-500 hover:underline">Clear filters</button>}
            </div>
          )}
        </div>
        <span className="text-xs text-slate-400">{pending ? "Loading…" : `${total} contact${total === 1 ? "" : "s"}`}</span>
        <div className="ml-auto flex items-center gap-2">
          <button onClick={() => setImportOpen(true)} className={`${inp} hover:bg-slate-50`}>⬆ Import</button>
          <button onClick={() => exportCsv(false)} className={`${inp} hover:bg-slate-50`}>⬇ Export</button>
          <button onClick={() => setAddOpen(true)} className="rounded-lg bg-[#1e3a8a] px-4 py-1.5 text-sm font-medium text-white hover:bg-[#1e40af]">＋ Add contact</button>
        </div>
      </div>

      {/* ── Bulk bar ── */}
      {sel.size > 0 && (
        <div className="mb-2 flex flex-wrap items-center gap-2 rounded-lg border border-[#1e3a8a]/20 bg-[#1e3a8a]/5 px-3 py-2 text-sm">
          <span className="font-medium text-[#1e3a8a]">{sel.size} selected</span>
          <button onClick={() => bulkTag("add")} className="rounded border border-slate-300 bg-white px-2.5 py-1 text-xs hover:bg-slate-50">＋ Add tag</button>
          <button onClick={() => bulkTag("remove")} className="rounded border border-slate-300 bg-white px-2.5 py-1 text-xs hover:bg-slate-50">− Remove tag</button>
          <button onClick={() => exportCsv(true)} className="rounded border border-slate-300 bg-white px-2.5 py-1 text-xs hover:bg-slate-50">⬇ Export selected</button>
          <button onClick={bulkDel} className="rounded border border-red-200 bg-white px-2.5 py-1 text-xs text-red-600 hover:bg-red-50">Delete</button>
          <button onClick={() => setSel(new Set())} className="ml-auto text-xs text-slate-400 hover:underline">Clear</button>
        </div>
      )}

      {/* ── Table ── */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="w-8 px-3 py-3"><input type="checkbox" checked={allChecked} onChange={toggleAll} /></th>
              <th className="cursor-pointer px-3 py-3" onClick={() => toggleSort("name")}>Name{sortIcon("name")}</th>
              <th className="px-3 py-3">Tags</th>
              <th className="cursor-pointer px-3 py-3" onClick={() => toggleSort("score")}>Score{sortIcon("score")}</th>
              <th className="px-3 py-3">Source</th>
              <th className="cursor-pointer px-3 py-3" onClick={() => toggleSort("created_at")}>Created{sortIcon("created_at")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                {q || filterCount ? "No contacts match these filters." : "No contacts yet — add one, import a CSV, or they'll arrive from your funnels, forms and bookings."}
              </td></tr>
            )}
            {rows.map((c) => (
              <tr key={c.id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="px-3 py-2.5"><input type="checkbox" checked={sel.has(c.id)} onChange={(e) => setSel((s) => { const n = new Set(s); e.target.checked ? n.add(c.id) : n.delete(c.id); return n; })} /></td>
                <td className="px-3 py-2.5">
                  <Link href={`/tenants/${tenantId}/contacts/${c.id}`} className="flex items-center gap-2.5">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white" style={{ background: avatarColor(c.id) }}>{initials(c.name, c.email)}</span>
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-slate-900 hover:underline">{c.name || c.email || "—"}</span>
                      <span className="block truncate text-xs text-slate-500">{[c.email, c.phone].filter(Boolean).join(" · ")}</span>
                    </span>
                  </Link>
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex max-w-[220px] flex-wrap gap-1">
                    {c.tags.slice(0, 3).map((t) => <span key={t} className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">{t}</span>)}
                    {c.tags.length > 3 && <span className="text-[11px] text-slate-400">+{c.tags.length - 3}</span>}
                  </div>
                </td>
                <td className="px-3 py-2.5"><span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${c.score >= 50 ? "bg-emerald-100 text-emerald-700" : c.score >= 20 ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-500"}`}>{c.score}</span></td>
                <td className="px-3 py-2.5 text-slate-500">{c.source ?? "—"}</td>
                <td className="whitespace-nowrap px-3 py-2.5 text-slate-500">{c.createdAt ? new Date(c.createdAt).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" }) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Pagination ── */}
      {pages > 1 && (
        <div className="mt-3 flex items-center justify-center gap-2 text-sm">
          <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 disabled:opacity-40">‹ Prev</button>
          <span className="text-slate-500">Page {page + 1} of {pages}</span>
          <button onClick={() => setPage((p) => Math.min(pages - 1, p + 1))} disabled={page >= pages - 1} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 disabled:opacity-40">Next ›</button>
        </div>
      )}

      {addOpen && <AddContactModal tenantId={tenantId} allTags={allTags.map((t) => t.name)} onClose={() => setAddOpen(false)} onCreated={() => { setAddOpen(false); reload(); }} />}
      {importOpen && <ImportModal tenantId={tenantId} onClose={() => setImportOpen(false)} onImported={() => { setImportOpen(false); reload(); }} />}
    </div>
  );
}

// ── Add contact modal ────────────────────────────────────────────────────────
function AddContactModal({ tenantId, allTags, onClose, onCreated }: { tenantId: string; allTags: string[]; onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ name: "", email: "", phone: "", company: "", tags: [] as string[] });
  const [busy, setBusy] = useState(false);
  const save = async () => {
    if (!form.name && !form.email && !form.phone) { notifyError("Give the contact at least a name, email or phone."); return; }
    setBusy(true);
    const r = await createContactAction(tenantId, form);
    setBusy(false);
    if (!r.ok) notifyError(r.error || "Could not create."); else onCreated();
  };
  const inp = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm";
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-900">Add contact</h3>
          <button onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-100">✕</button>
        </div>
        <div className="space-y-2.5">
          <label className="block text-xs text-slate-600">Name<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inp} /></label>
          <div className="grid grid-cols-2 gap-2">
            <label className="block text-xs text-slate-600">Email<input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inp} /></label>
            <label className="block text-xs text-slate-600">Phone<input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inp} /></label>
          </div>
          <label className="block text-xs text-slate-600">Company<input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} className={inp} /></label>
          {allTags.length > 0 && (
            <div>
              <div className="mb-1 text-xs text-slate-600">Tags</div>
              <div className="flex flex-wrap gap-1">
                {allTags.map((t) => (
                  <button key={t} onClick={() => setForm((f) => ({ ...f, tags: f.tags.includes(t) ? f.tags.filter((x) => x !== t) : [...f.tags, t] }))}
                    className={`rounded-full px-2 py-0.5 text-[11px] ${form.tags.includes(t) ? "bg-[#1e3a8a] text-white" : "text-slate-600 ring-1 ring-slate-200"}`}>{t}</button>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
          <button onClick={save} disabled={busy} className="rounded-lg bg-[#1e3a8a] px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{busy ? "Saving…" : "Save contact"}</button>
        </div>
      </div>
    </div>
  );
}

// ── CSV import modal: paste/upload → map columns → import ───────────────────
const MAP_TARGETS = ["(skip)", "name", "email", "phone", "company", "tags", "source"] as const;
function ImportModal({ tenantId, onClose, onImported }: { tenantId: string; onClose: () => void; onImported: () => void }) {
  const [grid, setGrid] = useState<string[][] | null>(null);
  const [map, setMap] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const load = (text: string) => {
    const g = parseCsv(text);
    if (!g.length) { notifyError("Couldn't read any rows."); return; }
    setGrid(g);
    // Auto-map by header name.
    const headers = g[0].map((h) => h.trim().toLowerCase());
    setMap(headers.map((h) => {
      if (/^(full ?name|name|contact)/.test(h)) return "name";
      if (/e-?mail/.test(h)) return "email";
      if (/phone|mobile|tel/.test(h)) return "phone";
      if (/company|business|org/.test(h)) return "company";
      if (/tags?/.test(h)) return "tags";
      if (/source/.test(h)) return "source";
      return "(skip)";
    }));
  };
  const onFile = (f: File | null) => { if (!f) return; f.text().then(load).catch(() => notifyError("Could not read the file.")); };

  const doImport = async () => {
    if (!grid) return;
    const rows = grid.slice(1).map((r) => {
      const o: any = {};
      map.forEach((target, i) => {
        if (target === "(skip)") return;
        const v = (r[i] ?? "").trim();
        if (!v) return;
        if (target === "tags") o.tags = v.split(/[;|,]/).map((t: string) => t.trim()).filter(Boolean);
        else o[target] = v;
      });
      return o;
    });
    setBusy(true);
    const r = await importContactsAction(tenantId, rows);
    setBusy(false);
    if (!r.ok) { notifyError(r.error || "Import failed."); return; }
    setResult(`Imported ${r.inserted} contact${r.inserted === 1 ? "" : "s"}${r.skipped ? ` · skipped ${r.skipped} (already exist)` : ""}.`);
  };

  const inp = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm";
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={onClose}>
      <div className="w-full max-w-2xl rounded-2xl bg-white p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-900">Import contacts (CSV)</h3>
          <button onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-100">✕</button>
        </div>
        {result ? (
          <div className="space-y-4">
            <div className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{result}</div>
            <div className="flex justify-end"><button onClick={onImported} className="rounded-lg bg-[#1e3a8a] px-4 py-2 text-sm font-medium text-white">Done</button></div>
          </div>
        ) : !grid ? (
          <div className="space-y-3">
            <p className="text-sm text-slate-500">Upload a CSV file or paste rows below. First row = column headers (e.g. name, email, phone).</p>
            <input type="file" accept=".csv,text/csv" onChange={(e) => onFile(e.target.files?.[0] ?? null)} className="text-sm" />
            <textarea rows={6} placeholder={"name,email,phone\nJane Doe,jane@x.com,613-555-0101"} className={inp}
              onBlur={(e) => { if (e.target.value.trim()) load(e.target.value); }} />
            <p className="text-xs text-slate-400">Duplicates are skipped automatically (matched by email).</p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-slate-600">{grid.length - 1} row{grid.length === 2 ? "" : "s"} found. Map each column:</p>
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full text-xs">
                <thead>
                  <tr>{grid[0].map((h, i) => (
                    <th key={i} className="border-b border-slate-100 px-2 py-1.5 text-left">
                      <div className="mb-1 font-medium text-slate-500">{h || `Column ${i + 1}`}</div>
                      <select value={map[i] ?? "(skip)"} onChange={(e) => setMap((m) => m.map((x, j) => (j === i ? e.target.value : x)))} className="rounded border border-slate-300 px-1 py-0.5 text-xs">
                        {MAP_TARGETS.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </th>
                  ))}</tr>
                </thead>
                <tbody>
                  {grid.slice(1, 4).map((r, ri) => (
                    <tr key={ri}>{grid[0].map((_, ci) => <td key={ci} className="truncate border-b border-slate-50 px-2 py-1 text-slate-600">{r[ci] ?? ""}</td>)}</tr>
                  ))}
                </tbody>
              </table>
            </div>
            {grid.length > 4 && <p className="text-xs text-slate-400">…showing the first 3 rows.</p>}
            <div className="flex justify-end gap-2">
              <button onClick={() => { setGrid(null); setMap([]); }} className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">Back</button>
              <button onClick={doImport} disabled={busy || !map.includes("email") && !map.includes("name") && !map.includes("phone")} className="rounded-lg bg-[#1e3a8a] px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
                {busy ? "Importing…" : `Import ${grid.length - 1} rows`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
