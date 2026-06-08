"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import {
  addTemplate,
  updateTemplate,
  deleteTemplate,
  applyTemplateToPage,
  attachBlockToPage,
  deleteGlobalBlock,
  updateGlobalBlock,
  makeGlobalEditable,
  type SectionTemplate,
} from "../actions";

interface SectionTemplatesPanelProps {
  tenantId: string;
  selectedPageId: string | null;
  websiteId?: string | null;
  onApplied?: () => void;
}

type GlobalBlock = { id: string; name: string; type: string | null; content?: any; draft_content?: any };

/**
 * Saved Assets panel. Saved section TEMPLATES and GLOBAL blocks are rendered as clean,
 * draggable tiles that match the Prebuilt Sections look — drag one onto the canvas to drop
 * the saved section(s) in, rename it inline (✎), or delete it (🗑). Click inserts too.
 */
export default function SectionTemplatesPanel({
  tenantId,
  selectedPageId,
  websiteId,
  onApplied,
}: SectionTemplatesPanelProps) {
  const supabase = createClient();

  const [templates, setTemplates] = useState<SectionTemplate[]>([]);
  const [globals, setGlobals] = useState<GlobalBlock[]>([]);
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<string | null>(null); // id being renamed

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("website_section_templates")
        .select("id, tenant_id, name, description, sections, created_at")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false });
      if (data) setTemplates(data as SectionTemplate[]);
      // Scope global Header/Footer/etc. to the CURRENT website (plus any tenant-level shared
      // blocks with no website_id) — otherwise every website's header/footer stacks up here.
      let gq = supabase
        .from("website_global_blocks")
        .select("id, name, type, content, draft_content")
        .eq("tenant_id", tenantId);
      if (websiteId) gq = gq.or(`website_id.eq.${websiteId},website_id.is.null`);
      const { data: gb } = await gq.order("updated_at", { ascending: false });
      if (gb) setGlobals(gb as GlobalBlock[]);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId, websiteId]);

  async function handleCreateFromPage() {
    if (!selectedPageId) { alert("Select a page first."); return; }
    if (!newName.trim()) { alert("Give the saved section a name."); return; }
    setBusy(true);
    try {
      const { data: rows } = await supabase
        .from("website_page_sections")
        .select("content, order_index")
        .eq("tenant_id", tenantId)
        .eq("page_id", selectedPageId)
        .order("order_index");
      const sections = (rows ?? []).map((r: any) => r.content);
      const created = await addTemplate(tenantId, newName.trim(), null, sections);
      setTemplates((prev) => [created, ...prev]);
      setNewName("");
    } catch (e: any) {
      alert(e?.message ?? "Failed to save section.");
    } finally {
      setBusy(false);
    }
  }

  async function handleApply(id: string) {
    if (!selectedPageId) { alert("Select a page to apply to."); return; }
    if (!confirm("Apply this template? It will REPLACE the current page's sections.")) return;
    setBusy(true);
    try { await applyTemplateToPage(id, selectedPageId, tenantId); onApplied?.(); }
    catch (e: any) { alert(e?.message ?? "Failed to apply."); }
    finally { setBusy(false); }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this saved section?")) return;
    setTemplates((prev) => prev.filter((t) => t.id !== id));
    try { await deleteTemplate(id, tenantId); } catch (e: any) { alert(e?.message ?? "Delete failed."); }
  }

  async function commitRename(id: string, name: string) {
    setEditing(null);
    const clean = name.trim() || "Saved section";
    setTemplates((prev) => prev.map((t) => (t.id === id ? { ...t, name: clean } : t)));
    try { await updateTemplate(id, tenantId, { name: clean }); } catch { /* keep local */ }
  }

  async function deleteGlobal(id: string) {
    if (!confirm("Delete this saved global section? It will be removed from every page.")) return;
    setGlobals((prev) => prev.filter((g) => g.id !== id));
    try { await deleteGlobalBlock(tenantId, id); } catch (e: any) { alert(e?.message ?? "Delete failed."); }
  }

  async function commitRenameGlobal(id: string, name: string) {
    setEditing(null);
    const clean = name.trim() || "Global section";
    setGlobals((prev) => prev.map((g) => (g.id === id ? { ...g, name: clean } : g)));
    try { await updateGlobalBlock(tenantId, id, { name: clean }); } catch { /* keep local */ }
  }

  // Drag payload: an array of section content objects (the canvas inserts them as sections).
  const dragSections = (e: React.DragEvent, sections: any[]) => {
    e.dataTransfer.effectAllowed = "copy";
    e.dataTransfer.setData("text/abc-template", JSON.stringify(sections));
  };

  const ICON = (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M4 4h16v6H4zM4 14h10v6H4z" /></svg>
  );

  return (
    <div className="flex flex-col gap-4">
      {/* Save the current page as a reusable section */}
      <div className="flex flex-col gap-2 rounded-xl border border-slate-200 p-3">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Save this page as a section</span>
        <div className="flex gap-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Name (e.g. My Hero)"
            className="min-w-0 flex-1 rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
          />
          <button
            onClick={handleCreateFromPage}
            disabled={busy || !selectedPageId}
            className="shrink-0 rounded-lg bg-[#1e3a8a] px-3 py-1.5 text-sm font-medium text-white disabled:opacity-40"
          >Save</button>
        </div>
      </div>

      {/* Global sections (synced site-wide) */}
      {globals.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Global Sections (synced site-wide)</span>
          {globals.map((g) => {
            const content = g.draft_content ?? g.content;
            const isEditing = editing === g.id;
            return (
              <div
                key={g.id}
                draggable={!isEditing && !!content}
                onDragStart={(e) => content && dragSections(e, [content])}
                className="group relative flex cursor-grab flex-col gap-1 rounded-xl border border-slate-200 p-3 transition hover:-translate-y-0.5 hover:border-[#1e3a8a]/40 hover:shadow-sm active:cursor-grabbing"
              >
                <div className="flex items-center gap-2 pr-12">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-violet-500/10 to-fuchsia-500/10 text-violet-700">🔗</span>
                  {isEditing ? (
                    <input
                      autoFocus defaultValue={g.name || ""}
                      onBlur={(e) => commitRenameGlobal(g.id, e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); if (e.key === "Escape") setEditing(null); }}
                      className="min-w-0 flex-1 rounded border border-slate-300 px-1.5 py-0.5 text-sm"
                    />
                  ) : (
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-slate-700">{g.name || "Global section"}</div>
                      <div className="text-[11px] text-slate-400">{g.type || "section"} · drag onto the page</div>
                    </div>
                  )}
                </div>
                {/* hover actions */}
                <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition group-hover:opacity-100">
                  <button title="Rename" onClick={() => setEditing(g.id)} className="grid h-6 w-6 place-items-center rounded-md border border-slate-200 bg-white text-slate-500 hover:text-[#1e3a8a]">✎</button>
                  <button title="Delete" onClick={() => deleteGlobal(g.id)} className="grid h-6 w-6 place-items-center rounded-md border border-slate-200 bg-white text-slate-500 hover:text-red-600">🗑</button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={async () => {
                      if (!selectedPageId) { alert("Select a page first."); return; }
                      try { await attachBlockToPage(selectedPageId, tenantId, g.id); onApplied?.(); }
                      catch (e: any) { alert(e?.message ?? "Could not insert."); }
                    }}
                    className="rounded-lg bg-violet-600 px-2.5 py-1 text-xs font-medium text-white">Insert on page</button>
                  {g.type !== "row" && (
                    <button
                      onClick={async () => {
                        if (!confirm("Convert this into editable rows? Your text is kept.")) return;
                        const r = await makeGlobalEditable(tenantId, g.id);
                        if (!r.ok) { alert(r.error ?? "Could not convert."); return; }
                        setGlobals((prev) => prev.map((x) => x.id === g.id ? { ...x, type: "row" } : x));
                        onApplied?.();
                      }}
                      className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-600">Make editable</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Saved section templates */}
      <div className="flex flex-col gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Saved Sections</span>
        {templates.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-200 p-5 text-center text-xs text-slate-400">
            Nothing saved yet. Save any section with its ⭐ on the canvas, or use “Save this page as a section” above.
          </div>
        )}
        {templates.map((t) => {
          const sections = Array.isArray(t.sections) ? t.sections : [];
          const count = sections.length;
          const isEditing = editing === t.id;
          return (
            <div
              key={t.id}
              draggable={!isEditing}
              onDragStart={(e) => dragSections(e, sections)}
              className="group relative flex cursor-grab flex-col gap-1 rounded-xl border border-slate-200 p-3 transition hover:-translate-y-0.5 hover:border-[#1e3a8a]/40 hover:shadow-sm active:cursor-grabbing"
            >
              <div className="flex items-center gap-2 pr-12">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-[#2563eb]/10 to-[#22d3ee]/10 text-[#1e3a8a]">{ICON}</span>
                {isEditing ? (
                  <input
                    autoFocus defaultValue={t.name}
                    onBlur={(e) => commitRename(t.id, e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); if (e.key === "Escape") setEditing(null); }}
                    className="min-w-0 flex-1 rounded border border-slate-300 px-1.5 py-0.5 text-sm"
                  />
                ) : (
                  <div className="min-w-0" onDoubleClick={() => setEditing(t.id)}>
                    <div className="truncate text-sm font-medium text-slate-700">{t.name}</div>
                    <div className="text-[11px] text-slate-400">{count} section{count === 1 ? "" : "s"} · drag onto the page</div>
                  </div>
                )}
              </div>
              {/* hover actions */}
              <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition group-hover:opacity-100">
                <button title="Rename" onClick={() => setEditing(t.id)} className="grid h-6 w-6 place-items-center rounded-md border border-slate-200 bg-white text-slate-500 hover:text-[#1e3a8a]">✎</button>
                <button title="Delete" onClick={() => handleDelete(t.id)} className="grid h-6 w-6 place-items-center rounded-md border border-slate-200 bg-white text-slate-500 hover:text-red-600">🗑</button>
              </div>
              <div>
                <button
                  onClick={() => handleApply(t.id)}
                  disabled={busy || !selectedPageId}
                  title="Replace the current page with this saved section"
                  className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-600 disabled:opacity-40">Apply to page</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
