"use client";

import { useEffect, useRef, useState } from "react";

type Item = { name: string; role?: string; quote: string; avatarUrl?: string };

/** Rotating testimonials carousel — one at a time, autoplay, dots, pause on hover. */
export default function TestimonialsCarousel({ items, accent = "#1e3a8a" }: { items: Item[]; accent?: string }) {
  const [i, setI] = useState(0);
  const n = items.length;
  const paused = useRef(false);
  useEffect(() => {
    if (n <= 1) return;
    const id = setInterval(() => { if (!paused.current) setI((x) => (x + 1) % n); }, 5000);
    return () => clearInterval(id);
  }, [n]);
  if (!n) return null;
  const t = items[Math.min(i, n - 1)];

  return (
    <div className="mx-auto max-w-2xl text-center" onMouseEnter={() => { paused.current = true; }} onMouseLeave={() => { paused.current = false; }}>
      <blockquote className="text-lg leading-relaxed opacity-90">“{t.quote}”</blockquote>
      <div className="mt-5 flex items-center justify-center gap-3">
        {t.avatarUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={t.avatarUrl} alt={t.name} className="h-12 w-12 rounded-full object-cover" />
        )}
        <div className="text-left">
          <div className="font-semibold">{t.name}</div>
          {t.role && <div className="text-sm opacity-60">{t.role}</div>}
        </div>
      </div>
      {n > 1 && (
        <div className="mt-5 flex justify-center gap-1.5">
          {items.map((_, k) => (
            <button key={k} aria-label={`Testimonial ${k + 1}`} onClick={() => setI(k)}
              className="h-2 w-2 rounded-full transition" style={{ background: k === i ? accent : "#cbd5e1" }} />
          ))}
        </div>
      )}
    </div>
  );
}
