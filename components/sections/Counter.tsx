"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Animated count-up: when scrolled into view, animates from `start` to `end` over
 * `duration` seconds (ease-out). Backward compatible — if `end` isn't given it's parsed
 * from `value` (e.g. "1,000", "98%", "4.9"); `start` defaults to 0 and `duration` to 2s.
 */
export default function Counter({
  value, start, end, duration, prefix = "", suffix = "", color = "#1e3a8a", label,
}: {
  value: string; start?: number; end?: number; duration?: number;
  prefix?: string; suffix?: string; color?: string; label?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  // Resolve the numeric target: explicit `end` wins, else parse the leading number from `value`.
  const parsed = parseFloat((value || "").replace(/[, ]/g, ""));
  const target = Number.isFinite(end as number) ? (end as number) : parsed;
  const from = Number.isFinite(start as number) ? (start as number) : 0;
  // Decimal places: from the larger of value's decimals or end's decimals (so 4.9 stays 4.9).
  const decFrom = (v: number | string) => (String(v).split(".")[1] || "").replace(/[^0-9]/g, "").length;
  const decimals = Math.max(decFrom(value), Number.isFinite(end as number) ? decFrom(end as number) : 0);
  const durMs = Math.max(0, (Number.isFinite(duration as number) ? (duration as number) : 2)) * 1000;

  const [shown, setShown] = useState<number | null>(Number.isFinite(target) ? from : null);

  useEffect(() => {
    if (!Number.isFinite(target) || !ref.current) return;
    let raf = 0; let started = false;
    const animate = () => {
      if (durMs <= 0) { setShown(target); return; }
      let t0 = 0;
      const step = (ts: number) => {
        if (!t0) t0 = ts;
        const p = Math.min(1, (ts - t0) / durMs);
        const eased = 1 - Math.pow(1 - p, 3);
        setShown(from + (target - from) * eased);
        if (p < 1) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    };
    const io = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !started) { started = true; animate(); io.disconnect(); }
    }, { threshold: 0.4 });
    io.observe(ref.current);
    return () => { io.disconnect(); cancelAnimationFrame(raf); };
  }, [target, from, durMs]);

  const display = shown === null
    ? value
    : shown.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

  return (
    <div ref={ref} className="text-center">
      <div className="text-4xl font-extrabold md:text-5xl" style={{ color }}>{prefix}{display}{suffix}</div>
      {label && <div className="mt-1 text-sm font-medium text-slate-600">{label}</div>}
    </div>
  );
}
