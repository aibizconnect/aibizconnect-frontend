"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { buildLayers, type LayerNode, type ElPath, type GlobalBlockInput } from "@/lib/sections/layers";
import type { SectionContent } from "@/lib/sections/schemas";

function pathsEqual(a?: ElPath | null, b?: ElPath | null): boolean {
  if (!a || !b || a.length !== b.length) return false;
  return a.every((s, i) => s.col === b[i].col && s.idx === b[i].idx);
}

/**
 * Layers tree panel (locked spec): type-only labels, full hierarchy, everything
 * visible (no collapsing, no hiding, no lock icons). Order Header → Hero →
 * Sections → Footer; inside each Row → Column → Element (+ nested rows).
 *
 * Clicking any node selects the AST node, highlights + scrolls the canvas to it,
 * and opens the inspector. Selection is two-way synced with the canvas.
 *
 * `sections` is the LIVE canvas structure (lifted from Canvas), so the tree
 * stays in sync with unsaved edits.
 */
export interface LayerSelection {
  index: number;
  path?: ElPath;
}

const ICON: Record<string, string> = {
  section: "▤", row: "▦", column: "▯",
  heading: "H", subheading: "h", text: "¶", image: "🖼", button: "▭",
  "bullet-list": "≣", social: "✦", divider: "―", video: "▷", spacer: "␣",
};

function kindColor(kind: string): string {
  switch (kind) {
    case "section": return "text-[#1e3a8a]";
    case "row": return "text-emerald-600";
    case "column": return "text-amber-600";
    default: return "text-slate-500";
  }
}

function isSelected(node: LayerNode, sel: LayerSelection | null): boolean {
  if (!sel) return false;
  if (node.sectionIndex !== sel.index) return false;
  if (node.childPath && sel.path) return pathsEqual(node.childPath, sel.path);
  return node.kind === "section" && !sel.path;
}

function Node({
  node, depth, sel, onSelect, onExpand, collapsed, onToggle,
}: {
  node: LayerNode; depth: number; sel: LayerSelection | null;
  onSelect: (s: LayerSelection) => void;
  onExpand: (id: string) => void;
  collapsed: Set<string>;
  onToggle: (id: string) => void;
}) {
  const selected = isSelected(node, sel);
  const icon = node.kind === "element" ? (ICON[node.type ?? ""] ?? "•") : ICON[node.kind];
  const hasChildren = !!node.children?.length;
  const isCollapsed = collapsed.has(node.id);

  return (
    <div>
      <div
        onClick={() => { onSelect({ index: node.sectionIndex, path: node.childPath }); if (hasChildren) onExpand(node.id); }}
        title={node.label}
        className={`group flex cursor-pointer items-center gap-1 rounded-md py-1 pr-2 text-[13px] transition ${
          selected ? "bg-[#3b82f6]/15 ring-1 ring-[#3b82f6]/50" : "hover:bg-slate-100"
        }`}
        style={{ paddingLeft: depth * 16 + 4 }}
      >
        {hasChildren ? (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onToggle(node.id); }}
            title={isCollapsed ? "Expand" : "Collapse"}
            className="grid h-4 w-4 shrink-0 place-items-center rounded text-[10px] text-slate-400 hover:bg-slate-200 hover:text-slate-700"
          >
            <span className={`transition-transform ${isCollapsed ? "" : "rotate-90"}`}>▸</span>
          </button>
        ) : (
          <span className="h-4 w-4 shrink-0" />
        )}
        <span className={`w-4 shrink-0 text-center text-[11px] ${kindColor(node.kind)}`}>{icon}</span>
        <span className={`truncate ${node.kind === "section" ? "font-semibold text-slate-800" : node.kind === "element" ? "text-slate-600" : "text-slate-500"}`}>
          {node.label}
        </span>
      </div>
      {hasChildren && !isCollapsed && (
        <div>
          {node.children!.map((c) => (
            <Node key={c.id} node={c} depth={depth + 1} sel={sel} onSelect={onSelect} onExpand={onExpand} collapsed={collapsed} onToggle={onToggle} />
          ))}
        </div>
      )}
    </div>
  );
}

/** Ids of every CONTAINER on the path to the selected node (so we can reveal it). */
function ancestorsOf(nodes: LayerNode[], sel: LayerSelection, trail: LayerNode[] = []): string[] | null {
  for (const n of nodes) {
    const match = isSelected(n, sel);
    if (match) return trail.filter((t) => t.children?.length).map((t) => t.id);
    if (n.children?.length) {
      const r = ancestorsOf(n.children, sel, [...trail, n]);
      if (r) return r;
    }
  }
  return null;
}

export default function LayersPanel({
  sections, globals = [], selected, onSelect,
}: {
  sections: SectionContent[];
  globals?: GlobalBlockInput[];
  selected: LayerSelection | null;
  onSelect: (s: LayerSelection) => void;
  onOpenGlobal?: (id: string) => void;
}) {
  const tree = useMemo(() => buildLayers(sections ?? [], globals), [sections, globals]);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const toggle = (id: string) =>
    setCollapsed((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  // Expand-only (clicking a section row reveals it; never collapses on selection).
  const expand = (id: string) =>
    setCollapsed((prev) => { if (!prev.has(id)) return prev; const next = new Set(prev); next.delete(id); return next; });

  // All node ids that have children (for collapse-all / expand-all).
  const parentIds = useMemo(() => {
    const ids: string[] = [];
    const walk = (n: LayerNode) => { if (n.children?.length) { ids.push(n.id); n.children.forEach(walk); } };
    tree.forEach(walk);
    return ids;
  }, [tree]);
  const allCollapsed = parentIds.length > 0 && parentIds.every((id) => collapsed.has(id));

  // Start collapsed ONCE (first time the tree is non-empty). Keyed on a stable
  // signature so structure re-lifts on selection never re-collapse the user's view.
  const initSig = useRef<string | null>(null);
  useEffect(() => {
    const sig = parentIds.length ? `n${parentIds.length}` : "";
    if (sig && initSig.current === null) {
      setCollapsed(new Set(parentIds));
      initSig.current = sig;
    }
  }, [parentIds]);

  // When the canvas selects a node, REVEAL it by expanding its ancestors (instead of
  // the user having to dig). Never collapses anything.
  useEffect(() => {
    if (!selected) return;
    const anc = ancestorsOf(tree, selected);
    if (anc && anc.length) setCollapsed((prev) => { if (anc.every((id) => !prev.has(id))) return prev; const next = new Set(prev); anc.forEach((id) => next.delete(id)); return next; });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, tree]);

  if (!sections?.length && !globals.length) {
    return <p className="px-1 py-2 text-sm text-slate-500">This page has no elements yet. Add one from the Add panel.</p>;
  }

  return (
    <div className="flex h-full flex-col">
      <div className="mb-1 flex items-center justify-between px-1">
        <span className="text-[11px] uppercase tracking-wide text-slate-400">Page structure</span>
        <button
          type="button"
          onClick={() => setCollapsed(allCollapsed ? new Set() : new Set(parentIds))}
          className="rounded px-1.5 py-0.5 text-[11px] text-slate-400 hover:bg-slate-100 hover:text-slate-600"
        >
          {allCollapsed ? "Expand all" : "Collapse all"}
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto pr-1">
        {tree.map((n) => (
          <Node key={n.id} node={n} depth={0} sel={selected} onSelect={onSelect} onExpand={expand} collapsed={collapsed} onToggle={toggle} />
        ))}
      </div>
    </div>
  );
}
