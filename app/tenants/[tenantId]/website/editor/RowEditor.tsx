"use client";

import { useRef, useState } from "react";
import { SectionView } from "@/components/sections/registry";
import { sectionLabels, type SectionType, type SectionContent } from "@/lib/sections/schemas";
import { styleToCss, bgLayerCss, bgFadeOverlayCss, hasBgLayer, resolveStyle, animClasses, type ElementStyle } from "@/lib/design/element-style";
import type { ThemeTokens } from "@/lib/sections/theme";

/**
 * Editable Row container for the editor canvas (best-in-class nested editing).
 *
 * A row has 1–6 columns; each column stacks children top→bottom. A child is
 * either an ELEMENT (selectable/editable/draggable) or a NESTED ROW (rendered by
 * a nested RowEditor so its children are ALSO individually editable/draggable —
 * to any depth). Every node is addressed by a PATH of {col,idx} segments from the
 * top-level row item, so selection, the inspector, the Layers tree, AND drag all
 * work at any depth.
 *
 * Add affordances are hover-only: a "+" appears on the top/bottom border of the
 * hovered element (insert above/below). Empty columns show a single add prompt.
 */

export type Seg = { col: number; idx: number };
export type ElPath = Seg[];                 // last seg points to the element / nested-row
export interface ChildSel { rowUid: string; path: ElPath }
export interface ColSel { rowUid: string; container: ElPath; col: number } // container = nested-row segs

export function pathsEqual(a?: ElPath | null, b?: ElPath | null): boolean {
  if (!a || !b || a.length !== b.length) return false;
  return a.every((s, i) => s.col === b[i].col && s.idx === b[i].idx);
}

interface RowEditorProps {
  rowUid: string;
  content: any; // RowContent
  theme: ThemeTokens;
  childSel: ChildSel | null;
  colSel: ColSel | null;
  drop: any; // Canvas DropTarget | null
  pathPrefix?: ElPath; // segments to reach THIS row (top-level = [])
  onSelectChild: (path: ElPath) => void;
  onSelectColumn: (container: ElPath, col: number) => void;
  onAddToColumn: (container: ElPath, col: number, atIdx: number) => void;
  onDuplicateColumn: (container: ElPath, col: number) => void;
  onDeleteColumn: (container: ElPath, col: number) => void;
  onDeleteChild: (path: ElPath) => void;
  onDuplicateChild: (path: ElPath) => void;
  onMoveChild: (path: ElPath, dir: -1 | 1) => void;
  onEditChildText: (path: ElPath, text: string) => void; // in-place text edit
  onEditChildItems: (path: ElPath, items: { text: string }[]) => void; // bullet-list items

  onResize: (container: ElPath, dividerIndex: number, deltaRatio: number) => void;
  onResizeStart?: () => void; // begin history batch (one undo entry per drag)
  onResizeEnd?: () => void;   // commit the single history entry
  // path-based drag-and-drop wiring (Canvas owns the logic + black-line state)
  onChildDragStart: (path: ElPath, e: React.DragEvent) => void;
  onChildDragOver: (container: ElPath, col: number, idx: number, e: React.DragEvent) => void;
  onColDragOver: (container: ElPath, col: number, count: number, e: React.DragEvent) => void;
  onCellDrop: (e: React.DragEvent) => void;
  // single innermost-hovered element key (so only ONE element shows chrome)
  hoverKey: string | null;
  onHover: (key: string | null) => void;
  bp?: import("@/lib/design/element-style").Breakpoint; // active breakpoint for canvas render
}

export default function RowEditor(props: RowEditorProps) {
  const {
    rowUid, content, theme, childSel, colSel, drop, pathPrefix = [],
    onSelectChild, onSelectColumn, onAddToColumn, onDuplicateColumn, onDeleteColumn, onDeleteChild, onDuplicateChild, onMoveChild, onEditChildText, onEditChildItems, onResize,
    onChildDragStart, onChildDragOver, onColDragOver, onCellDrop, hoverKey, onHover, bp = "desktop",
  } = props;
  const nested = pathPrefix.length > 0;
  const keyOf = (path: ElPath) => `${rowUid}::${path.map((s) => `${s.col}.${s.idx}`).join("-")}`;
  const cols = Math.max(1, Math.min(12, content.columns || 1));
  const widths: number[] =
    Array.isArray(content.widths) && content.widths.length === cols
      ? content.widths
      : Array.from({ length: cols }, () => 1 / cols);
  const gap = typeof content.gap === "number" ? content.gap : 16;
  const colStyles: ElementStyle[] = Array.isArray(content.colStyles) ? content.colStyles : [];
  const rowRef = useRef<HTMLDivElement>(null);
  const [guideX, setGuideX] = useState<number | null>(null); // pink resize-snap guide (px from row left)
  // Section-level layout (top-level rows): content width, vertical align, min height.
  const valignMap: Record<string, string> = { top: "flex-start", center: "center", bottom: "flex-end" };
  // Inner flex layout (gap + vertical align) vs. the OUTER box (its own background +
  // sizing). Splitting them lets the row paint a layered bg behind the columns.
  const rowInnerStyle: React.CSSProperties = { gap };
  const rowOuterStyle: React.CSSProperties = {};
  if (!nested) {
    if (content.valign) rowInnerStyle.alignItems = valignMap[content.valign];
    if (content.minHeight) rowOuterStyle.minHeight = content.minHeight;
  }
  // WYSIWYG width tiers (Ali 2026-06-11): cap the INNER content — same TIER map as the
  // renderer registry — while the band's background stays full-bleed on the outer box.
  // (Was: hardcoded 1200px on the OUTER box, which also clipped the band background.)
  const TIER_MAXW: Record<string, string> = { boxed: "var(--abc-maxw, 1200px)", wide: "var(--abc-maxw, 1200px)", medium: "960px", small: "720px" };
  const tierW = TIER_MAXW[(content as any).contentWidth as string];
  if (tierW) { rowInnerStyle.maxWidth = tierW; rowInnerStyle.marginLeft = "auto"; rowInnerStyle.marginRight = "auto"; }
  // Mobile stacking (Copilot-ratified default ON). Mirror the live behavior on the
  // editor canvas when previewing the mobile device, so what you see is what ships.
  const mStack = (content as any).keepRowOnMobile === true
    ? false
    : ((content as any)._responsive?.mobile?.stackOnMobile ?? (content as any)._style?.stackOnMobile) ?? true;
  // Rule #3 — recursive stacking: nested rows stack at the SAME mobile breakpoint too.
  const stackedNow = bp === "mobile" && mStack;
  // TABLET cap: never show more than ~2–3 columns at once; extras wrap to the next row.
  const tabletCols = cols <= 2 ? cols : cols === 4 ? 2 : 3;
  const wrapTablet = bp === "tablet" && tabletCols < cols;
  if (stackedNow) {
    rowInnerStyle.flexDirection = (content as any).reverseOnMobile === true ? "column-reverse" : "column";
    rowInnerStyle.gap = Math.min(gap, 12); // Rule #5 — shrink container gap on mobile.
  } else if (wrapTablet) {
    // Switch the inner row to a wrapping N-up grid for the tablet preview.
    (rowInnerStyle as any).display = "grid";
    (rowInnerStyle as any).gridTemplateColumns = `repeat(${tabletCols}, minmax(0, 1fr))`;
  }
  // The row's own _style — FULL box (WYSIWYG, Ali 2026-06-11): background + the real
  // padding/margins/radius/border/shadow, resolved for the active breakpoint, exactly like
  // the preview/public BgBox path. (Was: backgroundOnlyCss, which silently dropped the
  // captured pt/pb — e.g. Stitch's 120px section gaps — so the canvas looked tighter than
  // the published page.) The image still renders as a LAYER so blur/parallax never touch
  // the columns.
  const rowEl: ElementStyle | undefined = (content as any)._style;
  const rowLayered = hasBgLayer(rowEl);
  const rowResolved = resolveStyle(rowEl, (content as any)._responsive, bp);
  if (rowEl) Object.assign(rowOuterStyle, styleToCss(rowResolved, { bgAsLayer: rowLayered }));
  const rowLayer = bgLayerCss(rowEl);
  const rowOverlay = bgFadeOverlayCss(rowEl);

  // Black insert line active at (this container, col, index)?
  const lineAt = (ci: number, i: number) =>
    drop && drop.scope === "col" && drop.rowUid === rowUid && pathsEqual(drop.container ?? [], pathPrefix) && drop.col === ci && drop.index === i;
  const blackLine = <div className="my-0.5 h-0.5 rounded bg-black" />;

  // Resize snapping (Copilot ruling A): snap the dragged column divider to clean
  // alignment fractions (even splits, 25/33/50/66/75%) within a 6px threshold, and
  // show a pink vertical guide line while snapped. Targets precomputed on drag start;
  // moves throttled with requestAnimationFrame.
  function snapTargets(n: number): number[] {
    const t = new Set<number>([0.25, 1 / 3, 0.5, 2 / 3, 0.75]);
    for (let i = 1; i < n; i++) t.add(i / n);     // even splits for this column count
    return Array.from(t).sort((a, b) => a - b);
  }
  function startResize(e: React.MouseEvent, dividerIndex: number) {
    e.preventDefault();
    e.stopPropagation();
    const rect = rowRef.current?.getBoundingClientRect();
    const rowWidth = rect?.width || 1;
    const rowLeft = rect?.left ?? 0;
    const MIN = 0.05;
    const threshFrac = 6 / rowWidth; // 6px snap threshold (Copilot)
    const targets = snapTargets(cols);
    const startW = [...widths];
    const i = dividerIndex;
    const leftEdge = startW.slice(0, i).reduce((s, x) => s + x, 0);
    const pairSum = (startW[i] ?? 0) + (startW[i + 1] ?? 0);
    let appliedWi = startW[i] ?? 0;
    let raf = 0;
    props.onResizeStart?.(); // one history entry for the whole drag
    const onMove = (ev: MouseEvent) => {
      const cx = ev.clientX;
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        let boundary = (cx - rowLeft) / rowWidth;
        boundary = Math.min(leftEdge + pairSum - MIN, Math.max(leftEdge + MIN, boundary));
        let snapped = boundary, guide: number | null = null, best = threshFrac;
        for (const t of targets) {
          if (t <= leftEdge + MIN || t >= leftEdge + pairSum - MIN) continue;
          const d = Math.abs(t - boundary);
          if (d <= best) { best = d; snapped = t; guide = t; }
        }
        const desiredWi = snapped - leftEdge;
        const delta = desiredWi - appliedWi;
        if (Math.abs(delta) > 1e-4) { onResize(pathPrefix, i, delta); appliedWi = desiredWi; }
        setGuideX(guide != null ? guide * rowWidth : null);
      });
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      if (raf) cancelAnimationFrame(raf);
      setGuideX(null); // fade the guide on drop (Copilot)
      props.onResizeEnd?.(); // push the single history entry
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  // "+" pill on an element's top/bottom border → insert above/below (shown only
  // for the active = hovered-or-selected element).
  const AddDot = ({ where, ci, idx }: { where: "top" | "bottom"; ci: number; idx: number }) => (
    <button
      onClick={(e) => { e.stopPropagation(); onAddToColumn(pathPrefix, ci, where === "top" ? idx : idx + 1); }}
      title={`Add element ${where === "top" ? "above" : "below"}`}
      className={`absolute left-1/2 z-20 flex h-5 w-5 -translate-x-1/2 items-center justify-center rounded-full bg-[#1e3a8a] text-[12px] leading-none text-white shadow ${where === "top" ? "-top-2.5" : "-bottom-2.5"}`}
    >＋</button>
  );

  return (
    // WYSIWYG: the row's entrance/hover animation classes render on the canvas too (they were
    // dropped here, so animated rows showed nothing until Preview).
    <div ref={rowRef} className={`relative w-full ${animClasses((content as any)._anim)}`.trim()} style={{ ...rowOuterStyle, position: "relative" }} onMouseLeave={!nested ? () => onHover(null) : undefined}>
      {rowLayer && <div aria-hidden style={rowLayer} />}
      {rowOverlay && <div aria-hidden style={rowOverlay} />}
      <div className="relative z-[1] flex w-full" style={rowInnerStyle}>
      {/* Pink resize-snap guide line (polished) — shown while a divider snaps. */}
      {guideX != null && (
        <div className="pointer-events-none absolute top-0 bottom-0 z-30" style={{ left: guideX, width: 2, background: "#ec4899", boxShadow: "0 0 0 0.5px rgba(236,72,153,0.4)" }} />
      )}
      {Array.from({ length: cols }).map((_, ci) => {
        const children: SectionContent[] = Array.isArray(content.children?.[ci]) ? content.children[ci] : [];
        const colSelected = colSel?.rowUid === rowUid && colSel.col === ci && pathsEqual(colSel.container, pathPrefix);
        const colS = colStyles[ci];
        const colLayered = hasBgLayer(colS);
        const colCss = styleToCss(colS, { bgAsLayer: colLayered });
        const colLayer = bgLayerCss(colS);
        const colOverlay = bgFadeOverlayCss(colS);
        // Column content alignment lives on the inner (z-1) wrapper that holds the children.
        const colContentStyle: React.CSSProperties = {};
        if ((colS as any)?.valign) colContentStyle.justifyContent = (colS as any).valign === "center" ? "center" : (colS as any).valign === "end" ? "flex-end" : "flex-start";
        if ((colS as any)?.itemsAlign) colContentStyle.alignItems = (colS as any).itemsAlign === "center" ? "center" : (colS as any).itemsAlign === "end" ? "flex-end" : (colS as any).itemsAlign === "stretch" ? "stretch" : "flex-start";
        // Per-breakpoint hide: drop the column at the active editor device preview.
        if (bp === "desktop" && (colS as any)?.hiddenDesktop) return null;
        if (bp === "tablet" && (colS as any)?.hiddenTablet) return null;
        if (bp === "mobile" && (colS as any)?.hiddenMobile) return null;
        const px = (colStyles[ci] as any)?.widthPx;
        const wrapStyle: React.CSSProperties = stackedNow
          ? { flex: "1 1 100%", minWidth: 0, width: "100%" }
          : px != null
            ? { flex: `0 0 ${px}px`, minWidth: 0 }
            : { flexGrow: (widths[ci] ?? 1 / cols), flexShrink: 1, flexBasis: 0, minWidth: 0 };
        return (
          <div key={ci} className="relative flex" style={wrapStyle}>
            <div
              onClick={(e) => { e.stopPropagation(); onSelectColumn(pathPrefix, ci); }}
              onMouseMove={(e) => { e.stopPropagation(); if (hoverKey !== null) onHover(null); }}
              onDragOver={(e) => onColDragOver(pathPrefix, ci, children.length, e)}
              onDrop={(e) => { e.stopPropagation(); onCellDrop(e); }}
              style={colCss}
              className={`group/col relative flex min-w-0 flex-1 flex-col rounded-md border border-dashed p-1 transition ${
                colSelected ? "border-[#1e3a8a] bg-[#1e3a8a]/5" : "border-slate-200 hover:border-[#1e3a8a]/40"
              }`}
            >
              {colLayer && <div aria-hidden style={colLayer} />}
              {colOverlay && <div aria-hidden style={colOverlay} />}
              <div className="relative z-[1] flex min-w-0 flex-1 flex-col" style={colContentStyle}>
              <div className="mb-1 flex items-center justify-between px-1 opacity-0 transition group-hover/col:opacity-100">
                <span className="text-[9px] font-medium uppercase tracking-wide text-slate-400">Col {ci + 1}</span>
              </div>
              {/* Column toolbar (when the column is chosen) — duplicate / delete column. */}
              {colSelected && (
                <div className="absolute -top-2.5 right-2 z-40 flex items-center gap-0.5 rounded border border-[#1e3a8a]/40 bg-white px-1 py-0.5 shadow-sm">
                  <span className="px-0.5 text-[8px] uppercase text-[#1e3a8a]">Col {ci + 1}</span>
                  <button onClick={(e) => { e.stopPropagation(); onDuplicateColumn(pathPrefix, ci); }} title="Duplicate column" className="rounded p-0.5 text-slate-500 hover:bg-slate-100">⧉</button>
                  <button onClick={(e) => { e.stopPropagation(); onDeleteColumn(pathPrefix, ci); }} title="Delete column" className="rounded p-0.5 text-red-500 hover:bg-red-50">🗑</button>
                </div>
              )}

              {lineAt(ci, 0) && blackLine}

              {children.map((child, idx) => {
                const elPath: ElPath = [...pathPrefix, { col: ci, idx }];
                const isRow = (child as any)?.type === "row";
                const sel = childSel?.rowUid === rowUid && pathsEqual(childSel.path, elPath);
                const thisKey = keyOf(elPath);
                // Active = THIS node is the innermost hovered one, or it's selected.
                // Rows are first-class too (you can move/duplicate/delete a whole row).
                const active = hoverKey === thisKey || sel;
                return (
                  <div key={idx}>
                    <div
                      data-abc-selected={sel ? "1" : undefined}
                      draggable={!sel}
                      onDragStart={(e) => { e.stopPropagation(); onChildDragStart(elPath, e); }}
                      onDragOver={(e) => onChildDragOver(pathPrefix, ci, idx, e)}
                      onDrop={(e) => { e.stopPropagation(); onCellDrop(e); }}
                      onClick={(e) => { e.stopPropagation(); onSelectChild(elPath); }}
                      onMouseMove={(e) => { e.stopPropagation(); if (hoverKey !== thisKey) onHover(thisKey); }}
                      className={`relative rounded-md border p-1 transition ${isRow ? "cursor-default" : "cursor-move"} ${
                        active ? "border-[#1e3a8a] ring-1 ring-[#1e3a8a]/40" : "border-transparent"
                      }`}
                    >
                      {active && <AddDot where="top" ci={ci} idx={idx} />}
                      {active && (
                        // Controls distributed around the element's perimeter (polished) so they
                        // never crowd small elements: drag + move at top-left, duplicate + delete at
                        // top-right, and the element type as a small tag at the bottom-left corner.
                        <>
                          <div className="absolute -top-7 -left-1 z-30 flex items-center gap-0.5 rounded border border-slate-200 bg-white px-0.5 py-0.5 shadow-sm">
                            {/* Dedicated drag handle — always draggable (even when selected). */}
                            <span draggable
                              onDragStart={(e) => { e.stopPropagation(); onChildDragStart(elPath, e); }}
                              title="Drag to move / reorder"
                              className="cursor-grab px-0.5 text-slate-400 hover:text-[#1e3a8a] active:cursor-grabbing">⠿</span>
                            <button onClick={(e) => { e.stopPropagation(); onMoveChild(elPath, -1); }} title="Move up" className="rounded p-0.5 text-slate-500 hover:bg-slate-100">↑</button>
                            <button onClick={(e) => { e.stopPropagation(); onMoveChild(elPath, 1); }} title="Move down" className="rounded p-0.5 text-slate-500 hover:bg-slate-100">↓</button>
                          </div>
                          <div className="absolute -top-7 -right-1 z-30 flex items-center gap-0.5 rounded border border-slate-200 bg-white px-0.5 py-0.5 shadow-sm">
                            <button onClick={(e) => { e.stopPropagation(); onDuplicateChild(elPath); }} title="Duplicate" className="rounded p-0.5 text-slate-500 hover:bg-slate-100">⧉</button>
                            <button onClick={(e) => { e.stopPropagation(); onDeleteChild(elPath); }} title="Delete" className="rounded p-0.5 text-red-500 hover:bg-red-50">🗑</button>
                          </div>
                          <span className="pointer-events-none absolute -bottom-6 -left-1 z-30 rounded border border-slate-200 bg-white px-1 py-px text-[8px] uppercase leading-none text-slate-400 shadow-sm">
                            {sectionLabels[(child as any).type as SectionType] ?? "El"}
                          </span>
                        </>
                      )}
                      {isRow ? (
                        <RowEditor {...props} content={child} pathPrefix={elPath} />
                      ) : (
                        <SectionView content={child} theme={theme} bp={bp}
                          onEditText={sel ? (t) => onEditChildText(elPath, t) : undefined}
                          onEditItems={sel ? (items) => onEditChildItems(elPath, items) : undefined} />
                      )}
                      {active && <AddDot where="bottom" ci={ci} idx={idx} />}
                    </div>
                    {lineAt(ci, idx + 1) && blackLine}
                  </div>
                );
              })}

              {/* Empty column: a single subtle add prompt (drop target too). */}
              {children.length === 0 && (
                <button
                  onClick={(e) => { e.stopPropagation(); onAddToColumn(pathPrefix, ci, 0); }}
                  className="m-1 flex items-center justify-center gap-1 rounded-md border border-dashed border-slate-300 py-3 text-[11px] text-slate-400 hover:border-[#1e3a8a]/50 hover:text-[#1e3a8a]"
                >＋ Add element</button>
              )}
              </div>
            </div>

            {ci < cols - 1 && (
              <div
                onMouseDown={(e) => startResize(e, ci)}
                title="Drag to resize columns"
                className="group/res absolute top-0 z-20 flex h-full w-2 cursor-col-resize items-center justify-center"
                style={{ right: -(gap / 2) - 1 }}
              >
                <div className="h-10 w-1 rounded bg-slate-300 opacity-0 transition group-hover/res:opacity-100" />
              </div>
            )}
          </div>
        );
      })}
      </div>
    </div>
  );
}
