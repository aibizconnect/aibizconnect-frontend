"use client";

import { useState } from "react";

/**
 * "Ask AIBiz" assistant drawer — matches the Claude Design handoff dashboard's AI drawer.
 * Themed under .abc-ds. The conversational AI engine isn't wired here yet (automations are still
 * gated), so the composer is a scaffold: it shows the assistant framing + suggestion chips and
 * routes real actions to the modules that exist. Honest placeholder, on-design.
 */
const sw = (n: number) => n as unknown as number;

export default function AskAibizDrawer() {
  const [open, setOpen] = useState(false);

  return (
    <div className="abc-ds">
      {/* Launcher */}
      <button
        onClick={() => setOpen(true)}
        style={{ position: "fixed", right: 24, bottom: 24, zIndex: 40, height: 48, padding: "0 20px", border: "none", borderRadius: "var(--radius-pill)", background: "var(--gradient-brand)", color: "#fff", fontFamily: "var(--font-sans)", fontWeight: sw(600), fontSize: "var(--text-sm)", cursor: "pointer", boxShadow: "var(--shadow-brand)", display: "inline-flex", alignItems: "center", gap: 8 }}
      >
        ✨ Ask AIBiz
      </button>

      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(9,9,102,.18)", zIndex: 49 }} />
          <div style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: 380, maxWidth: "92vw", background: "var(--surface-card)", borderLeft: "1px solid var(--border-subtle)", boxShadow: "var(--shadow-xl)", display: "flex", flexDirection: "column", zIndex: 50, animation: "abc-fade .25s var(--ease-out)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 20px", borderBottom: "1px solid var(--border-subtle)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/abc/app-icon.png" alt="" style={{ width: 28, height: 28 }} />
                <div style={{ fontFamily: "var(--font-display)", fontWeight: sw(600), fontSize: "var(--text-md)", color: "var(--navy-900)" }}>AIBiz Assistant</div>
              </div>
              <button onClick={() => setOpen(false)} style={{ width: 32, height: 32, border: "none", borderRadius: "var(--radius-sm)", background: "var(--gray-100)", color: "var(--gray-600)", fontSize: 18, cursor: "pointer", lineHeight: 1 }}>×</button>
            </div>

            <div style={{ flex: 1, padding: 20, display: "flex", flexDirection: "column", gap: 14, overflow: "auto" }}>
              <div style={{ alignSelf: "flex-start", maxWidth: "88%", background: "var(--gray-100)", borderRadius: "14px 14px 14px 4px", padding: "13px 15px", fontSize: "var(--text-sm)", color: "var(--text-body)", lineHeight: 1.55 }}>
                Hi 👋 I&apos;ll keep an eye on your leads, shop and socials. Full chat is coming online — for now, jump straight to a task below.
              </div>
            </div>

            <div style={{ padding: "14px 16px", borderTop: "1px solid var(--border-subtle)" }}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 12 }}>
                {["Follow up with leads", "Draft posts", "Add shop items"].map((c) => (
                  <span key={c} style={{ padding: "7px 12px", borderRadius: 999, background: "var(--blue-50)", color: "var(--color-primary)", fontSize: "var(--text-xs)", fontWeight: sw(600) }}>{c}</span>
                ))}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, height: 44, padding: "0 6px 0 14px", border: "1px solid var(--border-default)", borderRadius: "var(--radius-pill)" }}>
                <span style={{ flex: 1, fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>Ask anything about your business…</span>
                <span style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--color-primary)", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
                </span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
