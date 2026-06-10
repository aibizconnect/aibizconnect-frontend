"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Three behaviors via `mode`:
 *  - "counter": animate a NUMBER from `from` → `to` over `duration` seconds (e.g. "0 → 500+").
 *  - "timer":   HH:MM:SS ticking DOWN from `minutes` on each load (not per-visitor).
 *  - "date":    count DOWN to a target date/time, shown as days/hrs/min/sec cells (or inline).
 * Styleable: title / preText / postText / footer, font, fg + bg color, digit size, alignment.
 */
export default function Countdown(props: {
  mode?: "counter" | "timer" | "date";
  from?: number; to?: number; duration?: number; prefix?: string; suffix?: string;
  minutes?: number; target?: string;
  units?: "dhms" | "hms" | "ms"; display?: "cells" | "inline";
  color?: string; label?: string;
  title?: string; footer?: string; preText?: string; postText?: string;
  font?: string; fgColor?: string; bgColor?: string; size?: number; align?: "left" | "center" | "right";
}) {
  const { mode = "date", from = 0, to = 100, duration = 2, prefix = "", suffix = "",
    minutes, target, units, display = "cells", color, label,
    title, footer, preText, postText, font, fgColor, bgColor, size, align = "center" } = props;
  const fg = fgColor || color || "#1e3a8a";
  const digitStyle = { color: fg, fontFamily: font };

  // ── Counter: animate a number ──────────────────────────────────────────────
  const [val, setVal] = useState<number>(from);
  const raf = useRef<number | null>(null);
  useEffect(() => {
    if (mode !== "counter") return;
    const t0 = performance.now();
    const ms = Math.max(0.1, duration) * 1000;
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / ms);
      const eased = 1 - Math.pow(1 - p, 3); // ease-out
      setVal(from + (to - from) * eased);
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, [mode, from, to, duration]);

  // ── Timer / Date: tick a clock ─────────────────────────────────────────────
  const [now, setNow] = useState<number | null>(null);
  const startRef = useRef<number | null>(null);
  useEffect(() => {
    if (mode === "counter") return;
    setNow(Date.now());
    if (mode === "timer") startRef.current = Date.now();
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [mode, minutes, target]);

  const wrap = (inner: React.ReactNode) => (
    <div style={{ textAlign: align, background: bgColor, fontFamily: font, padding: bgColor ? 20 : undefined, borderRadius: bgColor ? 12 : undefined }}>
      {title && <div className="mb-1 text-lg font-semibold" style={digitStyle}>{title}</div>}
      {(label || preText) && <div className="mb-2 text-sm font-medium text-slate-600">{label || preText}</div>}
      <div className={align === "center" ? "flex justify-center" : align === "right" ? "flex justify-end" : "flex justify-start"}>{inner}</div>
      {postText && <div className="mt-2 text-sm text-slate-600">{postText}</div>}
      {footer && <div className="mt-1 text-xs text-slate-400">{footer}</div>}
    </div>
  );

  if (mode === "counter") {
    const decimals = Number.isInteger(from) && Number.isInteger(to) ? 0 : 1;
    const shown = val.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
    return wrap(<span className="font-bold tabular-nums" style={{ ...digitStyle, fontSize: (size ?? 48) + "px" }}>{prefix}{shown}{suffix}</span>);
  }

  // timer/date diff
  let diff = 0;
  if (now != null) {
    if (mode === "timer") {
      const dur = (minutes || 15) * 60000;
      diff = startRef.current != null ? Math.max(0, dur - (now - startRef.current)) : dur;
    } else {
      diff = Math.max(0, new Date(target || Date.now()).getTime() - now);
    }
  }
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  const u = units || (mode === "timer" ? "hms" : "dhms");
  const useInline = display === "inline" || mode === "timer";

  if (useInline) {
    const str = (u === "dhms" ? pad(d) + ":" : "") + (u !== "ms" ? pad(h) + ":" : "") + pad(m) + ":" + pad(s);
    return wrap(<span className="font-bold tabular-nums" style={{ ...digitStyle, fontSize: (size ?? 36) + "px" }}>{str}</span>);
  }
  const cells: [number, string][] =
    u === "ms" ? [[m, "min"], [s, "sec"]] :
    u === "hms" ? [[h, "hrs"], [m, "min"], [s, "sec"]] :
    [[d, "days"], [h, "hrs"], [m, "min"], [s, "sec"]];
  return wrap(
    <div className="flex items-end gap-4">
      {cells.map(([n, l]) => (
        <div key={l} className="flex flex-col items-center">
          <span className="font-bold tabular-nums" style={{ ...digitStyle, fontSize: (size ?? 30) + "px" }}>{pad(n)}</span>
          <span className="text-[10px] uppercase tracking-wide text-slate-500">{l}</span>
        </div>
      ))}
    </div>,
  );
}
