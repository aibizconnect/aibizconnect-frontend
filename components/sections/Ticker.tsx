"use client";

/**
 * Ticker / scrolling marquee (stock-ticker / news-ticker / announcement style). Continuously scrolls
 * a row of text items. Pure CSS animation (no JS loop), pauses on hover. Client component so the
 * scoped keyframes ship with it.
 */
export default function Ticker({
  items, speed = 30, bg = "#0f172a", color = "#e2e8f0", separator = "•", direction = "left",
}: {
  items: { text: string }[];
  speed?: number; bg?: string; color?: string; separator?: string; direction?: "left" | "right";
}) {
  const row = items.map((it) => it.text).filter(Boolean);
  if (!row.length) return <div className="rounded-lg border border-dashed border-slate-300 p-3 text-center text-sm text-slate-400">Add ticker items in the inspector.</div>;
  const duration = Math.max(8, Math.round(1400 / Math.max(5, speed))); // higher speed → shorter duration
  const doubled = [...row, ...row]; // duplicated for a seamless loop

  return (
    <div className="abc-ticker-wrap" style={{ background: bg, color }}>
      <div className="abc-ticker-track" style={{ animationDuration: `${duration}s`, animationDirection: direction === "right" ? "reverse" : "normal" }}>
        {doubled.map((t, i) => (
          <span key={i} className="abc-ticker-item">{t}<span className="abc-ticker-sep">{separator}</span></span>
        ))}
      </div>
      <style>{`
        .abc-ticker-wrap{overflow:hidden;white-space:nowrap;padding:10px 0;border-radius:8px}
        .abc-ticker-track{display:inline-flex;white-space:nowrap;animation-name:abc-ticker;animation-timing-function:linear;animation-iteration-count:infinite;will-change:transform}
        .abc-ticker-wrap:hover .abc-ticker-track{animation-play-state:paused}
        .abc-ticker-item{display:inline-flex;align-items:center;font-weight:600;font-size:14px;padding:0 4px}
        .abc-ticker-sep{opacity:.5;padding:0 14px}
        @keyframes abc-ticker{from{transform:translateX(0)}to{transform:translateX(-50%)}}
      `}</style>
    </div>
  );
}
