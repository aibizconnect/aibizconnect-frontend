"use client";

import { useState } from "react";

/** Tabbed content (GHL parity). Click a tab to reveal its panel. Client component for interactivity. */
export default function Tabs({ tabs, accent, text }: { tabs: { label: string; content: string }[]; accent?: string; text?: string }) {
  const [active, setActive] = useState(0);
  if (!tabs.length) return <div className="rounded-lg border border-dashed border-slate-300 p-4 text-center text-sm text-slate-400">Add tabs in the inspector.</div>;
  const cur = tabs[Math.min(active, tabs.length - 1)];
  return (
    <div>
      <div role="tablist" className="flex flex-wrap gap-1 border-b border-slate-200">
        {tabs.map((t, i) => {
          const on = i === active;
          return (
            <button key={i} type="button" role="tab" aria-selected={on} onClick={() => setActive(i)}
              className="-mb-px border-b-2 px-4 py-2 text-sm font-medium transition"
              style={on ? { borderColor: accent ?? "#1e3a8a", color: accent ?? "#1e3a8a" } : { borderColor: "transparent", color: "#64748b" }}>
              {t.label || `Tab ${i + 1}`}
            </button>
          );
        })}
      </div>
      <div role="tabpanel" className="whitespace-pre-line py-4 text-sm leading-relaxed" style={{ color: text ?? "#334155" }}>{cur?.content}</div>
    </div>
  );
}
