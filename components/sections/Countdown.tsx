"use client";

import { useEffect, useState } from "react";

/**
 * Live countdown. Two modes:
 *  - "date": counts down to a fixed target ISO date (a real deadline).
 *  - "evergreen": counts down `minutes` from each visitor's first view (per-browser, persisted), so
 *    every visitor sees their own fresh urgency timer; resets after it elapses.
 * `units` chooses precision: "dhms" (days/hrs/min/sec), "hms" (hrs/min/sec), "ms" (min/sec).
 * `display`: "cells" = stacked number+label blocks; "inline" = HH:MM:SS digital clock.
 * Fully styleable: title / preText / postText / footer, font, fg + bg color, digit size, alignment.
 */
export default function Countdown(props: {
  target?: string; label?: string; color?: string;
  mode?: "date" | "evergreen"; minutes?: number; units?: "dhms" | "hms" | "ms";
  display?: "cells" | "inline"; uid?: string;
  title?: string; footer?: string; preText?: string; postText?: string;
  font?: string; fgColor?: string; bgColor?: string; size?: number; align?: "left" | "center" | "right";
}) {
  const { target, label, color, mode = "date", minutes, units, display = "cells", uid,
    title, footer, preText, postText, font, fgColor, bgColor, size, align = "center" } = props;
  const fg = fgColor || color || "#1e3a8a";

  const [now, setNow] = useState<number | null>(null);
  const [start, setStart] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    if (mode === "evergreen") {
      const key = `abc-cd-${uid || title || label || "t"}-${minutes || 15}`;
      let s = Number(localStorage.getItem(key));
      const dur = (minutes || 15) * 60000;
      if (!s || Date.now() - s >= dur) { s = Date.now(); localStorage.setItem(key, String(s)); }
      setStart(s);
    }
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [mode, minutes, uid, title, label]);

  let diff = 0;
  if (now != null) {
    if (mode === "evergreen") {
      const dur = (minutes || 15) * 60000;
      diff = start != null ? Math.max(0, dur - (now - start)) : dur;
    } else {
      diff = Math.max(0, new Date(target || Date.now()).getTime() - now);
    }
  }
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  const pad = (n: number) => String(n).padStart(2, "0");

  const u = units || (mode === "evergreen" && (minutes || 15) < 60 ? "ms" : "dhms");
  const cells: [number, string][] =
    u === "ms" ? [[m, "min"], [s, "sec"]] :
    u === "hms" ? [[h, "hrs"], [m, "min"], [s, "sec"]] :
    [[d, "days"], [h, "hrs"], [m, "min"], [s, "sec"]];

  const timer = display === "inline"
    ? <span className="font-bold tabular-nums" style={{ color: fg, fontSize: (size ?? 36) + "px", fontFamily: font }}>
        {(u === "dhms" ? pad(d) + ":" : "") + (u !== "ms" ? pad(h) + ":" : "") + pad(m) + ":" + pad(s)}
      </span>
    : <div className="flex items-end justify-center gap-4">
        {cells.map(([n, l]) => (
          <div key={l} className="flex flex-col items-center">
            <span className="font-bold tabular-nums" style={{ color: fg, fontSize: (size ?? 30) + "px", fontFamily: font }}>{pad(n)}</span>
            <span className="text-[10px] uppercase tracking-wide text-slate-500">{l}</span>
          </div>
        ))}
      </div>;

  return (
    <div style={{ textAlign: align, background: bgColor, fontFamily: font, padding: bgColor ? "20px" : undefined, borderRadius: bgColor ? 12 : undefined }}>
      {title && <div className="mb-1 text-lg font-semibold" style={{ color: fg, fontFamily: font }}>{title}</div>}
      {(label || preText) && <div className="mb-2 text-sm font-medium text-slate-600">{label || preText}</div>}
      <div className={align === "center" ? "flex justify-center" : align === "right" ? "flex justify-end" : "flex justify-start"}>{timer}</div>
      {postText && <div className="mt-2 text-sm text-slate-600">{postText}</div>}
      {footer && <div className="mt-1 text-xs text-slate-400">{footer}</div>}
    </div>
  );
}
