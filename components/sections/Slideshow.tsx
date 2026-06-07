"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Real slideshow (GHL-style): one slide at a time with fade transition, optional autoplay,
 * prev/next arrows, and dot indicators. Client component for interactivity.
 */
export default function Slideshow({
  images, autoplay = true, interval = 4, arrows = true, dots = true, height = 360, fit = "cover", accent = "#1e3a8a",
}: {
  images: { url: string }[];
  autoplay?: boolean; interval?: number; arrows?: boolean; dots?: boolean; height?: number;
  fit?: "cover" | "contain"; accent?: string;
}) {
  const [i, setI] = useState(0);
  const n = images.length;
  const paused = useRef(false);

  useEffect(() => {
    if (!autoplay || n <= 1) return;
    const ms = Math.max(1, interval) * 1000;
    const id = setInterval(() => { if (!paused.current) setI((x) => (x + 1) % n); }, ms);
    return () => clearInterval(id);
  }, [autoplay, interval, n]);

  if (!n) return <div className="flex h-40 items-center justify-center rounded-lg border border-dashed border-slate-300 text-sm text-slate-400">Add slideshow images</div>;
  const go = (d: number) => setI((x) => (x + d + n) % n);

  return (
    <div className="relative overflow-hidden rounded-lg" style={{ height }}
      onMouseEnter={() => { paused.current = true; }} onMouseLeave={() => { paused.current = false; }}>
      {images.map((im, k) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={k} src={im.url} alt="" loading={k === 0 ? "eager" : "lazy"}
          className="absolute inset-0 h-full w-full transition-opacity duration-700"
          style={{ objectFit: fit, opacity: k === i ? 1 : 0 }} />
      ))}

      {arrows && n > 1 && (
        <>
          <button type="button" aria-label="Previous" onClick={() => go(-1)}
            className="absolute left-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-white/80 text-slate-700 shadow hover:bg-white">‹</button>
          <button type="button" aria-label="Next" onClick={() => go(1)}
            className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-white/80 text-slate-700 shadow hover:bg-white">›</button>
        </>
      )}

      {dots && n > 1 && (
        <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
          {images.map((_, k) => (
            <button key={k} type="button" aria-label={`Slide ${k + 1}`} onClick={() => setI(k)}
              className="h-2 w-2 rounded-full transition" style={{ background: k === i ? accent : "rgba(255,255,255,0.7)" }} />
          ))}
        </div>
      )}
    </div>
  );
}
