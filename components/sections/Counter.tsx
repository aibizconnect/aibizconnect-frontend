"use client";

import { useEffect, useRef, useState } from "react";

/** Animated count-up: counts from 0 to the numeric value when scrolled into view. */
export default function Counter({ value, prefix = "", suffix = "", color = "#1e3a8a", label }: { value: string; prefix?: string; suffix?: string; color?: string; label?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  // Parse the leading number (handles "1,000", "98%", "4.9").
  const num = parseFloat((value || "").replace(/[, ]/g, ""));
  const decimals = (value.split(".")[1] || "").replace(/[^0-9]/g, "").length;
  const [shown, setShown] = useState(Number.isFinite(num) ? 0 : null);

  useEffect(() => {
    if (!Number.isFinite(num) || !ref.current) return;
    let raf = 0; let started = false;
    const animate = () => {
      const dur = 1200; let t0 = 0;
      const step = (ts: number) => {
        if (!t0) t0 = ts;
        const p = Math.min(1, (ts - t0) / dur);
        const eased = 1 - Math.pow(1 - p, 3);
        setShown(num * eased);
        if (p < 1) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    };
    const io = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && !started) { started = true; animate(); io.disconnect(); }
    }, { threshold: 0.4 });
    io.observe(ref.current);
    return () => { io.disconnect(); cancelAnimationFrame(raf); };
  }, [num]);

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
