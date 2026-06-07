"use client";

import { useEffect, useState } from "react";
import type { Popup } from "@/lib/popups";

/**
 * Public-site popup overlay. Renders the first eligible active popup using its trigger
 * (on-load / timer / exit-intent), position, and width. Dismissal is remembered per
 * session (sessionStorage) so it doesn't nag. Display + a CTA link only — no form submit
 * or send happens here.
 */
const WIDTHS = { sm: "max-w-sm", md: "max-w-md", lg: "max-w-lg" } as const;
const POS = {
  center: "items-center justify-center",
  "bottom-right": "items-end justify-end",
  "bottom-left": "items-end justify-start",
  top: "items-start justify-center",
} as const;

export default function SitePopups({ popups }: { popups: Popup[] }) {
  const active = popups.find((p) => p.content.enabled);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!active) return;
    const key = `abc-popup-${active.id}`;
    if (typeof window !== "undefined" && sessionStorage.getItem(key)) return;
    const open = () => setShow(true);
    const c = active.content;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let onExit: ((e: MouseEvent) => void) | undefined;
    if (c.trigger === "load") timer = setTimeout(open, 400);
    else if (c.trigger === "timer") timer = setTimeout(open, Math.max(0, (c.delaySec ?? 5)) * 1000);
    else if (c.trigger === "exit") {
      onExit = (e) => { if (e.clientY <= 0) open(); };
      document.addEventListener("mouseout", onExit);
    }
    return () => { if (timer) clearTimeout(timer); if (onExit) document.removeEventListener("mouseout", onExit); };
  }, [active]);

  if (!active || !show) return null;
  const c = active.content;
  const dismiss = () => { setShow(false); try { sessionStorage.setItem(`abc-popup-${active.id}`, "1"); } catch {} };

  return (
    <div className={`fixed inset-0 z-[100] flex p-4 ${POS[c.position] ?? POS.center}`} style={{ background: c.position === "center" ? "rgba(0,0,0,0.5)" : "transparent" }} onClick={c.position === "center" ? dismiss : undefined}>
      <div onClick={(e) => e.stopPropagation()} className={`relative w-full ${WIDTHS[c.width] ?? WIDTHS.md} rounded-2xl bg-[var(--abc-color-surface,#0f1b33)] p-6 text-[var(--abc-color-fg,#e8eefc)] shadow-2xl ring-1 ring-white/10`}>
        <button onClick={dismiss} aria-label="Close" className="absolute right-3 top-3 grid h-7 w-7 place-items-center rounded-full bg-white/10 text-sm hover:bg-white/20">✕</button>
        <h3 className="pr-6 text-xl font-semibold" style={{ fontFamily: "MontserratAlt1, Inter, sans-serif" }}>{c.heading}</h3>
        {c.body && <p className="mt-2 text-sm text-[var(--abc-color-muted,#93a4c4)]">{c.body}</p>}
        {c.ctaLabel && (
          <a href={c.ctaHref || "#"} className="mt-5 inline-block rounded-xl bg-[var(--abc-color-primary,#2563eb)] px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90">{c.ctaLabel}</a>
        )}
      </div>
    </div>
  );
}
