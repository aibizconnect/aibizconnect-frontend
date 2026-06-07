"use client";

import { useEffect, useState } from "react";

/** Live countdown to a target ISO date. Client component (ticks every second). */
export default function Countdown({ target, label, color }: { target: string; label?: string; color?: string }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const end = new Date(target).getTime();
  const diff = now == null ? 0 : Math.max(0, end - now);
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  const cell = (n: number, l: string) => (
    <div className="flex flex-col items-center">
      <span className="text-3xl font-bold tabular-nums" style={{ color: color ?? "#1e3a8a" }}>{String(n).padStart(2, "0")}</span>
      <span className="text-[10px] uppercase tracking-wide text-slate-500">{l}</span>
    </div>
  );
  return (
    <div className="text-center">
      {label && <div className="mb-2 text-sm font-medium text-slate-600">{label}</div>}
      <div className="flex items-center justify-center gap-4">
        {cell(d, "days")}{cell(h, "hrs")}{cell(m, "min")}{cell(s, "sec")}
      </div>
    </div>
  );
}
