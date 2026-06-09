"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import PageList from "./PageList";
import Canvas from "./Canvas";
import BrandPanel from "./BrandPanel";
import WebsiteGeneratorPanel from "./WebsiteGeneratorPanel";
import NavigationPanel from "./NavigationPanel";
import SectionTemplatesPanel from "./SectionTemplatesPanel";
import SeoPanel from "./SeoPanel";
import CustomCssPanel from "./CustomCssPanel";
import SettingsPanel from "./SettingsPanel";
import MediaPanel from "./MediaPanel";
import GlobalBlocksPanel from "./GlobalBlocksPanel";
import LayersPanel, { type LayerSelection } from "./LayersPanel";
import {
  AddElementsPanel, TrackingCodePanel, TypographyPanel,
  PopupSettingsPanel, PreviewCustomCodePanel, CookieConsentPanel,
} from "./ToolbarPanels";
import PageBackgroundPanel from "./PageBackgroundPanel";
import type { SectionType, SectionContent } from "@/lib/sections/schemas";
import { publishPage, unpublishPage, getPageForEditor, type ResolvedBlock } from "../actions";
import type { GlobalBlockInput } from "@/lib/sections/layers";
import { notifyError, confirmDialog } from "@/lib/ui/dialogs";

interface EditorPageProps {
  tenantId: string;
  initialPageId?: string;
}

type SelectedPage = { id: string; title: string; slug: string; is_public?: boolean } | null;
type Mode =
  | "add" | "layers" | "editor" | "tracking" | "code" | "typography"
  | "background" | "popup" | "seo" | "previewcode" | "cookie" | "generate"
  // hidden modes still reachable programmatically (e.g. editing a global block)
  | "blocks" | "templates" | "navigation" | "settings" | "media" | "design";

// Left-panel toolbar (revised IA). "Add Elements" is the leading (+) button; the
// rest follow in Ali's final order.
const TOOLS: { mode: Mode; label: string; icon: string }[] = [
  // Generate Website (AI) and Site Settings live on the Website page/settings — not in the
  // per-page editor toolbar.
  { mode: "layers", label: "Layers", icon: "M12 2l9 5-9 5-9-5zM3 12l9 5 9-5M3 17l9 5 9-5" },
  { mode: "editor", label: "Pages", icon: "M4 4h16v4H4zM4 12h16v8H4z" },
  { mode: "code", label: "Custom CSS", icon: "M8 6l-5 6 5 6M16 6l5 6-5 6" },
  { mode: "typography", label: "Typography", icon: "M4 6h16M9 6v12M6 18h6" },
  { mode: "background", label: "Background", icon: "M3 5h18v14H3zM3 15l5-5 4 4 3-3 6 6M8 9a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z" },
  { mode: "popup", label: "Popup Settings", icon: "M4 4h16v12H4zM8 20h8M12 16v4" },
  { mode: "seo", label: "SEO & GEO", icon: "M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM21 21l-4.3-4.3" },
  { mode: "previewcode", label: "Preview Custom Code", icon: "M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z" },
  { mode: "cookie", label: "Cookie Consent", icon: "M12 2a10 10 0 1 0 10 10 4 4 0 0 1-4-4 4 4 0 0 1-4-4 10 10 0 0 0-2-2zM8 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2zM13 16a1 1 0 1 0 0-2 1 1 0 0 0 0 2z" },
];

const PANEL_TITLE: Record<Mode, string> = {
  add: "Add Elements", generate: "Generate Website", layers: "Layers", editor: "Pages", tracking: "Site Settings",
  code: "Custom CSS", typography: "Typography", background: "Background",
  popup: "Popup Settings", seo: "SEO & GEO", previewcode: "Preview Custom Code",
  cookie: "Cookie Consent",
  blocks: "Global Blocks", templates: "Templates", navigation: "Navigation",
  settings: "Page Settings", media: "Media Library", design: "Design / Brand",
};

export default function EditorPage({ tenantId, initialPageId }: EditorPageProps) {
  const [mode, setMode] = useState<Mode>("add");
  const [leftOpen, setLeftOpen] = useState(false);  // both columns collapsed on open
  const [addSignal, setAddSignal] = useState(0);    // bump → Canvas inserts addType
  const [addType, setAddType] = useState<SectionType | null>(null);
  const [addCols, setAddCols] = useState<number | undefined>(undefined);
  const [addSectionsSignal, setAddSectionsSignal] = useState(0); // bump → Canvas appends a prebuilt template
  const [addSections, setAddSections] = useState<SectionContent[] | null>(null);
  const [dirty, setDirty] = useState(false);        // current page has unsaved edits
  const [saveSignal, setSaveSignal] = useState(0);  // bump → Canvas flushes immediately
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  // Show "Saved ✓" briefly, then fade back so it doesn't linger.
  function handleSaveState(s: "saving" | "saved" | "error") {
    setSaveState(s);
    if (s === "saved") window.setTimeout(() => setSaveState((cur) => (cur === "saved" ? "idle" : cur)), 2000);
  }
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [selectedPage, setSelectedPage] = useState<SelectedPage>(null);
  // The website this page belongs to (Option A): brand/typography/background/settings
  // writes are scoped to it so they don't bleed across the tenant's other sites.
  const [websiteId, setWebsiteId] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  // Theme-only refresh (Typography/brand). Bumping this re-reads the theme tokens
  // WITHOUT reloading draft_sections, so global font changes never discard
  // unsaved per-element edits on the canvas.
  const [themeKey, setThemeKey] = useState(0);
  const [canPublish, setCanPublish] = useState(true);
  const [published, setPublished] = useState(false);
  const [publishBusy, setPublishBusy] = useState(false);
  // Layers panel: live structure lifted from Canvas + selection signalling.
  const [structure, setStructure] = useState<SectionContent[]>([]);
  const [layerSel, setLayerSel] = useState<LayerSelection | null>(null);
  const [selectSignal, setSelectSignal] = useState(0);
  const [selectTarget, setSelectTarget] = useState<LayerSelection | null>(null);
  const [globalBlocks, setGlobalBlocks] = useState<ResolvedBlock[]>([]);
  // Undo / redo (explicit-save model).
  const [undoSignal, setUndoSignal] = useState(0);
  const [redoSignal, setRedoSignal] = useState(0);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // Map attached global blocks → Layers Header/Footer inputs (position by name).
  const globalInputs: GlobalBlockInput[] = globalBlocks.map((b) => {
    const n = (b.name || "").toLowerCase();
    const position: "header" | "footer" = n.includes("header") || n.includes("nav") ? "header" : "footer";
    return { id: b.id, name: b.name, type: b.type, content: b.content, position };
  });

  useEffect(() => {
    if (!initialPageId) return;
    let cancelled = false;
    (async () => {
      // Service-role getter so DRAFT/private pages (e.g. funnel steps) load too —
      // the browser anon client is RLS-blocked from reading non-public pages.
      const data = await getPageForEditor(tenantId, initialPageId);
      if (!cancelled && data) { setSelectedPageId(data.id); setSelectedPage(data); setWebsiteId(data.website_id ?? null); }
    })();
    return () => { cancelled = true; };
  }, [initialPageId, tenantId]);

  useEffect(() => { setPublished(Boolean(selectedPage?.is_public)); }, [selectedPage]);

  // Unsaved-changes guard. PAUSED in local dev (it interrupts the rapid
  // edit/restart loop) and ON automatically in production — so it self-restores
  // before go-live with nothing to remember. To force it on locally, set
  // NEXT_PUBLIC_EDIT_GUARD=on.
  // Always on: silently losing edits when switching pages is unacceptable, even in dev.
  // (Set NEXT_PUBLIC_EDIT_GUARD=off only if you explicitly want the old no-warning behavior.)
  const GUARD_ENABLED = process.env.NEXT_PUBLIC_EDIT_GUARD !== "off";

  // Warn before leaving the tab/closing with unsaved changes (explicit-save model).
  useEffect(() => {
    if (!GUARD_ENABLED || !dirty) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty, GUARD_ENABLED]);

  // Catch-all in-app navigation guard. beforeunload does NOT fire on client-side route
  // changes (Next <Link>), so clicking the "← Pages" breadcrumb or a sidebar item used to
  // drop unsaved canvas edits silently. Intercept link clicks while dirty and confirm first.
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;
  useEffect(() => {
    if (!GUARD_ENABLED) return;
    const onClickCapture = (e: MouseEvent) => {
      if (!dirtyRef.current || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as HTMLElement)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a) return;
      const href = a.getAttribute("href") || "";
      // Ignore in-page anchors, new-tab links, downloads, and external/non-nav schemes.
      if (!href || href.startsWith("#") || a.target === "_blank" || a.hasAttribute("download")) return;
      if (/^(mailto:|tel:|javascript:)/i.test(href)) return;
      if (/^https?:\/\//i.test(href) && !href.includes(window.location.host)) return; // external
      // The dialog is async, but native navigation can't be awaited — block it now,
      // then follow the link ourselves only if the user confirms discarding edits.
      e.preventDefault();
      e.stopPropagation();
      confirmDialog("You have unsaved changes on this page.\n\nLeave without saving? Click OK to discard your edits, or Cancel to stay and save first.").then((ok) => {
        if (ok) { setDirty(false); window.location.assign(href); }
      });
    };
    document.addEventListener("click", onClickCapture, true);
    return () => document.removeEventListener("click", onClickCapture, true);
  }, [GUARD_ENABLED]);

  // Guard used by the Pages panel: block switching pages if the current page has
  // unsaved edits, unless the user confirms losing them.
  async function canLeavePage(): Promise<boolean> {
    if (!GUARD_ENABLED || !dirty) return true;
    const ok = await confirmDialog("You have unsaved changes on this page.\n\nClick OK to discard them and switch pages, or Cancel to stay.");
    if (ok) setDirty(false);
    return ok;
  }

  function handleSelectPage(pageId: string | null, page?: SelectedPage) {
    setSelectedPageId(pageId);
    setSelectedPage(page ?? null);
    setDirty(false);
  }

  // Toolbar click: open the left column to that panel, or toggle it closed if it's
  // already showing that panel (exactly like the leading builder — panels come and go).
  function pickTool(m: Mode) {
    if (leftOpen && mode === m) { setLeftOpen(false); return; }
    setMode(m);
    setLeftOpen(true);
  }

  async function handlePublish() {
    if (!selectedPage) return;
    setPublishBusy(true);
    try {
      await publishPage(selectedPage.id, tenantId);
      setPublished(true);
      // publishPage clears draft_sections server-side — force a fresh canvas reload and
      // drop the dirty flag so a stale in-memory draft can't be re-saved over the publish.
      setDirty(false);
      setReloadKey((k) => k + 1);
    } catch (e: any) { notifyError(e?.message ?? "Failed to publish."); }
    finally { setPublishBusy(false); }
  }

  async function handleUnpublish() {
    if (!selectedPage) return;
    setPublishBusy(true);
    try { await unpublishPage(selectedPage.id, tenantId); setPublished(false); }
    catch (e: any) { notifyError(e?.message ?? "Failed to unpublish."); }
    finally { setPublishBusy(false); }
  }

  const pickElement = (t: SectionType, c?: number) => { setAddType(t); setAddCols(c); setAddSignal((n) => n + 1); };
  const pickSections = (sections: SectionContent[]) => { setAddSections(sections); setAddSectionsSignal((n) => n + 1); };

  const LeftPanelBody = () => {
    switch (mode) {
      case "add": return <AddElementsPanel onPick={pickElement} onInsertSections={pickSections} tenantId={tenantId} selectedPageId={selectedPageId} websiteId={websiteId} onApplied={() => setReloadKey((k) => k + 1)} />;
      case "layers": return <LayersPanel sections={structure} globals={globalInputs} selected={layerSel} onSelect={(s) => { setLayerSel(s); setSelectTarget(s); setSelectSignal((n) => n + 1); }} onOpenGlobal={() => { setMode("blocks"); setLeftOpen(true); }} />;
      case "editor": return <PageList tenantId={tenantId} websiteId={websiteId} reloadKey={reloadKey} onSelectPage={handleSelectPage} canLeavePage={canLeavePage} currentPageId={selectedPageId} />;
      case "tracking": return <TrackingCodePanel tenantId={tenantId} websiteId={websiteId ?? undefined} />;
      case "code": return <CustomCssPanel tenantId={tenantId} selectedPageId={selectedPageId} />;
      case "generate": return <WebsiteGeneratorPanel tenantId={tenantId} onApplied={() => setReloadKey((k) => k + 1)} />;
      case "typography": return <TypographyPanel tenantId={tenantId} websiteId={websiteId ?? undefined} onChanged={() => setThemeKey((k) => k + 1)} onResetAll={() => { setThemeKey((k) => k + 1); setReloadKey((k) => k + 1); }} />;
      case "background": return <PageBackgroundPanel tenantId={tenantId} pageId={selectedPageId} onChanged={() => { setThemeKey((k) => k + 1); setReloadKey((k) => k + 1); }} />;
      case "popup": return <PopupSettingsPanel tenantId={tenantId} />;
      case "seo": return <SeoPanel tenantId={tenantId} selectedPageId={selectedPageId} />;
      case "previewcode": return <PreviewCustomCodePanel tenantId={tenantId} selectedPageId={selectedPageId} />;
      case "cookie": return <CookieConsentPanel tenantId={tenantId} websiteId={websiteId ?? undefined} />;
      // hidden / programmatic modes
      case "templates": return <SectionTemplatesPanel tenantId={tenantId} selectedPageId={selectedPageId} websiteId={websiteId} onApplied={() => setReloadKey((k) => k + 1)} />;
      case "navigation": return <NavigationPanel tenantId={tenantId} reloadKey={reloadKey} />;
      case "settings": return <SettingsPanel tenantId={tenantId} selectedPageId={selectedPageId} onChanged={() => setReloadKey((k) => k + 1)} />;
      case "media": return <MediaPanel tenantId={tenantId} />;
      case "blocks": return <GlobalBlocksPanel tenantId={tenantId} selectedPageId={selectedPageId} websiteId={websiteId} onChanged={() => setReloadKey((k) => k + 1)} />;
      case "design": return <BrandPanel tenantId={tenantId} websiteId={websiteId ?? undefined} reloadKey={reloadKey} />;
      default: return <PageList tenantId={tenantId} websiteId={websiteId} reloadKey={reloadKey} onSelectPage={handleSelectPage} canLeavePage={canLeavePage} currentPageId={selectedPageId} />;
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* Top toolbar (polished): left tools · device/title · right controls */}
      <div className="editor-compact mb-3 flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
        <div className="flex items-center gap-1">
          {/* Add Element — first toolbar item (best-in-class). Opens the left Add panel. */}
          {(() => {
            const active = leftOpen && mode === "add";
            return (
              <button onClick={() => pickTool("add")} title="Add elements"
                className={`flex h-9 w-9 items-center justify-center rounded-lg border transition ${active ? "border-[#1e3a8a] bg-[#1e3a8a] text-white" : "border-slate-200 bg-white text-slate-600 hover:bg-[#1e3a8a] hover:text-white hover:border-[#1e3a8a]"}`}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-[18px] w-[18px]"><path d="M12 5v14M5 12h14" /></svg>
              </button>
            );
          })()}
          <div className="mx-1 h-6 w-px bg-slate-200" />
          {TOOLS.map((t) => {
            const active = leftOpen && mode === t.mode;
            return (
              <button key={t.mode} onClick={() => pickTool(t.mode)} title={t.label}
                className={`flex h-9 w-9 items-center justify-center rounded-lg border transition ${active ? "border-[#1e3a8a] bg-[#1e3a8a] text-white" : "border-slate-200 bg-white text-slate-600 hover:bg-[#1e3a8a] hover:text-white hover:border-[#1e3a8a]"}`}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]"><path d={t.icon} /></svg>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          {selectedPage && <span className="truncate text-sm font-medium text-slate-700">{selectedPage.title}</span>}
        </div>

        <div className="flex items-center gap-2">
          {/* Undo / Redo (explicit-save model). */}
          {selectedPageId && (
            <div className="flex overflow-hidden rounded-lg border border-slate-200">
              <button onClick={() => setUndoSignal((n) => n + 1)} disabled={!canUndo} title="Undo"
                className="flex h-9 w-9 items-center justify-center bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-30">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]"><path d="M9 14L4 9l5-5M4 9h11a5 5 0 0 1 0 10h-1" /></svg>
              </button>
              <button onClick={() => setRedoSignal((n) => n + 1)} disabled={!canRedo} title="Redo"
                className="flex h-9 w-9 items-center justify-center border-l border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-30">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]"><path d="M15 14l5-5-5-5M20 9H9a5 5 0 0 0 0 10h1" /></svg>
              </button>
            </div>
          )}
          {/* Save — red dot when the current page has unsaved changes (the leading builder pattern). */}
          {selectedPageId && (
            <button onClick={() => setSaveSignal((n) => n + 1)} title={dirty ? "Unsaved changes — click to save" : "All changes saved"}
              className={`relative flex h-9 items-center gap-1.5 rounded-lg border px-2.5 text-sm transition ${dirty ? "border-[#1e3a8a] bg-[#1e3a8a] text-white hover:bg-[#1e3a8a]/90" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2zM17 21v-8H7v8M7 3v5h8" /></svg>
              <span>Save</span>
              {dirty && saveState !== "saving" && <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white" />}
            </button>
          )}
          {/* Live save status — distinguishes an in-flight save from a slow page compile. */}
          {selectedPageId && saveState !== "idle" && (
            <span className={`flex items-center gap-1 text-xs font-medium ${saveState === "error" ? "text-red-500" : "text-slate-500"}`}>
              {saveState === "saving" && (<><span className="h-3 w-3 animate-spin rounded-full border-2 border-slate-300 border-t-[#1e3a8a]" />Saving…</>)}
              {saveState === "saved" && <span className="text-emerald-600">Saved ✓</span>}
              {saveState === "error" && <span>Save failed — retry</span>}
            </span>
          )}
          {selectedPageId && (
            <a href={`/tenants/${tenantId}/website/preview/${selectedPageId}`} target="_blank"
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50">Preview</a>
          )}
          {selectedPage && (published ? (
            <button onClick={handleUnpublish} disabled={publishBusy}
              className="rounded-lg bg-slate-700 px-3 py-1.5 text-sm text-white disabled:opacity-50">{publishBusy ? "Working…" : "Unpublish"}</button>
          ) : (
            <button onClick={handlePublish} disabled={!canPublish || publishBusy}
              title={canPublish ? "Publish this page" : "Fix invalid sections before publishing"}
              className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-40">{publishBusy ? "Working…" : "Publish"}</button>
          ))}
        </div>
      </div>

      {/* 3 columns: middle (canvas) always visible; left + right collapsible.
          Bounded to the viewport so the panels scroll internally (keeps the Pages
          "Add new page" button and the canvas usable on long pages). */}
      <div className="flex h-[calc(100vh-160px)] min-h-0 gap-3">
        {leftOpen && (
          <div className={`editor-compact flex shrink-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm ${mode === "add" ? "w-[380px]" : "w-72"}`}>
            <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2">
              <span className="text-sm font-semibold text-slate-700">{PANEL_TITLE[mode]}</span>
              <button onClick={() => setLeftOpen(false)} className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700" title="Close">✕</button>
            </div>
            <div className={`min-h-0 flex-1 p-3 ${mode === "editor" || mode === "add" ? "overflow-hidden" : "overflow-y-auto"}`}>{LeftPanelBody()}</div>
          </div>
        )}

        <div className="min-w-0 flex-1 overflow-y-auto">
          {selectedPage && !canPublish && (
            <div className="mb-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
              This page cannot be published until all sections are valid.
            </div>
          )}
          <Canvas tenantId={tenantId} websiteId={websiteId} selectedPageId={selectedPageId} selectedPage={selectedPage} reloadKey={reloadKey} themeKey={themeKey} onValidityChange={setCanPublish}
            addSignal={addSignal} addType={addType} addCols={addCols} addSectionsSignal={addSectionsSignal} addSections={addSections} onRequestAdd={() => { setMode("add"); setLeftOpen(true); }}
            saveSignal={saveSignal} onDirtyChange={(d) => setDirty((p) => (p === d ? p : d))} onSaveStateChange={handleSaveState}
            onStructureChange={setStructure} selectSignal={selectSignal} selectTarget={selectTarget}
            onSelectionChange={setLayerSel} onBlocksChange={setGlobalBlocks}
            undoSignal={undoSignal} redoSignal={redoSignal} onHistoryChange={(u, r) => { setCanUndo(u); setCanRedo(r); }} />
        </div>
      </div>
    </div>
  );
}
