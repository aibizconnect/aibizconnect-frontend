"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { GOOGLE_FONTS, ensureAllGoogleFonts, ensureGoogleFont, fontStack } from "@/lib/fonts";

/**
 * Google-Fonts picker: a button showing the current font, opening a scrollable list where
 * each family renders in its own typeface. The dropdown is PORTALED to <body> with fixed
 * positioning so it's never clipped by a parent's overflow (e.g. the floating left panel).
 */
export default function FontPicker({ value, onChange, customFonts = [] }: { value?: string; onChange: (v: string) => void; customFonts?: string[] }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (open) ensureAllGoogleFonts(); }, [open]);
  useEffect(() => { ensureGoogleFont(value); }, [value]);
  // Close on outside click (button + portaled menu are the "inside").
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      const t = e.target as Node;
      if (btnRef.current?.contains(t) || popRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  const current = value || "(default)";
  const match = (f: string) => !q || (f || "default").toLowerCase().includes(q.toLowerCase());
  const customMatches = customFonts.filter(match);
  const googleMatches = GOOGLE_FONTS.filter(match);
  const showDefault = match("");
  const total = customMatches.length + googleMatches.length + (showDefault ? 1 : 0);

  const toggle = () => {
    if (!open) {
      const r = btnRef.current?.getBoundingClientRect();
      if (r) {
        const width = Math.max(r.width, 224);
        const left = Math.max(8, Math.min(r.left, window.innerWidth - width - 8));
        const top = Math.min(r.bottom + 4, window.innerHeight - 300);
        setPos({ top: Math.max(8, top), left, width });
      }
      setQ("");
    }
    setOpen((o) => !o);
  };

  const Option = (f: string) => (
    <button key={f || "default"} type="button"
      onClick={() => { onChange(f); ensureGoogleFont(f); setOpen(false); }}
      className={`flex w-full items-center justify-between px-3 py-1 text-left text-[13px] hover:bg-slate-100 ${value === f ? "bg-[#1e3a8a]/10" : ""}`}
      style={{ fontFamily: fontStack(f) }}>
      <span className="truncate">{f || "(default)"}</span>
      {value === f && <span className="text-[11px] text-[#1e3a8a]">✓</span>}
    </button>
  );

  return (
    <div className="relative w-full">
      <button ref={btnRef} type="button" onClick={toggle}
        className="flex w-full items-center justify-between rounded border border-gray-300 px-2 py-1 text-sm hover:border-gray-400"
        style={{ fontFamily: fontStack(value) }}>
        <span className="truncate">{current}</span>
        <span className="ml-1 shrink-0 text-gray-400">▾</span>
      </button>
      {open && pos && createPortal(
        <div ref={popRef} style={{ position: "fixed", top: pos.top, left: pos.left, width: pos.width }}
          className="z-[9998] max-h-72 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xl">
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search fonts…"
            className="w-full border-b border-gray-100 px-3 py-1.5 text-[13px] outline-none" />
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
        </div>,
        document.body,
      )}
    </div>
  );
}
