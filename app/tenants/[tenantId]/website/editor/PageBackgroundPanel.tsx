"use client";

import { useEffect, useRef, useState } from "react";
import type { ElementStyle } from "@/lib/design/element-style";
import { BackgroundControls } from "@/components/design/ElementInspector";
import MediaPickerModal from "./MediaPickerModal";
import { getPageBackground, savePageBackground } from "../actions";

/**
 * Page Background panel — solid colour, gradient, or image behind ALL sections of
 * THIS page. Per-page: stored in website_pages.page_background (an ElementStyle).
 * When a page has none of its own it inherits the site-wide default. Applied by the
 * editor canvas, the preview route, and the public site. Reuses the same
 * BackgroundControls + Media Storage picker as the element/column inspector.
 */
export default function PageBackgroundPanel({ tenantId, pageId, onChanged }: { tenantId: string; pageId: string | null; onChanged?: () => void }) {
  const [style, setStyle] = useState<ElementStyle>({});
  const [scope, setScope] = useState<"page" | "site" | "none">("none");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickApply, setPickApply] = useState<((url: string) => void) | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!pageId) { setLoading(false); return; }
    setLoading(true);
    (async () => {
      try {
        const { style: s, scope: sc } = await getPageBackground(tenantId, pageId);
        setStyle((s as ElementStyle) ?? {});
        setScope(sc);
      } catch { setStyle({}); setScope("none"); }
      finally { setLoading(false); }
    })();
  }, [tenantId, pageId]);

  // Debounced persist so dragging sliders / typing doesn't hammer the DB.
  function persist(next: ElementStyle) {
    if (!pageId) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try { await savePageBackground(tenantId, pageId, next as Record<string, unknown>); setError(null); onChanged?.(); }
      catch (e: any) { setError(e?.message ?? "Failed to save."); }
    }, 400);
  }

  const set = (patch: Partial<ElementStyle>) => {
    setStyle((prev) => { const next = { ...prev, ...patch }; setScope("page"); persist(next); return next; });
  };

  const handlePickImage = (apply: (url: string) => void) => { setPickApply(() => apply); setPickerOpen(true); };
  const hasBg = !!style.bgImage || (style.bg && style.bg !== "transparent");

  if (!pageId) {
    return <p className="px-1 py-2 text-sm text-slate-500">Select a page first to set its background.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      <div>
        <h3 className="text-sm font-semibold text-slate-800">Page Background</h3>
        <p className="mt-1 text-xs leading-relaxed text-slate-500">Solid colour, gradient, or image shown behind <b>all sections of this page</b>.</p>
        {scope === "site" && (
          <p className="mt-1 rounded bg-slate-100 px-2 py-1 text-[11px] text-slate-500">Currently inheriting the <b>site-wide</b> default. Editing here creates a background just for this page.</p>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <BackgroundControls s={style} set={set} onPickImage={handlePickImage} />
      </div>

      {hasBg && (
        <button type="button" onClick={() => { setStyle({}); setScope("none"); persist({}); }}
          className="self-start rounded-md border border-slate-300 px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-50">
          Clear this page's background
        </button>
      )}

      {error && <p className="rounded bg-red-50 px-2 py-1 text-[11px] text-red-600">{error}</p>}
      {loading && <p className="text-[11px] text-slate-400">Loading…</p>}
      <p className="text-[11px] text-slate-400">Changes save automatically and apply to the live page on publish.</p>

      <MediaPickerModal
        tenantId={tenantId}
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={(url) => pickApply?.(url)}
      />
    </div>
  );
}
