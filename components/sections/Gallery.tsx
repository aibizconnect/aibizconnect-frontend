"use client";

import { useState } from "react";

/** Image gallery with optional click-to-open lightbox. Client component for the lightbox. */
export default function Gallery({ images, columns = 3, lightbox = true }: { images: { url: string }[]; columns?: number; lightbox?: boolean }) {
  const [open, setOpen] = useState<number | null>(null);
  if (!images.length) return <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-slate-300 text-sm text-slate-400">Add gallery images</div>;
  const cols = Math.max(1, Math.min(6, columns));

  return (
    <>
      <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))` }}>
        {images.map((im, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={i} src={im.url} alt="" loading="lazy"
            onClick={lightbox ? () => setOpen(i) : undefined}
            className={`aspect-square w-full rounded-lg object-cover ${lightbox ? "cursor-zoom-in transition hover:opacity-90" : ""}`} />
        ))}
      </div>

      {lightbox && open !== null && (
        <div role="dialog" aria-modal="true" onClick={() => setOpen(null)}
          className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/80 p-4">
          <button aria-label="Close" className="absolute right-4 top-4 text-3xl text-white/80 hover:text-white" onClick={() => setOpen(null)}>×</button>
          {images.length > 1 && (
            <>
              <button aria-label="Previous" className="absolute left-4 text-4xl text-white/70 hover:text-white" onClick={(e) => { e.stopPropagation(); setOpen((open - 1 + images.length) % images.length); }}>‹</button>
              <button aria-label="Next" className="absolute right-4 text-4xl text-white/70 hover:text-white" onClick={(e) => { e.stopPropagation(); setOpen((open + 1) % images.length); }}>›</button>
            </>
          )}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={images[open].url} alt="" onClick={(e) => e.stopPropagation()} className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain" />
        </div>
      )}
    </>
  );
}
