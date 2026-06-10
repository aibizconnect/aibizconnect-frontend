"use client";

import { useEffect, useState } from "react";

/**
 * Live countdown. Two modes:
 *  - "date": counts down to a fixed target ISO date (a real deadline).
 *  - "evergreen": counts down `minutes` from each visitor's first view (per-browser, persisted in
 *    localStorage), so every visitor sees their own fresh urgency timer. Resets after it elapses.
 * `units` chooses which cells show: "dhms" (days/hrs/min/sec), "hms" (hrs/min/sec), "ms" (min/sec).
 */
export default function Countdown({
  target, label, color, mode = "date", minutes, units, uid,
}: {
  target?: string; label?: string; color?: string;
  mode?: "date" | "evergreen"; minutes?: number; units?: "dhms" | "hms" | "ms"; uid?: string;
}) {
  const [now, setNow] = useState<number | null>(null);
  const [start, setStart] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    if (mode === "evergreen") {
      // Per-visitor evergreen start, persisted so the timer doesn't reset on every render/navigation.
      const key = `abc-cd-${uid || label || "t"}-${minutes || 15}`;
      let s = Number(localStorage.getItem(key));
      const dur = (minutes || 15) * 60000;
      if (!s || Date.now() - s >= dur) { s = Date.now(); localStorage.setItem(key, String(s)); }
      setStart(s);
    }
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [mode, minutes, uid, label]);

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

  // Which cells to show. Default by mode: evergreen-minute → ms, else dhms.
  const u = units || (mode === "evergreen" && (minutes || 15) < 60 ? "ms" : "dhms");
  const cells: [number, string][] =
    u === "ms" ? [[m, "min"], [s, "sec"]] :
    u === "hms" ? [[h, "hrs"], [m, "min"], [s, "sec"]] :
    [[d, "days"], [h, "hrs"], [m, "min"], [s, "sec"]];

  const cell = (n: number, l: string) => (
    <div key={l} className="flex flex-col items-center">
      <span className="text-3xl font-bold tabular-nums" style={{ color: color ?? "#1e3a8a" }}>{String(n).padStart(2, "0")}</span>
      <span className="text-[10px] uppercase tracking-wide text-slate-500">{l}</span>
    </div>
  );
  return (
    <div className="text-center">
      {label && <div className="mb-2 text-sm font-medium text-slate-600">{label}</div>}
      <div className="flex items-center justify-center gap-4">
        {cells.map(([n, l]) => cell(n, l))}
      </div>
    </div>
  );
}
