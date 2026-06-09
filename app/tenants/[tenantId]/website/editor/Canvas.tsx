"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { SectionView } from "@/components/sections/registry";
import SectionEditor from "./SectionEditor";
import TextFormatPopup from "./TextFormatPopup";
import RowEditor, { type ChildSel, type ColSel, type ElPath, pathsEqual } from "./RowEditor";
import ColumnInspector from "./ColumnInspector";
import SaveAssetModal from "./SaveAssetModal";
import {
  saveDraft,
  getEditorSections,
  generateSectionAI,
  rewriteSectionAI,
  getPageBlocks,
  saveGlobalBlockNow,
  getPagesUsingBlocks,
  addTemplate,
  listTemplates,
  createGlobalBlock,
  attachBlockToPage,
  detachBlockFromPage,
  getPageBackground,
  type ResolvedBlock,
} from "../actions";
import {
  type SectionContent,
  type SectionType,
  sectionTypes,
  sectionLabels,
  defaultContentFor,
  makeRow,
  sectionSchema,
} from "@/lib/sections/schemas";
import {
  DEFAULT_THEME,
  resolveTheme,
  mergeBrandRows,
  roleFamilies,
  type ThemeTokens,
} from "@/lib/sections/theme";
import { decomposePage } from "@/lib/sections/decompose";
import { ensureGoogleFont, injectCustomFont } from "@/lib/fonts";
import { backgroundOnlyCss, type ElementStyle } from "@/lib/design/element-style";
import { notify, notifyError, confirmDialog } from "@/lib/ui/dialogs";

interface CanvasProps {
  tenantId: string;
  websiteId?: string | null;
  selectedPageId: string | null;
  selectedPage?: { id: string; title: string; slug: string } | null;
  reloadKey?: number;
  themeKey?: number;
  onValidityChange?: (valid: boolean) => void;
  addSignal?: number;                 // bumped when an element is picked in the left Add panel
  addType?: SectionType | null;       // the element type to insert on addSignal
  addCols?: number;                   // column count when addType === "row"
  addSectionsSignal?: number;         // bumped when a prebuilt template is picked
  addSections?: SectionContent[] | null; // the template's section(s) to append
  onRequestAdd?: () => void;          // ask the shell to open the left Add-Elements panel
  onDirtyChange?: (dirty: boolean) => void; // pending unsaved edits (for the switch guard)
  onSaveStateChange?: (state: "saving" | "saved" | "error") => void; // live save status indicator
  saveSignal?: number;                // bumped by the toolbar Save button → flush now
  onStructureChange?: (sections: SectionContent[]) => void; // lift live structure (Layers panel)
  selectSignal?: number;              // bumped by Layers panel → select selectTarget
  selectTarget?: { index: number; path?: ElPath } | null;
  onSelectionChange?: (sel: { index: number; path?: ElPath } | null) => void; // canvas→tree sync
  onBlocksChange?: (blocks: ResolvedBlock[]) => void; // lift attached global blocks (Layers Header/Footer)
  undoSignal?: number;                // bumped by toolbar Undo
  redoSignal?: number;                // bumped by toolbar Redo
  onHistoryChange?: (canUndo: boolean, canRedo: boolean) => void; // enable/disable toolbar buttons
}

// Editor item: a section with a client-only stable id (not persisted).
interface Item {
  uid: string;
  content: SectionContent;
}

function newUid(): string {
  // crypto.randomUUID is available in the browser.
  return crypto.randomUUID();
}

export default function Canvas({
  tenantId,
  websiteId,
  selectedPageId,
  selectedPage,
  reloadKey,
  themeKey,
  onValidityChange,
  addSignal,
  addType,
  addCols,
  addSectionsSignal,
  addSections,
  onRequestAdd,
  onDirtyChange,
  onSaveStateChange,
  saveSignal,
  onStructureChange,
  selectSignal,
  selectTarget,
  onSelectionChange,
  onBlocksChange,
  undoSignal,
  redoSignal,
  onHistoryChange,
}: CanvasProps) {
  // Map section uid → its canvas DOM node (for scroll-into-view on selection).
  const sectionRefs = useRef<Map<string, HTMLElement>>(new Map());
  const supabase = createClient();
  const setDirty = (d: boolean) => onDirtyChange?.(d);

  const [items, setItems] = useState<Item[]>([]);
  const [selectedUid, setSelectedUid] = useState<string | null>(null);
  // Saved-asset tracking: signature(content) → existing saved-asset name (for "already saved").
  const [savedSigs, setSavedSigs] = useState<Map<string, string>>(new Map());
  const [saveAssetIdx, setSaveAssetIdx] = useState<number | null>(null);
  const assetSig = (content: unknown) => { try { return JSON.stringify(content); } catch { return ""; } };
  // Nested in-column selection / add-targeting (best-in-class nested editing).
  const [childSel, setChildSel] = useState<ChildSel | null>(null);
  const [colSel, setColSel] = useState<ColSel | null>(null);
  const [hoverKey, setHoverKey] = useState<string | null>(null); // innermost hovered element (single)
  const addTarget = useRef<{ rowUid: string; container: ElPath; col: number; idx: number } | null>(null);
  const [theme, setTheme] = useState<ThemeTokens>(DEFAULT_THEME);
  const [pageBg, setPageBg] = useState<ElementStyle | null>(null);
  // Baseline snapshot of each loaded GLOBAL block (header/footer) content, so we can
  // tell when a global element actually changed and only then ask for consent.
  const globalBaseline = useRef<Record<string, string>>({});
  const [device, setDevice] = useState<"desktop" | "tablet" | "mobile">("desktop");

  const DEVICE_W: Record<typeof device, string> = { desktop: "100%", tablet: "768px", mobile: "390px" };

  // Toolbar Save → write the current draft to the DB now (explicit-save model).
  useEffect(() => {
    if (saveSignal) saveNow();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saveSignal]);

  // Toolbar Undo / Redo.
  useEffect(() => { if (undoSignal) undo(); /* eslint-disable-next-line */ }, [undoSignal]);
  useEffect(() => { if (redoSignal) redo(); /* eslint-disable-next-line */ }, [redoSignal]);

  // An element was picked in the left Add panel → insert it. If an in-column
  // target is armed (the user clicked a column "+"), the element lands in that
  // specific cell; otherwise it's appended as a top-level section.
  useEffect(() => {
    if (!addSignal || !addType) return;
    const tgt = addTarget.current;
    if (tgt) {
      const c = addType === "row" ? makeRow(addCols || 1) : defaultContentFor(addType);
      addToColumn(tgt.rowUid, tgt.container, tgt.col, c, tgt.idx);
      addTarget.current = null;
      return;
    }
    addTarget.current = null;
    if (addType === "row") appendContent(makeRow(addCols || 1));
    else addSectionOfType(addType);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addSignal]);

  // Click-to-insert a prebuilt template (one or more designed sections) — appended at the
  // end of the page. (Dragging a prebuilt tile uses the text/abc-template drop path instead.)
  useEffect(() => {
    if (!addSectionsSignal || !addSections?.length) return;
    if (!selectedPageId) { notify("Select a page first."); return; }
    const newItems: Item[] = addSections.map((c) => ({ uid: newUid(), content: JSON.parse(JSON.stringify(c)) as SectionContent }));
    commit([...itemsRef.current, ...newItems]);
    setSelectedUid(newItems[0].uid);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addSectionsSignal]);

  // AI generate / rewrite modal state.
  const [aiOpen, setAiOpen] = useState(false);
  const [aiMode, setAiMode] = useState<"generate" | "rewrite">("generate");
  const [aiIndex, setAiIndex] = useState<number | null>(null);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [flashUid, setFlashUid] = useState<string | null>(null);
  // Global-element consent modal: set when a Header/Footer edit is pending approval.
  const [globalConsent, setGlobalConsent] = useState<{ changed: any[]; pages: { id: string; title: string }[] } | null>(null);

  function openGenerate() {
    setAiMode("generate");
    setAiIndex(null);
    setAiPrompt("");
    setAiOpen(true);
  }
  function openRewrite(index: number) {
    setAiMode("rewrite");
    setAiIndex(index);
    setAiPrompt("");
    setAiOpen(true);
  }

  async function submitAi() {
    if (!selectedPageId || !aiPrompt.trim()) return;
    setAiBusy(true);
    try {
      const next =
        aiMode === "rewrite" && aiIndex !== null
          ? await rewriteSectionAI(selectedPageId, tenantId, aiIndex, aiPrompt)
          : await generateSectionAI(selectedPageId, tenantId, aiPrompt);
      const newItems = decomposePage(next as SectionContent[]).map((c) => ({
        uid: newUid(),
        content: c,
      }));
      setItems(newItems);
      resetHistory();
      setDirty(false); // AI generate persists server-side
      const targetIdx =
        aiMode === "rewrite" && aiIndex !== null
          ? aiIndex
          : newItems.length - 1;
      const target = newItems[targetIdx];
      if (target) {
        setSelectedUid(target.uid);
        setFlashUid(target.uid);
        setTimeout(() => setFlashUid(null), 1500);
      }
      setAiOpen(false);
    } catch (e: any) {
      notifyError(e?.message ?? "AI generation failed.");
    } finally {
      setAiBusy(false);
    }
  }

  // Load the tenant's theme tokens for the editor preview.
  useEffect(() => {
    (async () => {
      // NOTE: a tenant can have MULTIPLE brand rows (0019 brand-per-website). maybeSingle()
      // throws on >1 row → empty theme → uploaded custom fonts never inject (headings fall
      // back to system-ui until Typography is opened). Fetch all and pick the row that
      // actually carries customFonts, else the first.
      const { data: rows } = await supabase
        .from("website_brand_settings")
        .select("primary_color, secondary_color, accent_color, font_heading, font_body, theme")
        .eq("tenant_id", tenantId);
      // Merge ALL brand rows (font fields can be split across rows) → one complete brand,
      // so the heading/body fonts + every custom font load on first paint (no Typography needed).
      const t = resolveTheme(mergeBrandRows(Array.isArray(rows) ? rows : []));
      setTheme(t);
      // Load the global role fonts + any uploaded custom fonts so the canvas renders them.
      roleFamilies(t).forEach((f) => ensureGoogleFont(f));
      (Array.isArray(t.customFonts) ? t.customFonts : []).forEach((f) => injectCustomFont(f.name, f.src));
    })();
    // themeKey (not reloadKey): refresh theme tokens on Typography/brand changes
    // WITHOUT reloading sections, so unsaved canvas edits are preserved. selectedPageId:
    // re-resolve + re-inject fonts on every page switch so a newly-opened page always
    // renders the theme fonts (previously you had to open Typography to force it).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId, reloadKey, themeKey, selectedPageId]);

  // Per-page background (live preview) — the page's own background, else the
  // site-wide default. Reloads on page switch + Background-panel saves (themeKey).
  useEffect(() => {
    if (!selectedPageId) { setPageBg(null); return; }
    let cancelled = false;
    (async () => {
      try {
        const { style } = await getPageBackground(tenantId, selectedPageId);
        if (!cancelled) setPageBg(style && typeof style === "object" ? (style as ElementStyle) : null);
      } catch { if (!cancelled) setPageBg(null); }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId, selectedPageId, reloadKey, themeKey]);

  // Explicit-save model (NO autosave). Edits update local state, mark the page
  // dirty, and push an undo snapshot. Writing to the DB happens only on Save.
  const itemsRef = useRef(items);
  itemsRef.current = items;
  // Copy/paste clipboard + a ref to the latest handlers (so the keydown listener binds once).
  const clipboardRef = useRef<{ kind: "element" | "section"; content: any } | null>(null);
  const cpRef = useRef<{ doCopy: () => void; doPaste: () => void; undo: () => void; redo: () => void }>({ doCopy: () => {}, doPaste: () => {}, undo: () => {}, redo: () => {} });
  // Global copy/paste + undo/redo keybindings. Registered ONCE, unconditionally (above
  // any early return) so hook order is stable; it dispatches through cpRef.current.
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return; // let fields use native shortcuts
      const k = e.key.toLowerCase();
      if (k === "c") cpRef.current.doCopy();
      else if (k === "v") { e.preventDefault(); cpRef.current.doPaste(); }
      else if (k === "z") { e.preventDefault(); e.shiftKey ? cpRef.current.redo() : cpRef.current.undo(); }
      else if (k === "y") { e.preventDefault(); cpRef.current.redo(); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);
  const undoStack = useRef<Item[][]>([]);
  const redoStack = useRef<Item[][]>([]);
  // History batching (Copilot): a continuous gesture like a resize drag pushes ONE
  // undo entry. beginBatch snapshots the pre-gesture state; commits during the batch
  // skip the per-step push; endBatch pushes that single snapshot.
  const batching = useRef(false);
  const batchSnapshot = useRef<Item[] | null>(null);

  const cloneItems = (arr: Item[]): Item[] => arr.map((i) => ({ uid: i.uid, content: JSON.parse(JSON.stringify(i.content)) }));
  const reportHistory = () => onHistoryChange?.(undoStack.current.length > 0, redoStack.current.length > 0);

  // Apply a new items array as a user edit (snapshot history, mark dirty, no DB write).
  function commit(next: Item[]) {
    if (batching.current) { setItems(next); setDirty(true); return; } // no per-step history during a gesture
    undoStack.current.push(cloneItems(itemsRef.current));
    if (undoStack.current.length > 100) undoStack.current.shift();
    redoStack.current = [];
    setItems(next);
    setDirty(true);
    reportHistory();
  }

  function beginBatch() { if (batching.current) return; batching.current = true; batchSnapshot.current = cloneItems(itemsRef.current); }
  function endBatch() {
    if (!batching.current) return;
    batching.current = false;
    if (batchSnapshot.current) {
      undoStack.current.push(batchSnapshot.current);
      if (undoStack.current.length > 100) undoStack.current.shift();
      redoStack.current = [];
      reportHistory();
    }
    batchSnapshot.current = null;
  }

  // Reset history baseline (initial load / AI generate — already in sync with DB).
  function resetHistory() {
    undoStack.current = [];
    redoStack.current = [];
    reportHistory();
  }

  const stripGlobal = (c: any) => { const { _global, _globalName, ...rest } = c; return rest; };

  function saveNow() {
    if (!selectedPageId) return;
    // Split out any pinned GLOBAL blocks (header/footer) edited in place: these
    // persist to the global-block store (so the edit applies on every page), not
    // into this page's draft_sections. Everything else is a normal page section.
    const all = itemsRef.current.map((i) => i.content as any);
    const sections = all.filter((c) => !c?._global);
    // Page sections always save immediately.
    onSaveStateChange?.("saving");
    saveDraft(selectedPageId, tenantId, { draft_sections: sections })
      .then(() => { setDirty(false); onSaveStateChange?.("saved"); })
      .catch(() => onSaveStateChange?.("error"));

    // A global element (Header/Footer) is shared by EVERY page. Only commit it after
    // the user CONSENTS via a modal that lists the affected pages — and only the ones
    // that actually changed since load.
    const globals = all.filter((c) => c?._global);
    const changed = globals.filter((g) => JSON.stringify(stripGlobal(g)) !== globalBaseline.current[g._global]);
    if (changed.length > 0) {
      const blockIds = changed.map((g) => g._global);
      getPagesUsingBlocks(tenantId, blockIds)
        .then((pages) => setGlobalConsent({ changed, pages }))
        .catch(() => setGlobalConsent({ changed, pages: [] }));
    }
  }

  // Commit the consented global-element change to the shared store → applies on
  // every page; updates the baseline so we don't re-prompt for the same edit.
  function applyGlobalChange() {
    const gc = globalConsent;
    if (!gc) return;
    setGlobalConsent(null);
    onSaveStateChange?.("saving");
    Promise.all(
      gc.changed.map(async (g) => {
        const clean = stripGlobal(g);
        // ONE round-trip (was update-draft + select + publish = 3) → global saves are snappy.
        await saveGlobalBlockNow(tenantId, g._global, clean, (clean as any).type);
        globalBaseline.current[g._global] = JSON.stringify(clean);
      })
    ).then(() => onSaveStateChange?.("saved")).catch(() => onSaveStateChange?.("error"));
  }

  function undo() {
    if (!undoStack.current.length) return;
    redoStack.current.push(cloneItems(itemsRef.current));
    const prev = undoStack.current.pop()!;
    setItems(prev);
    setDirty(true);
    reportHistory();
  }
  function redo() {
    if (!redoStack.current.length) return;
    undoStack.current.push(cloneItems(itemsRef.current));
    const nxt = redoStack.current.pop()!;
    setItems(nxt);
    setDirty(true);
    reportHistory();
  }

  // Load the editor's working set: draft_sections if present, else live rows.
  useEffect(() => {
    async function load() {
      if (!selectedPageId) {
        setItems([]);
        return;
      }
      // Read via the service-client server action so UNPUBLISHED drafts load
      // (the browser client is RLS-limited to published pages).
      const contents: SectionContent[] = (await getEditorSections(selectedPageId, tenantId)) as SectionContent[];
      // Auto-decompose composites (hero/features/cta) into editable primitive
      // rows on open, so every element is selectable/editable. Idempotent —
      // already-decomposed rows pass through unchanged. Persists on next save.
      const editable = decomposePage(contents);
      const pageItems = editable.map((c) => ({ uid: newUid(), content: c }));

      // Pinned global blocks (Header/Footer) are loaded as NORMAL editable items so
      // everything is editable in place — no separate "Blocks tab". Header(s) pin to
      // the top, footer(s) to the bottom; each is tagged `_global` so saveNow routes
      // its edits back to the shared global-block store (applies on every page).
      const blocks = await getPageBlocks(selectedPageId, tenantId, true);
      globalBaseline.current = Object.fromEntries(blocks.map((b) => [b.id, JSON.stringify(b.content)]));
      const tag = (b: ResolvedBlock) => ({ uid: newUid(), content: { ...(b.content as any), _global: b.id, _globalName: b.name } });
      const isFooter = (b: ResolvedBlock) => /footer/i.test(b.name);
      const headers = blocks.filter((b) => !isFooter(b)).map(tag);
      const footers = blocks.filter((b) => isFooter(b)).map(tag);

      // "Exact copy" pages are a single html/iframe snapshot that ALREADY contains the site's own
      // header & footer — don't pin the global ones on top (avoids duplicates). Architect D-081/D-083.
      const isExactSnapshot = pageItems.length === 1 && (pageItems[0]?.content as any)?.type === "html";
      setItems(isExactSnapshot ? pageItems : [...headers, ...pageItems, ...footers]);
      onBlocksChange?.([]); // header/footer now live in the items tree; no separate globals list
      setSelectedUid(null);
      setDirty(false);
      resetHistory();
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId, selectedPageId, reloadKey]);

  // Report validity for the Publish gate.
  useEffect(() => {
    if (!onValidityChange) return;
    onValidityChange(items.every((i) => sectionSchema.safeParse(i.content).success));
  }, [items, onValidityChange]);

  // Lift the live structure up so the Layers panel mirrors the canvas (incl. unsaved edits).
  useEffect(() => {
    onStructureChange?.(items.map((i) => i.content));
  }, [items, onStructureChange]);

  // Ensure any Google fonts used on the page are loaded so the canvas renders them.
  useEffect(() => {
    const seen = new Set<string>();
    const scan = (n: any) => {
      if (!n || typeof n !== "object") return;
      if (typeof n.fontFamily === "string" && n.fontFamily) seen.add(n.fontFamily);
      if (Array.isArray(n.children)) n.children.forEach((c: any) => Array.isArray(c) ? c.forEach(scan) : scan(c));
    };
    items.forEach((i) => scan(i.content));
    seen.forEach((f) => ensureGoogleFont(f));
  }, [items]);

  // Layers panel asked to select a node → select that section (and nested child),
  // then scroll the canvas to it (locked spec: highlight + scrollIntoView).
  useEffect(() => {
    if (!selectSignal || !selectTarget) return;
    const it = items[selectTarget.index];
    if (!it) return;
    setSelectedUid(it.uid);
    setColSel(null);
    if (selectTarget.path && (it.content as any).type === "row") {
      setChildSel({ rowUid: it.uid, path: selectTarget.path });
    } else {
      setChildSel(null);
    }
    const el = sectionRefs.current.get(it.uid);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectSignal]);

  // Report current selection up so the Layers tree highlights it (canvas→tree sync).
  useEffect(() => {
    if (!onSelectionChange) return;
    if (childSel) {
      const idx = items.findIndex((i) => i.uid === childSel.rowUid);
      onSelectionChange(idx >= 0 ? { index: idx, path: childSel.path } : null);
    } else if (selectedUid) {
      const idx = items.findIndex((i) => i.uid === selectedUid);
      onSelectionChange(idx >= 0 ? { index: idx } : null);
    } else {
      onSelectionChange(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedUid, childSel, items]);

  function updateSection(updated: SectionContent) {
    if (!selectedUid) return;
    const next = items.map((i) =>
      i.uid === selectedUid ? { ...i, content: updated } : i
    );
    commit(next);
  }

  function addSectionOfType(type: SectionType) {
    if (!selectedPageId) {
      notify("Select a page first.");
      return;
    }
    const item: Item = { uid: newUid(), content: defaultContentFor(type) };
    const next = [...items, item];
    commit(next);
    setSelectedUid(item.uid);
  }

  function appendContent(content: SectionContent) {
    if (!selectedPageId) return;
    const item: Item = { uid: newUid(), content };
    const next = [...items, item];
    commit(next);
    setSelectedUid(item.uid);
  }

  // ---- Nested (in-column) editing helpers ----------------------------------
  // All mutate the children[col][] of a row item by uid, immutably, then persist.
  function mutateRow(rowUid: string, fn: (row: any) => void) {
    const next = items.map((it) => {
      if (it.uid !== rowUid) return it;
      const clone = JSON.parse(JSON.stringify(it.content));
      if (!Array.isArray(clone.children)) clone.children = [];
      fn(clone);
      return { ...it, content: clone };
    });
    commit(next);
  }

  // ---- Path navigation inside a top-level row item ----------------------------
  // A path is an array of {col,idx} segments. All but the last navigate into
  // nested rows; the last addresses an element within its column.
  function containerAt(rowContent: any, container: ElPath): any | null {
    let c = rowContent;
    for (const seg of container) {
      c = c?.children?.[seg.col]?.[seg.idx];
      if (!c) return null;
    }
    return c;
  }
  function readChild(rowContent: any, path: ElPath): any | null {
    if (!path.length) return null;
    const cont = containerAt(rowContent, path.slice(0, -1));
    const last = path[path.length - 1];
    return cont?.children?.[last.col]?.[last.idx] ?? null;
  }
  // Returns the cell array + index for the element at `path` (mutating: ensures arrays).
  function cellAt(rowContent: any, path: ElPath): { cell: any[]; idx: number } | null {
    const cont = containerAt(rowContent, path.slice(0, -1));
    if (!cont) return null;
    if (!Array.isArray(cont.children)) cont.children = [];
    const last = path[path.length - 1];
    while (cont.children.length <= last.col) cont.children.push([]);
    return { cell: cont.children[last.col], idx: last.idx };
  }

  function addToColumn(rowUid: string, container: ElPath, col: number, content: SectionContent, atIdx?: number) {
    let insertedAt = 0;
    mutateRow(rowUid, (row) => {
      const cont = container.length ? containerAt(row, container) : row;
      if (!cont) return;
      if (!Array.isArray(cont.children)) cont.children = [];
      while (cont.children.length <= col) cont.children.push([]);
      const cell = cont.children[col] as SectionContent[];
      insertedAt = atIdx == null ? cell.length : Math.max(0, Math.min(atIdx, cell.length));
      cell.splice(insertedAt, 0, content);
    });
    setColSel(null);
    setChildSel({ rowUid, path: [...container, { col, idx: insertedAt }] });
  }


  function setColumnChild(rowUid: string, path: ElPath, content: SectionContent) {
    mutateRow(rowUid, (row) => {
      const loc = cellAt(row, path);
      if (loc && loc.cell[loc.idx] != null) loc.cell[loc.idx] = content;
    });
  }

  // In-place text edit (canvas contentEditable) → write the child's primary text
  // field (label for buttons, text for everything else). No-op if unchanged.
  function editChildText(rowUid: string, path: ElPath, text: string) {
    const row = itemsRef.current.find((i) => i.uid === rowUid)?.content;
    const child = row ? readChild(row, path) : null;
    if (!child) return;
    const key = child.type === "button" ? "label" : "text";
    if (child[key] === text) return;
    setColumnChild(rowUid, path, { ...child, [key]: text });
  }

  // In-place edit of bullet-list items.
  function editChildItems(rowUid: string, path: ElPath, items: { text: string }[]) {
    const row = itemsRef.current.find((i) => i.uid === rowUid)?.content;
    const child = row ? readChild(row, path) : null;
    if (!child) return;
    setColumnChild(rowUid, path, { ...child, items });
  }

  // In-place edit for a TOP-LEVEL element (heading/text/button/bullet-list added directly to
  // the page, not nested in a row) so it's editable on the canvas too — not just in columns.
  function editSectionText(uid: string, text: string) {
    const it = itemsRef.current.find((i) => i.uid === uid);
    if (!it) return;
    const c: any = it.content;
    const key = c.type === "button" ? "label" : "text";
    if (c[key] === text) return;
    commit(itemsRef.current.map((i) => (i.uid === uid ? { ...i, content: { ...c, [key]: text } } : i)));
  }
  function editSectionItems(uid: string, items: { text: string }[]) {
    const it = itemsRef.current.find((i) => i.uid === uid);
    if (!it) return;
    commit(itemsRef.current.map((i) => (i.uid === uid ? { ...i, content: { ...(i.content as any), items } } : i)));
  }

  function deleteColumnChild(rowUid: string, path: ElPath) {
    mutateRow(rowUid, (row) => {
      const loc = cellAt(row, path);
      if (loc) loc.cell.splice(loc.idx, 1);
    });
    setChildSel((c) => (c && c.rowUid === rowUid && pathsEqual(c.path, path) ? null : c));
  }

  function duplicateColumnChild(rowUid: string, path: ElPath) {
    mutateRow(rowUid, (row) => {
      const loc = cellAt(row, path);
      if (loc && loc.cell[loc.idx] != null) loc.cell.splice(loc.idx + 1, 0, JSON.parse(JSON.stringify(loc.cell[loc.idx])));
    });
  }

  // Move an element ANYWHERE in the page (not just its own column). We build a flat,
  // document-ordered list of every column-cell across all row sections (and nested
  // rows), then step the element to the previous/next slot: reorder within its cell,
  // else hop to the end/start of the adjacent cell — which may live in another column,
  // another row, or another section entirely. Columns/cells themselves never move.
  type CellRef = { uid: string; container: ElPath; col: number; cell: any[] };
  function collectCells(list: Item[]): CellRef[] {
    const out: CellRef[] = [];
    const walk = (content: any, uid: string, container: ElPath) => {
      if (!content || content.type !== "row" || !Array.isArray(content.children)) return;
      const cols = Math.max(1, Math.min(12, content.columns || content.children.length || 1));
      for (let c = 0; c < cols; c++) {
        const cell = content.children[c];
        if (!Array.isArray(cell)) continue;
        out.push({ uid, container, col: c, cell });
        cell.forEach((child: any, idx: number) => {
          if (child?.type === "row") walk(child, uid, [...container, { col: c, idx }]);
        });
      }
    };
    list.forEach((it) => walk(it.content, it.uid, []));
    return out;
  }

  function moveChild(rowUid: string, path: ElPath, dir: -1 | 1) {
    const next: Item[] = JSON.parse(JSON.stringify(itemsRef.current));
    const cells = collectCells(next);
    const last = path[path.length - 1];
    const cont = path.slice(0, -1);
    const si = cells.findIndex((r) => r.uid === rowUid && pathsEqual(r.container, cont) && r.col === last.col);
    if (si < 0) return;
    const sCell = cells[si].cell;
    const idx = last.idx;
    if (idx + dir >= 0 && idx + dir < sCell.length) {
      // Reorder within the same cell.
      const j = idx + dir;
      [sCell[idx], sCell[j]] = [sCell[j], sCell[idx]];
      commit(next);
      setChildSel({ rowUid, path: [...cont, { col: last.col, idx: j }] });
      return;
    }
    // Hop to the adjacent cell in document order — skipping any cell that lives INSIDE
    // the moved element itself (when it's a nested row), which would be invalid.
    const movedPrefix: ElPath = [...cont, { col: last.col, idx }];
    const insideMoved = (r: CellRef) =>
      r.uid === rowUid && r.container.length >= movedPrefix.length &&
      pathsEqual(r.container.slice(0, movedPrefix.length), movedPrefix);
    let ti = si + dir;
    while (ti >= 0 && ti < cells.length && insideMoved(cells[ti])) ti += dir;
    if (ti < 0 || ti >= cells.length) return; // already at the very start/end of the page
    const target = cells[ti];
    const [moved] = sCell.splice(idx, 1);
    const newIdx = dir === -1 ? target.cell.length : 0;
    target.cell.splice(newIdx, 0, moved);
    commit(next);
    setChildSel({ rowUid: target.uid, path: [...target.container, { col: target.col, idx: newIdx }] });
  }

  function resizeColumns(rowUid: string, container: ElPath, dividerIndex: number, deltaRatio: number) {
    const MIN = 0.05;
    mutateRow(rowUid, (row) => {
      const cont = container.length ? containerAt(row, container) : row;
      if (!cont) return;
      const n = Math.max(1, Math.min(12, cont.columns || 1));
      let w: number[] = Array.isArray(cont.widths) && cont.widths.length === n ? cont.widths.slice() : Array.from({ length: n }, () => 1 / n);
      const i = dividerIndex, j = dividerIndex + 1;
      if (j >= n) return;
      const a = Math.max(MIN, w[i] + deltaRatio);
      const b = Math.max(MIN, w[j] - deltaRatio);
      // keep the pair's combined width constant; clamp keeps both >= MIN
      const pair = w[i] + w[j];
      w[i] = Math.min(a, pair - MIN);
      w[j] = pair - w[i];
      const sum = w.reduce((s, x) => s + x, 0) || 1;
      cont.widths = w.map((x) => x / sum); // normalize so sum = 1
    });
  }

  // Duplicate / delete a column within a (possibly nested) row container.
  function duplicateColumn(rowUid: string, container: ElPath, col: number) {
    mutateRow(rowUid, (row) => {
      const cont = container.length ? containerAt(row, container) : row;
      if (!cont) return;
      const n = Math.max(1, Math.min(12, cont.columns || 1));
      if (n >= 6) return;
      if (!Array.isArray(cont.children)) cont.children = [];
      cont.children.splice(col + 1, 0, JSON.parse(JSON.stringify(cont.children[col] ?? [])));
      if (Array.isArray(cont.colStyles)) cont.colStyles.splice(col + 1, 0, JSON.parse(JSON.stringify(cont.colStyles[col] ?? {})));
      cont.columns = n + 1;
      cont.widths = Array.from({ length: n + 1 }, () => 1 / (n + 1));
    });
  }
  function deleteColumn(rowUid: string, container: ElPath, col: number) {
    mutateRow(rowUid, (row) => {
      const cont = container.length ? containerAt(row, container) : row;
      if (!cont) return;
      const n = Math.max(1, Math.min(12, cont.columns || 1));
      if (n <= 1) return;
      if (Array.isArray(cont.children)) cont.children.splice(col, 1);
      if (Array.isArray(cont.colStyles)) cont.colStyles.splice(col, 1);
      cont.columns = n - 1;
      cont.widths = Array.from({ length: n - 1 }, () => 1 / (n - 1));
    });
    setColSel(null);
  }

  function setColumnStyle(rowUid: string, container: ElPath, col: number, style: any) {
    mutateRow(rowUid, (row) => {
      const cont = container.length ? containerAt(row, container) : row;
      if (!cont) return;
      if (!Array.isArray(cont.colStyles)) cont.colStyles = [];
      while (cont.colStyles.length <= col) cont.colStyles.push({});
      cont.colStyles[col] = style;
    });
  }

  // Set a column's width as a percentage (works at any nesting depth). Sets the
  // chosen column's ratio and redistributes the rest proportionally so the row
  // still sums to 1 (the flex model). px widths are handled separately via the
  // column's _style.widthPx (a fixed-basis override in the renderer).
  function setColumnWidth(rowUid: string, container: ElPath, col: number, pct: number) {
    mutateRow(rowUid, (row) => {
      const cont = container.length ? containerAt(row, container) : row;
      if (!cont) return;
      const n = Math.max(1, Math.min(12, cont.columns || 1));
      let w: number[] = Array.isArray(cont.widths) && cont.widths.length === n ? cont.widths.slice() : Array.from({ length: n }, () => 1 / n);
      if (n < 2) { cont.widths = [1]; return; }
      const target = Math.max(0.05, Math.min(0.95, pct / 100));
      const othersSum = w.reduce((s, x, i) => (i === col ? s : s + x), 0);
      const remaining = 1 - target;
      cont.widths = w.map((x, i) => (i === col ? target : othersSum > 0 ? (x / othersSum) * remaining : remaining / (n - 1)));
    });
  }
  // Current width % of the selected column (for the inspector dial).
  function colWidthPct(): number {
    if (!colSel) return 0;
    const row = itemsRef.current.find((i) => i.uid === colSel.rowUid)?.content;
    const cont = row ? (colSel.container.length ? containerAt(row, colSel.container) : row) : null;
    const n = Math.max(1, Math.min(12, cont?.columns || 1));
    const w: number[] = Array.isArray(cont?.widths) && cont.widths.length === n ? cont.widths : Array.from({ length: n }, () => 1 / n);
    return Math.round((w[colSel.col] ?? 1 / n) * 100);
  }

  // ---- Unified drag-and-drop with a live black insert line --------------------
  // A drop target is an insert position, either at the top level or inside a
  // specific column. The black line renders at this boundary. (Copilot blueprint.)
  type DropTarget =
    | { scope: "top"; index: number }
    | { scope: "col"; rowUid: string; container: ElPath; col: number; index: number };
  type SrcPath =
    | { scope: "top"; uid: string }
    | { scope: "col"; rowUid: string; path: ElPath };
  const [drop, setDropState] = useState<DropTarget | null>(null);
  const dropRef = useRef<DropTarget | null>(null);
  const setDrop = (t: DropTarget | null) => { dropRef.current = t; setDropState(t); };

  // Compute above/below from cursor Y vs the element's vertical midpoint.
  function edgeIndex(e: React.DragEvent, baseIndex: number): number {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    return e.clientY < rect.top + rect.height / 2 ? baseIndex : baseIndex + 1;
  }

  // Apply a drop: payload is "abc-move:<SrcPath json>" (reorder/move existing) or
  // a new-element spec ("row:N" / a SectionType). target is the insert position.
  function applyDrop(payload: string, target: DropTarget | null) {
    setDrop(null);
    if (!selectedPageId || !payload || !target) return;

    // Saved section(s) dropped from the "Saved Assets" tab — insert the whole block at the
    // top-level drop index (saved sections are page-level, so they always land between sections).
    if (payload.startsWith("abc-template:")) {
      let secs: SectionContent[] = [];
      try { secs = JSON.parse(payload.slice("abc-template:".length)); } catch { return; }
      if (!Array.isArray(secs) || !secs.length) return;
      const next: Item[] = items.map((i) => ({ uid: i.uid, content: JSON.parse(JSON.stringify(i.content)) }));
      const at = target.scope === "top" ? target.index : next.length;
      const newItems = secs.map((c) => ({ uid: newUid(), content: JSON.parse(JSON.stringify(c)) as SectionContent }));
      next.splice(Math.max(0, Math.min(at, next.length)), 0, ...newItems);
      setSelectedUid(newItems[0].uid); setChildSel(null); setColSel(null);
      commit(next);
      return;
    }

    let movingSrc: SrcPath | null = null;
    let content: SectionContent | null = null;
    if (payload.startsWith("abc-move:")) {
      try { movingSrc = JSON.parse(payload.slice("abc-move:".length)) as SrcPath; } catch { return; }
      content = movingSrc.scope === "top"
        ? (items.find((i) => i.uid === (movingSrc as any).uid)?.content ?? null)
        : readChild(items.find((i) => i.uid === (movingSrc as any).rowUid)?.content, (movingSrc as any).path);
    } else {
      content = payload.startsWith("row:") ? makeRow(parseInt(payload.slice(4), 10) || 1) : defaultContentFor(payload as SectionType);
    }
    if (!content) return;

    // Work on a clone (content deep-cloned so nested mutations are safe).
    let next: Item[] = items.map((i) => ({ uid: i.uid, content: JSON.parse(JSON.stringify(i.content)) }));
    const insertContent: SectionContent = JSON.parse(JSON.stringify(content));

    if (target.scope === "top") {
      // remove the source (top section, or a nested element) then insert at the index
      if (movingSrc?.scope === "top") {
        next = next.filter((i) => i.uid !== movingSrc!.uid);
      } else if (movingSrc?.scope === "col") {
        const it = next.find((i) => i.uid === movingSrc!.rowUid);
        if (it) { const loc = cellAt(it.content, movingSrc.path); if (loc) loc.cell.splice(loc.idx, 1); }
      }
      let idx = target.index;
      if (movingSrc?.scope === "top") {
        const removedIdx = items.findIndex((i) => i.uid === (movingSrc as any).uid);
        if (removedIdx > -1 && removedIdx < target.index) idx -= 1;
      }
      const item: Item = { uid: newUid(), content: insertContent };
      next.splice(Math.max(0, Math.min(idx, next.length)), 0, item);
      setSelectedUid(item.uid); setChildSel(null); setColSel(null);
    } else {
      // Insert into a (possibly nested) column. Source removal + index shift apply
      // only when moving within the SAME top-level row item.
      const it = next.find((i) => i.uid === target.rowUid);
      if (!it) return;
      const rc: any = it.content;
      let tIndex = target.index;

      if (movingSrc?.scope === "col" && movingSrc.rowUid === target.rowUid) {
        const srcContainer = movingSrc.path.slice(0, -1);
        const srcLast = movingSrc.path[movingSrc.path.length - 1];
        const srcCont = srcContainer.length ? containerAt(rc, srcContainer) : rc;
        if (srcCont?.children?.[srcLast.col]) {
          srcCont.children[srcLast.col].splice(srcLast.idx, 1);
          if (pathsEqual(srcContainer, target.container) && srcLast.col === target.col && srcLast.idx < tIndex) tIndex -= 1;
        }
      } else if (movingSrc?.scope === "top") {
        next = next.filter((i) => i.uid !== movingSrc!.uid);
      }

      const tgtCont = target.container.length ? containerAt(it.content, target.container) : it.content;
      if (tgtCont) {
        if (!Array.isArray(tgtCont.children)) tgtCont.children = [];
        while (tgtCont.children.length <= target.col) tgtCont.children.push([]);
        const cell = tgtCont.children[target.col];
        const idx = Math.max(0, Math.min(tIndex, cell.length));
        cell.splice(idx, 0, insertContent);
        setSelectedUid(it.uid); setColSel(null); setChildSel({ rowUid: it.uid, path: [...target.container, { col: target.col, idx }] });
      }
    }

    commit(next);
  }

  // Extract the drag payload from an event (move path or new-element spec).
  // Move data lives under text/abc-move as raw JSON; re-add the "abc-move:" prefix
  // that applyDrop discriminates on. New elements come as text/abc-element specs.
  function dragPayload(e: React.DragEvent): string | null {
    const mv = e.dataTransfer.getData("text/abc-move");
    if (mv) return "abc-move:" + mv;
    // Saved section(s) dragged from the Add panel's "Saved Assets" tab (JSON array).
    const tpl = e.dataTransfer.getData("text/abc-template");
    if (tpl) return "abc-template:" + tpl;
    return e.dataTransfer.getData("text/abc-element") || null;
  }

  // Insert a new element at a specific index (drag-drop from the Add panel).
  // `spec` is a SectionType, or "row:N" to insert an N-column row.
  function insertAt(spec: string, index: number) {
    if (!selectedPageId) return;
    const content: SectionContent = spec.startsWith("row:")
      ? makeRow(parseInt(spec.slice(4), 10) || 1)
      : defaultContentFor(spec as SectionType);
    const item: Item = { uid: newUid(), content };
    const next = [...items];
    next.splice(Math.max(0, Math.min(index, items.length)), 0, item);
    commit(next);
    setSelectedUid(item.uid);
  }
  function duplicateSection(index: number) {
    const clone: Item = {
      uid: newUid(),
      content: JSON.parse(JSON.stringify(items[index].content)),
    };
    const next = [...items];
    next.splice(index + 1, 0, clone);
    commit(next);
    setSelectedUid(clone.uid);
  }

  function moveSection(index: number, dir: -1 | 1) {
    const j = index + dir;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[index], next[j]] = [next[j], next[index]];
    commit(next);
  }

  // Save a section as a reusable Saved Asset — opens the polished modal (no native prompt).
  function saveAsAsset(index: number) { setSaveAssetIdx(index); }

  // Load existing saved-asset signatures so we can flag already-saved elements + warn on re-save.
  async function reloadSavedSigs() {
    try {
      const tpls = await listTemplates(tenantId);
      const m = new Map<string, string>();
      for (const t of tpls) for (const sec of (Array.isArray(t.sections) ? t.sections : [])) m.set(assetSig(sec), t.name);
      setSavedSigs(m);
    } catch { /* ignore */ }
  }
  useEffect(() => { reloadSavedSigs(); /* eslint-disable-next-line */ }, [tenantId]);

  // Persist the chosen section. mode="template" → reusable copy; mode="global" → convert
  // this section into a website-level Global Section that syncs across the site.
  async function doSaveAsset(name: string, description: string, mode: "template" | "global") {
    if (saveAssetIdx == null) return;
    const idx = saveAssetIdx;
    const raw = items[idx].content as any;
    if (mode === "template") {
      await addTemplate(tenantId, name, description || null, [raw]);
      setSavedSigs((prev) => new Map(prev).set(assetSig(raw), name));
      // Tell the Saved Assets panel to refresh so the new section appears immediately.
      try { window.dispatchEvent(new CustomEvent("abc:asset-saved")); } catch { /* SSR-safe */ }
      return;
    }
    // Global Section. If it's ALREADY a global instance (e.g. Header/Footer), it already
    // syncs — no-op so the dialog confirms cleanly without creating a duplicate.
    if (raw._global) return;
    if (!selectedPageId) throw new Error("Select a page first.");
    // Create the website-level block, ATTACH it to this page (website_page_block_refs), then
    // convert the section into a synced reference. saveNow routes _global items to the block
    // store (not draft_sections), so we persist the page draft immediately here too.
    const clean = stripGlobal(raw);
    const block = await createGlobalBlock(tenantId, name, clean.type, clean, websiteId);
    await attachBlockToPage(selectedPageId, tenantId, block.id);
    globalBaseline.current[block.id] = JSON.stringify(clean);
    const ref = { ...clean, _global: block.id, _globalName: name } as SectionContent;
    const next = items.map((it, i) => (i === idx ? { ...it, content: ref } : it));
    setItems(next);
    itemsRef.current = next;
    // Persist the page draft now (the block ref + remaining non-global sections).
    await saveDraft(selectedPageId, tenantId, { draft_sections: next.map((it) => it.content).filter((c: any) => !c?._global) });
    setDirty(false);
    try { window.dispatchEvent(new CustomEvent("abc:asset-saved")); } catch { /* SSR-safe */ }
  }

  async function deleteSection(index: number) {
    const removed = items[index];
    const gid = (removed?.content as any)?._global as string | undefined;
    const msg = gid
      ? "Remove this header/footer from this page? (It stays available in Saved Assets and on other pages.)"
      : "Delete this section?";
    if (!(await confirmDialog(msg, { danger: true, confirmText: "Delete" }))) return;
    const next = items.filter((_, i) => i !== index);
    commit(next);
    if (removed.uid === selectedUid) setSelectedUid(null);
    // A pinned GLOBAL block (Header/Footer) isn't in draft_sections — it's attached via a
    // page→block ref. Detach it so it doesn't reload on the next visit.
    if (gid && selectedPageId) {
      try { await detachBlockFromPage(selectedPageId, tenantId, gid); } catch { /* best-effort */ }
    }
  }

  // Top-level section drag: mark the source path; dragover sets the black-line
  // target (above/below by cursor Y); drop applies the move/insert.
  function handleDragStart(e: React.DragEvent, index: number) {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/abc-move", JSON.stringify({ scope: "top", uid: items[index].uid } as SrcPath));
  }
  function handleSectionDragOver(e: React.DragEvent, index: number) {
    if (!(e.dataTransfer.types.includes("text/abc-move") || e.dataTransfer.types.includes("text/abc-element") || e.dataTransfer.types.includes("text/abc-template"))) return;
    e.preventDefault();
    setDrop({ scope: "top", index: edgeIndex(e, index) });
  }
  function handleSectionDrop(e: React.DragEvent) {
    e.preventDefault();
    applyDrop(dragPayload(e) ?? "", dropRef.current);
  }

  // Empty state — no page selected
  if (!selectedPageId) {
    return (
      <div className="text-gray-500 p-8">Select a page to begin editing.</div>
    );
  }

  // Drop a palette element onto the empty-page area.
  function handleElementDrop(e: React.DragEvent, index: number) {
    const t = e.dataTransfer.getData("text/abc-element");
    if (t && (t.startsWith("row:") || sectionTypes.includes(t as SectionType))) {
      e.preventDefault();
      insertAt(t, index);
    }
  }
  // A gap between sections: shows the BLACK insert line while dragging, else a "+".
  function dropZone(index: number) {
    const active = drop?.scope === "top" && drop.index === index;
    return (
      <div
        onDragOver={(e) => { if (e.dataTransfer.types.includes("text/abc-move") || e.dataTransfer.types.includes("text/abc-element") || e.dataTransfer.types.includes("text/abc-template")) { e.preventDefault(); setDrop({ scope: "top", index }); } }}
        onDrop={handleSectionDrop}
        className="group/dz relative h-3"
      >
        {active ? (
          <div className="absolute inset-x-0 top-1/2 h-0.5 -translate-y-1/2 rounded bg-black" />
        ) : (
          <button onClick={() => onRequestAdd?.()} title="Add element here"
            className="absolute left-1/2 top-1/2 hidden h-6 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-[#1e3a8a] text-white shadow group-hover/dz:flex">+</button>
        )}
      </div>
    );
  }

  // Empty state — page has no sections
  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center"
        onDragOver={(e) => { if (e.dataTransfer.types.includes("text/abc-element") || e.dataTransfer.types.includes("text/abc-template")) e.preventDefault(); }}
        onDrop={(e) => { if (e.dataTransfer.types.includes("text/abc-template")) { e.preventDefault(); applyDrop(dragPayload(e) ?? "", { scope: "top", index: 0 }); } else handleElementDrop(e, 0); }}>
        <p className="text-sm text-slate-500">This page has no elements yet.</p>
        <button onClick={() => onRequestAdd?.()} className="mt-4 rounded-lg bg-[#1e3a8a] px-4 py-2 text-white hover:bg-[#1e3a8a]/90">＋ Add your first element</button>
        <p className="mt-2 text-xs text-slate-400">…or drag one in from the Add Elements panel.</p>
      </div>
    );
  }

  const selectedIndex = items.findIndex((i) => i.uid === selectedUid);
  const selectedSection = selectedIndex >= 0 ? items[selectedIndex].content : null;

  // Resolve the currently-selected nested node (child element or column) by path.
  const childContent: SectionContent | null = childSel
    ? readChild(items.find((i) => i.uid === childSel.rowUid)?.content, childSel.path)
    : null;
  const colStyle: any | null = colSel
    ? (() => {
        const rc = items.find((i) => i.uid === colSel.rowUid)?.content;
        const cont = colSel.container.length ? containerAt(rc, colSel.container) : rc;
        return (cont as any)?.colStyles?.[colSel.col] ?? {};
      })()
    : null;
  const inspectorOpen = !!(childContent || colSel || selectedSection);

  // ---- Copy / paste (Ctrl/Cmd+C / +V) -------------------------------------
  // Copies the selected element or section to an in-editor clipboard; pastes a
  // deep clone: an element into the selected column (after the selected child, or
  // the column end), a section right after the selected one. Ignored while typing
  // in a field so native copy/paste still works.
  function doCopy() {
    if (childContent) clipboardRef.current = { kind: "element", content: JSON.parse(JSON.stringify(childContent)) };
    else if (selectedSection) clipboardRef.current = { kind: "section", content: JSON.parse(JSON.stringify(selectedSection)) };
  }
  function doPaste() {
    const cb = clipboardRef.current;
    if (!cb) return;
    const content = JSON.parse(JSON.stringify(cb.content));
    if (cb.kind === "element") {
      if (childSel) {
        const last = childSel.path[childSel.path.length - 1];
        addToColumn(childSel.rowUid, childSel.path.slice(0, -1), last.col, content, last.idx + 1);
      } else if (colSel) {
        addToColumn(colSel.rowUid, colSel.container, colSel.col, content);
      }
    } else {
      const item = { uid: newUid(), content };
      const next = [...itemsRef.current];
      next.splice(selectedIndex >= 0 ? selectedIndex + 1 : next.length, 0, item);
      commit(next);
      setSelectedUid(item.uid); setChildSel(null); setColSel(null);
    }
  }
  // Keep the latest copy/paste/undo/redo handlers on the ref (plain assignment — not a
  // hook — so it's safe after the early returns below). The keydown LISTENER itself is
  // registered up top (with the other effects) so hook order never changes.
  cpRef.current = { doCopy, doPaste, undo, redo };

  return (
    <div className="p-4">
      <SaveAssetModal
        open={saveAssetIdx != null}
        defaultName={saveAssetIdx != null ? (sectionLabels[(items[saveAssetIdx]?.content as any)?.type as SectionType] ?? "Saved element") : ""}
        alreadySavedAs={saveAssetIdx != null ? (savedSigs.get(assetSig(items[saveAssetIdx]?.content)) ?? null) : null}
        isAlreadyGlobal={saveAssetIdx != null && !!(items[saveAssetIdx]?.content as any)?._global}
        onSave={doSaveAsset}
        onClose={() => setSaveAssetIdx(null)}
      />
      <div className="sticky top-0 z-30 mb-4 flex items-center justify-between border-b border-slate-200/70 bg-white/90 py-2 backdrop-blur supports-[backdrop-filter]:bg-white/70">
        <h2 className="text-xl font-semibold">
          {selectedPage?.title || "No page selected"}
        </h2>
        <div className="flex items-center gap-2">
          {/* responsive device preview — stays pinned to the top of the canvas while scrolling */}
          <div className="flex overflow-hidden rounded-lg border border-gray-300 text-xs">
            {(["desktop", "tablet", "mobile"] as const).map((d) => {
              // Distinct line icons: wide monitor + stand / portrait tablet / narrow phone.
              const icon = d === "desktop"
                ? <><rect x="2" y="3" width="20" height="13" rx="2" /><path d="M8 21h8M12 16v5" /></>
                : d === "tablet"
                ? <><rect x="5" y="2" width="14" height="20" rx="2" /><path d="M11 18h2" /></>
                : <><rect x="7" y="2" width="10" height="20" rx="2" /><path d="M11 18h2" /></>;
              return (
                <button key={d} onClick={() => setDevice(d)}
                  className={`flex items-center justify-center px-2.5 py-1.5 ${device === d ? "bg-gray-800 text-white" : "bg-white text-gray-600 hover:bg-gray-100"}`}
                  title={d}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">{icon}</svg>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex gap-4">
        <div className="min-w-0 flex-1">
          <div className="mb-4 flex items-center gap-2">
            <button
              onClick={() => onRequestAdd?.()}
              className="rounded-lg bg-[#1e3a8a] px-3 py-2 text-sm font-medium text-white hover:bg-[#1e3a8a]/90"
            >
              ＋ Add Elements
            </button>
            <button
              onClick={openGenerate}
              className="rounded-lg bg-gradient-to-r from-[#7c3aed] to-[#2563eb] px-3 py-2 text-sm font-medium text-white"
            >
              ✨ AI Generate
            </button>
          </div>

          {/* Live page-background preview (inline image/colour/gradient behind sections;
              blur renders on the Preview/public layered path). */}
          <div className="abc-canvas-fonts mx-auto transition-all"
            style={{ maxWidth: DEVICE_W[device], ...(pageBg ? backgroundOnlyCss(pageBg) : {}), fontFamily: theme?.fonts?.body ? `${theme.fonts.body}, system-ui, sans-serif` : undefined }}
            onDragEnd={() => setDrop(null)}>
          {/* Base theme fonts (WYSIWYG parity with the public site): body font on the
              container + heading font for h1–h6. :where() = 0 specificity, so explicit
              per-element / role fonts always win. This is why pages no longer need
              Typography opened to "assume the fonts". */}
          <style dangerouslySetInnerHTML={{ __html:
            `.abc-canvas-fonts :where(h1,h2,h3,h4,h5,h6){font-family:${theme?.fonts?.heading ? `${theme.fonts.heading}, system-ui, sans-serif` : "inherit"};}` }} />
          {dropZone(0)}
          {items.map((item, index) => (
            <div key={item.uid}>
              <div
                ref={(el) => { if (el) sectionRefs.current.set(item.uid, el); else sectionRefs.current.delete(item.uid); }}
                data-abc-selected={selectedUid === item.uid && !childSel && !colSel ? "1" : undefined}
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleSectionDragOver(e, index)}
                onDrop={handleSectionDrop}
                onClick={() => { setSelectedUid(item.uid); setChildSel(null); setColSel(null); }}
                className={`group/sec relative rounded-lg border p-4 transition cursor-pointer hover:border-[#1e3a8a]/40 ${
                  selectedUid === item.uid ? "border-[#1e3a8a] ring-1 ring-[#1e3a8a]/30" : "border-slate-200"
                } ${flashUid === item.uid ? "ring-2 ring-amber-400" : ""}`}
              >
                {/* per-section toolbar (move / save asset / duplicate / delete) */}
                <div className="absolute -top-3 right-3 z-10 hidden items-center gap-1 rounded-lg border border-slate-200 bg-white px-1.5 py-1 shadow-sm group-hover/sec:flex">
                  <span className="px-1 text-[10px] font-medium uppercase tracking-wide text-slate-400">{sectionLabels[item.content.type as SectionType] ?? "Element"}</span>
                  <button onClick={(e) => { e.stopPropagation(); moveSection(index, -1); }} title="Move up" className="rounded p-1 text-slate-500 hover:bg-slate-100">↑</button>
                  <button onClick={(e) => { e.stopPropagation(); moveSection(index, 1); }} title="Move down" className="rounded p-1 text-slate-500 hover:bg-slate-100">↓</button>
                  <button onClick={(e) => { e.stopPropagation(); openRewrite(index); }} title="Rewrite with AI" className="rounded p-1 text-[#7c3aed] hover:bg-slate-100">✦</button>
                  {(() => { const saved = savedSigs.has(assetSig(item.content)); return (
                    <button onClick={(e) => { e.stopPropagation(); saveAsAsset(index); }}
                      title={saved ? `Already saved as “${savedSigs.get(assetSig(item.content))}” — click to save another copy` : "Save as asset"}
                      className={`rounded p-1 hover:bg-slate-100 ${saved ? "text-amber-500" : "text-slate-500"}`}>{saved ? "★" : "☆"}</button>
                  ); })()}
                  <button onClick={(e) => { e.stopPropagation(); duplicateSection(index); }} title="Duplicate" className="rounded p-1 text-slate-500 hover:bg-slate-100">⧉</button>
                  <button onClick={(e) => { e.stopPropagation(); deleteSection(index); }} title="Delete" className="rounded p-1 text-red-500 hover:bg-red-50">🗑</button>
                </div>
                {item.content.type === "row" && (() => {
                  // HEADER rows (contain a menu) preview as the responsive bar when on a
                  // non-desktop device, so the logo + ☰ + in-menu CTA layout is visible.
                  const cols: any[] = Array.isArray((item.content as any).children) ? (item.content as any).children : [];
                  const hasMenu = cols.some((col) => Array.isArray(col) && col.some((ch: any) => ch?.type === "menu"));
                  return device !== "desktop" && hasMenu;
                })() ? (
                  <SectionView content={item.content} theme={theme} bp={device} />
                ) : item.content.type === "row" ? (
                  <RowEditor
                    rowUid={item.uid}
                    content={item.content}
                    theme={theme}
                    bp={device}
                    childSel={childSel}
                    colSel={colSel}
                    drop={drop}
                    onSelectChild={(path) => { setSelectedUid(item.uid); setColSel(null); setChildSel({ rowUid: item.uid, path }); }}
                    onSelectColumn={(container, col) => { setSelectedUid(item.uid); setChildSel(null); setColSel({ rowUid: item.uid, container, col }); }}
                    onAddToColumn={(container, col, atIdx) => { addTarget.current = { rowUid: item.uid, container, col, idx: atIdx }; onRequestAdd?.(); }}
                    onDuplicateColumn={(container, col) => duplicateColumn(item.uid, container, col)}
                    onDeleteColumn={(container, col) => deleteColumn(item.uid, container, col)}
                    onDeleteChild={(path) => deleteColumnChild(item.uid, path)}
                    onDuplicateChild={(path) => duplicateColumnChild(item.uid, path)}
                    onMoveChild={(path, dir) => moveChild(item.uid, path, dir)}
                    onEditChildText={(path, text) => editChildText(item.uid, path, text)}
                    onEditChildItems={(path, items) => editChildItems(item.uid, path, items)}
                    onResize={(container, divIdx, delta) => resizeColumns(item.uid, container, divIdx, delta)}
                    onResizeStart={beginBatch}
                    onResizeEnd={endBatch}
                    onChildDragStart={(path, e) => { e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/abc-move", JSON.stringify({ scope: "col", rowUid: item.uid, path } as SrcPath)); }}
                    onChildDragOver={(container, col, idx, e) => { if (!(e.dataTransfer.types.includes("text/abc-move") || e.dataTransfer.types.includes("text/abc-element"))) return; e.preventDefault(); e.stopPropagation(); setDrop({ scope: "col", rowUid: item.uid, container, col, index: edgeIndex(e, idx) }); }}
                    onColDragOver={(container, col, count, e) => { if (!(e.dataTransfer.types.includes("text/abc-move") || e.dataTransfer.types.includes("text/abc-element"))) return; e.preventDefault(); e.stopPropagation(); setDrop({ scope: "col", rowUid: item.uid, container, col, index: count }); }}
                    onCellDrop={(e) => { e.preventDefault(); applyDrop(dragPayload(e) ?? "", dropRef.current); }}
                    hoverKey={hoverKey}
                    onHover={setHoverKey}
                  />
                ) : (
                  <SectionView content={item.content} theme={theme} bp={device}
                    onEditText={selectedUid === item.uid ? (t) => editSectionText(item.uid, t) : undefined}
                    onEditItems={selectedUid === item.uid ? (its) => editSectionItems(item.uid, its) : undefined} />
                )}
              </div>
              {dropZone(index + 1)}
            </div>
          ))}

          </div>
        </div>

        {/* Right column = per-node inspector. Shows ONLY the selected node's own
            properties (never mixed): a nested child element, a column, or the
            top-level section/row — exactly one at a time (best-in-class). */}
        {inspectorOpen && (
          <div className="editor-compact sticky top-3 flex max-h-[calc(100vh-5rem)] w-80 shrink-0 flex-col self-start overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2">
              <span className="text-sm font-semibold text-slate-700">
                {childContent
                  ? `${(childContent as any)._name || sectionLabels[(childContent as any).type as SectionType] || "Element"} · in column`
                  : colSel
                  ? `Column ${colSel.col + 1}`
                  : (selectedSection as any)?._name || sectionLabels[(selectedSection as any)?.type as SectionType] || "Element"}
              </span>
              <button onClick={() => { setSelectedUid(null); setChildSel(null); setColSel(null); }} className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700" title="Close">✕</button>
            </div>

            {/* Node action bar — full parity from the right panel: every selected node
                (element, column, or section) can be moved, duplicated and deleted here,
                not only via the canvas hover toolbar. */}
            {(() => {
              const Btn = ({ onClick, title, disabled, danger, children }: any) => (
                <button type="button" disabled={disabled} title={title} onClick={onClick}
                  className={`rounded p-1 text-xs ${disabled ? "opacity-30" : danger ? "text-red-500 hover:bg-red-50" : "text-slate-500 hover:bg-slate-100"}`}>
                  {children}
                </button>
              );
              let actions: any = null;
              if (childSel) {
                actions = (<>
                  <Btn title="Move up" onClick={() => moveChild(childSel.rowUid, childSel.path, -1)}>↑</Btn>
                  <Btn title="Move down" onClick={() => moveChild(childSel.rowUid, childSel.path, 1)}>↓</Btn>
                  <Btn title="Duplicate" onClick={() => duplicateColumnChild(childSel.rowUid, childSel.path)}>⧉</Btn>
                  <Btn title="Delete" danger onClick={() => { deleteColumnChild(childSel.rowUid, childSel.path); setChildSel(null); }}>🗑</Btn>
                </>);
              } else if (colSel) {
                actions = (<>
                  <Btn title="Duplicate column" onClick={() => duplicateColumn(colSel.rowUid, colSel.container, colSel.col)}>⧉</Btn>
                  <Btn title="Delete column" danger onClick={() => { deleteColumn(colSel.rowUid, colSel.container, colSel.col); setColSel(null); }}>🗑</Btn>
                </>);
              } else if (selectedIndex >= 0) {
                actions = (<>
                  <Btn title="Move up" disabled={selectedIndex === 0} onClick={() => moveSection(selectedIndex, -1)}>↑</Btn>
                  <Btn title="Move down" disabled={selectedIndex === items.length - 1} onClick={() => moveSection(selectedIndex, 1)}>↓</Btn>
                  <Btn title="Duplicate" onClick={() => duplicateSection(selectedIndex)}>⧉</Btn>
                  <Btn title="Delete" danger onClick={() => { deleteSection(selectedIndex); setSelectedUid(null); }}>🗑</Btn>
                </>);
              }
              return actions ? (
                <div className="flex items-center gap-1 border-b border-slate-100 px-2 py-1.5">
                  <span className="mr-auto text-[10px] uppercase tracking-wide text-slate-400">Actions</span>
                  {actions}
                </div>
              ) : null;
            })()}
            <div className="min-h-0 flex-1 overflow-y-auto p-3">
              {childContent && childSel ? (
                <SectionEditor
                  key={`${childSel.rowUid}-${childSel.path.map((s) => `${s.col}.${s.idx}`).join("-")}`}
                  section={childContent}
                  onUpdate={(updated) => setColumnChild(childSel.rowUid, childSel.path, updated)}
                  tenantId={tenantId}
                  customFonts={(Array.isArray(theme.customFonts) ? theme.customFonts : []).map((f) => f.name)}
                  breakpoint={device}
                />
              ) : colSel ? (
                <ColumnInspector
                  key={`${colSel.rowUid}-${colSel.container.map((s) => `${s.col}.${s.idx}`).join("-")}-${colSel.col}`}
                  style={colStyle ?? {}}
                  onChange={(s) => setColumnStyle(colSel.rowUid, colSel.container, colSel.col, s)}
                  widthPct={colWidthPct()}
                  onWidthPct={(pct) => setColumnWidth(colSel.rowUid, colSel.container, colSel.col, pct)}
                  tenantId={tenantId}
                />
              ) : selectedSection ? (
                <SectionEditor
                  key={selectedUid ?? "none"}
                  section={selectedSection}
                  onUpdate={updateSection}
                  tenantId={tenantId}
                  customFonts={(Array.isArray(theme.customFonts) ? theme.customFonts : []).map((f) => f.name)}
                  breakpoint={device}
                />
              ) : null}
            </div>
          </div>
        )}
      </div>

      {/* Floating text-format popup — anchored to the selected text element, floats off it. */}
      {(() => {
        const sel: any = childContent ?? selectedSection;
        const TEXT_TYPES = ["heading", "subheading", "text"];
        if (!sel || !TEXT_TYPES.includes(sel.type)) return null;
        const patch = (partial: Record<string, unknown>) => {
          if (childContent && childSel) setColumnChild(childSel.rowUid, childSel.path, { ...childContent, ...partial });
          else if (selectedSection && selectedUid) updateSection({ ...(selectedSection as any), ...partial });
        };
        const selKey = childSel ? `${childSel.rowUid}:${childSel.path.map((s) => `${s.col}.${s.idx}`).join("-")}` : (selectedUid ?? "");
        return (
          <TextFormatPopup
            key={selKey}
            content={sel}
            onPatch={patch}
            customFonts={(Array.isArray(theme.customFonts) ? theme.customFonts : []).map((f) => f.name)}
            tenantId={tenantId}
            selKey={selKey}
          />
        );
      })()}

      {globalConsent && (() => {
        const names = Array.from(new Set(globalConsent.changed.map((g) => g._globalName || "Global element"))).join(" & ");
        const pages = globalConsent.pages;
        const shown = pages.slice(0, 6);
        const more = pages.length - shown.length;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setGlobalConsent(null)}>
            <div className="editor-compact w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
              <div className="mb-1 flex items-center gap-2">
                <span className="grid h-7 w-7 place-items-center rounded-full bg-amber-100 text-amber-600">⚠</span>
                <h3 className="text-base font-semibold text-slate-800">Update Global {names}?</h3>
              </div>
              <p className="mt-2 text-sm text-slate-600">
                This is a <strong>global element</strong>. Saving it will update <strong>{names}</strong> on{" "}
                <strong>{pages.length === 1 ? "1 page" : `${pages.length} pages`}</strong> of your website — every copy will change to match.
              </p>
              {shown.length > 0 && (
                <div className="mt-3 max-h-40 overflow-y-auto rounded-lg border border-slate-100 bg-slate-50 p-2">
                  <ul className="space-y-0.5 text-sm text-slate-700">
                    {shown.map((p) => (
                      <li key={p.id} className="flex items-center gap-2 px-1 py-0.5">
                        <span className="text-slate-400">▤</span><span className="truncate">{p.title}</span>
                      </li>
                    ))}
                  </ul>
                  {more > 0 && <div className="px-1 pt-1 text-xs text-slate-400">+ {more} more {more === 1 ? "page" : "pages"}</div>}
                </div>
              )}
              <div className="mt-5 flex justify-end gap-2">
                <button onClick={() => setGlobalConsent(null)} className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">Cancel</button>
                <button onClick={applyGlobalChange} className="rounded-lg bg-[#1e3a8a] px-3 py-2 text-sm font-semibold text-white hover:bg-[#1e3a8a]/90">Apply to all pages</button>
              </div>
            </div>
          </div>
        );
      })()}

      {aiOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => !aiBusy && setAiOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-lg bg-white p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-2 text-lg font-semibold">
              {aiMode === "rewrite" ? "Rewrite section with AI" : "AI Generate Section"}
            </h3>
            <textarea
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              rows={4}
              placeholder={
                aiMode === "rewrite"
                  ? "How should this section change?"
                  : "Describe the section you want (e.g. 'a hero for a luxury real estate brand')."
              }
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
            />
            <div className="mt-3 flex justify-end gap-2">
              <button
                onClick={() => setAiOpen(false)}
                disabled={aiBusy}
                className="rounded px-3 py-2 text-sm text-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={submitAi}
                disabled={aiBusy || !aiPrompt.trim()}
                className="rounded bg-purple-600 px-3 py-2 text-sm text-white disabled:opacity-50"
              >
                {aiBusy ? "Generating…" : "Generate"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
