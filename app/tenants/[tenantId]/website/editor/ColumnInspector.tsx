"use client";

import { useState } from "react";
import type { ElementStyle } from "@/lib/design/element-style";
import { StylesPanel } from "@/components/design/ElementInspector";
import MediaPickerModal from "./MediaPickerModal";

/**
 * Per-column property panel. A column is a first-class node with the SAME rich
 * styling as elements (background incl. gradient, box-model spacing, border +
 * per-corner radius, shadow, opacity) via the shared StylesPanel — plus a
 * column-specific vertical alignment. Column WIDTH is set by dragging the
 * divider on the canvas (widths[] ratios), so it isn't duplicated here.
 */
interface ColumnInspectorProps {
  style: ElementStyle;
  onChange: (style: ElementStyle) => void;
  widthPct?: number;                    // current width as % of the row
  onWidthPct?: (pct: number) => void;   // set width as % (redistributes others)
  tenantId?: string;                    // enables the Media Storage background picker
}

const VALIGN: Array<{ v: NonNullable<ElementStyle["valign"]>; label: string }> = [
  { v: "start", label: "Top" },
  { v: "center", label: "Middle" },
  { v: "end", label: "Bottom" },
];
const HALIGN: Array<{ v: NonNullable<ElementStyle["itemsAlign"]>; label: string }> = [
  { v: "start", label: "Left" },
  { v: "center", label: "Center" },
  { v: "end", label: "Right" },
  { v: "stretch", label: "Stretch" },
];

export default function ColumnInspector({ style, onChange, widthPct, onWidthPct, tenantId }: ColumnInspectorProps) {
  const s = style ?? {};
  const set = (patch: Partial<ElementStyle>) => onChange({ ...s, ...patch });
  const isPx = s.widthPx != null;
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickApply, setPickApply] = useState<((url: string) => void) | null>(null);
  const handlePickImage = (apply: (url: string) => void) => { setPickApply(() => apply); setPickerOpen(true); };

  return (
    <div className="flex flex-col gap-2 text-sm">
      {/* Column width — % (redistributes the row) or a fixed px width. */}
      <div className="border-b border-gray-100 pb-3">
        <div className="mb-1 flex items-center justify-between">
          <label className="block text-xs font-medium text-slate-500">Width</label>
          <div className="flex overflow-hidden rounded border border-slate-200 text-[10px]">
            <button onClick={() => set({ widthPx: undefined })} className={`px-2 py-0.5 ${!isPx ? "bg-[#1e3a8a] text-white" : "bg-white text-slate-500"}`}>%</button>
            <button onClick={() => set({ widthPx: s.widthPx ?? 240 })} className={`px-2 py-0.5 ${isPx ? "bg-[#1e3a8a] text-white" : "bg-white text-slate-500"}`}>px</button>
          </div>
        </div>
        {isPx ? (
          <div className="flex items-center gap-2">
            <input type="number" min={40} max={2000} value={s.widthPx ?? 240}
              onChange={(e) => set({ widthPx: e.target.value ? Number(e.target.value) : undefined })}
              className="w-20 rounded border border-slate-300 px-2 py-1 text-sm" />
            <span className="text-xs text-slate-400">px (fixed)</span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <input type="range" min={5} max={95} value={widthPct ?? 50} onChange={(e) => onWidthPct?.(Number(e.target.value))} className="h-1 flex-1 accent-[#1e3a8a]" />
            <input type="number" min={5} max={95} value={widthPct ?? 50} onChange={(e) => onWidthPct?.(Number(e.target.value))} className="w-16 rounded border border-slate-300 px-2 py-1 text-right text-sm" />
            <span className="text-xs text-slate-400">%</span>
          </div>
        )}
      </div>

      <div className="border-b border-gray-100 pb-3">
        <label className="mb-1 block text-xs font-medium text-slate-500">Horizontal align (content)</label>
        <div className="flex overflow-hidden rounded-lg border border-slate-200">
          {HALIGN.map((o) => (
            <button key={o.v} onClick={() => set({ itemsAlign: o.v })}
              className={`flex-1 px-2 py-1.5 text-xs ${(s.itemsAlign ?? "stretch") === o.v ? "bg-[#1e3a8a] text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}>
              {o.label}
            </button>
          ))}
        </div>
      </div>

      <div className="border-b border-gray-100 pb-3">
        <label className="mb-1 block text-xs font-medium text-slate-500">Vertical align (content)</label>
        <div className="flex overflow-hidden rounded-lg border border-slate-200">
          {VALIGN.map((o) => (
            <button key={o.v} onClick={() => set({ valign: o.v })}
              className={`flex-1 px-2 py-1.5 text-xs ${s.valign === o.v ? "bg-[#1e3a8a] text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}>
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {/* Per-breakpoint visibility (GHL parity) — hide this column on a given device. */}
      <div className="border-b border-gray-100 pb-3">
        <label className="mb-1 block text-xs font-medium text-slate-500">Visibility</label>
        <div className="flex flex-col gap-1.5">
          <label className="flex items-center gap-2 text-xs text-slate-600">
            <input type="checkbox" checked={!!s.hiddenDesktop} onChange={(e) => set({ hiddenDesktop: e.target.checked })} /> Hide on desktop
          </label>
          <label className="flex items-center gap-2 text-xs text-slate-600">
            <input type="checkbox" checked={!!s.hiddenTablet} onChange={(e) => set({ hiddenTablet: e.target.checked })} /> Hide on tablet
          </label>
          <label className="flex items-center gap-2 text-xs text-slate-600">
            <input type="checkbox" checked={!!s.hiddenMobile} onChange={(e) => set({ hiddenMobile: e.target.checked })} /> Hide on mobile
          </label>
        </div>
      </div>

      <StylesPanel value={style} onChange={onChange} onPickImage={tenantId ? handlePickImage : undefined} />

      <p className="mt-1 text-[11px] text-slate-400">Tip: drag the divider between columns on the canvas to resize this column's width.</p>

      {tenantId && (
        <MediaPickerModal
          tenantId={tenantId}
          open={pickerOpen}
          onClose={() => setPickerOpen(false)}
          onSelect={(url) => pickApply?.(url)}
        />
      )}
    </div>
  );
}
