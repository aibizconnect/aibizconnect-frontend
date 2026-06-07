"use client";

import { useEffect, useRef, useState } from "react";
import { GOOGLE_FONTS, ensureAllGoogleFonts, ensureGoogleFont, fontStack } from "@/lib/fonts";

/**
 * Google-Fonts picker: a button showing the current font, opening a scrollable
 * list where each family is rendered in its own typeface (Canva/GHL style).
 * Size & weight are set elsewhere (the right-column typography fields).
 */
export default function FontPicker({ value, onChange, customFonts = [] }: { value?: string; onChange: (v: string) => void; customFonts?: string[] }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  // Load the catalogue when first opened so each name shows in its own face.
  useEffect(() => { if (open) ensureAllGoogleFonts(); }, [open]);
  // Keep the current selection rendering even before opening.
  useEffect(() => { ensureGoogleFont(value); }, [value]);
  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  const current = value || "(default)";
  const match = (f: string) => !q || (f || "default").toLowerCase().includes(q.toLowerCase());
  const customMatches = customFonts.filter(match);
  const googleMatches = GOOGLE_FONTS.filter(match);
  const showDefault = match("");
  const total = customMatches.length + googleMatches.length + (showDefault ? 1 : 0);

  const Option = (f: string) => (
    <button key={f || "default"} type="button"
      onClick={() => { onChange(f); ensureGoogleFont(f); setOpen(false); }}
      className={`flex w-full items-center justify-between px-3 py-1.5 text-left text-[15px] hover:bg-slate-100 ${value === f ? "bg-[#1e3a8a]/10" : ""}`}
      style={{ fontFamily: fontStack(f) }}>
      <span className="truncate">{f || "(default)"}</span>
      {value === f && <span className="text-[#1e3a8a]">✓</span>}
    </button>
  );

  return (
    <div ref={ref} className="relative w-44">
      <button type="button" onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between rounded border border-gray-300 px-2 py-1 text-sm hover:border-gray-400"
        style={{ fontFamily: fontStack(value) }}>
        <span className="truncate">{current}</span>
        <span className="ml-1 shrink-0 text-gray-400">▾</span>
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-1 max-h-72 w-56 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search fonts…"
            className="w-full border-b border-gray-100 px-3 py-2 text-sm outline-none" />
          <div className="max-h-60 overflow-y-auto py-1">
            {showDefault && Option("")}
            {customMatches.length > 0 && (
              <>
                <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400">Your uploaded fonts</div>
                {customMatches.map(Option)}
                <div className="my-1 border-t border-gray-100" />
                <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400">Google Fonts</div>
              </>
            )}
            {googleMatches.map(Option)}
            {total === 0 && <p className="px-3 py-2 text-xs text-gray-400">No matches</p>}
          </div>
        </div>
      )}
    </div>
  );
}
