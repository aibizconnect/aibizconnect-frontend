"use client";

import { useState } from "react";
import { v } from "./Shell";

/** Accordion FAQ (shared). First item open by default. */
export default function Faq({ items }: { items: { q: string; a: string }[] }) {
  const [open, setOpen] = useState(0);
  return (
    <div style={{ maxWidth: 760, margin: "40px auto 0", display: "grid", gap: 12 }}>
      {items.map((it, i) => {
        const isOpen = open === i;
        return (
          <div key={it.q} style={{ background: v("--surface-card"), border: `1px solid ${v("--border-subtle")}`, borderRadius: v("--radius-lg"), boxShadow: v("--shadow-xs"), overflow: "hidden" }}>
            <button type="button" onClick={() => setOpen(isOpen ? -1 : i)} className="flex w-full items-center justify-between gap-4"
              style={{ background: "transparent", border: "none", cursor: "pointer", textAlign: "left", padding: "18px 20px", fontFamily: v("--font-display"), fontWeight: 600, fontSize: v("--text-md"), color: v("--text-strong") }}>
              {it.q}
              <span style={{ flex: "none", color: v("--color-primary"), fontSize: 20, transform: isOpen ? "rotate(45deg)" : "none", transition: "transform var(--dur-base) var(--ease-out)" }}>+</span>
            </button>
            {isOpen && <p style={{ padding: "0 20px 20px", fontSize: v("--text-sm"), color: v("--text-body"), lineHeight: 1.65 }}>{it.a}</p>}
          </div>
        );
      })}
    </div>
  );
}
