"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Reusable info icon (ⓘ) → click to reveal step-by-step help. Drop it next to any label or
 * instruction that needs "where do I go / what do I do" guidance. Click-outside / Esc to close.
 *
 *   <InfoTip title="DKIM record">Go to resend.com → Domains → …</InfoTip>
 */
export default function InfoTip({
  title,
  children,
  align = "left",
  className = "",
}: {
  title?: string;
  children: ReactNode;
  align?: "left" | "right";
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const onEsc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onEsc);
    return () => { document.removeEventListener("mousedown", onDoc); document.removeEventListener("keydown", onEsc); };
  }, [open]);

  return (
    <span ref={ref} className={`relative inline-flex ${className}`}>
      <button
        type="button"
        aria-label={title ? `Help: ${title}` : "More information"}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="grid h-4 w-4 flex-none cursor-help place-items-center rounded-full border border-slate-300 text-[10px] font-bold italic leading-none text-slate-500 transition hover:border-[#1e3a8a] hover:bg-[#1e3a8a] hover:text-white"
      >
        i
      </button>
      {open && (
        <span
          role="tooltip"
          className={`absolute top-5 z-50 w-72 rounded-lg border border-slate-200 bg-white p-3 text-left text-xs font-normal normal-case leading-relaxed text-slate-600 shadow-xl ${align === "right" ? "right-0" : "left-0"}`}
        >
          {title && <span className="mb-1 block text-sm font-semibold text-slate-800">{title}</span>}
          {children}
        </span>
      )}
    </span>
  );
}
