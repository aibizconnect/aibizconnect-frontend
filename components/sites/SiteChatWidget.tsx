"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Floating AI chat widget for PUBLIC tenant sites (D-275). Site chrome (not a Tree
 * element): rendered by the public page when the tenant has an enabled agent with the
 * webchat channel on. Talks to /api/agent-chat, which enforces the anonymous-safe
 * toolset (availability + booking + become-a-lead only). Transcript survives page
 * navigation via sessionStorage.
 */

interface Msg { role: "user" | "agent"; text: string }
export interface ChatWidgetLook { position: "bottom-right" | "bottom-left"; color: string; greeting: string; size: "compact" | "standard" | "large" }

const BUBBLE_PX = { compact: 48, standard: 56, large: 64 } as const;

export default function SiteChatWidget({ tenantId, agentId, agentName, brandColor, look }: {
  tenantId: string; agentId: string; agentName: string; brandColor?: string | null; look?: ChatWidgetLook | null;
}) {
  // The tenant decides look + position (D-276); brand primary is only the default.
  const own = look?.color && /^#[0-9a-fA-F]{6}$/.test(look.color) ? look.color : null;
  const color = own ?? (brandColor && /^#[0-9a-fA-F]{6}$/.test(brandColor) ? brandColor : "#1e3a8a");
  const onLeft = look?.position === "bottom-left";
  const bubble = BUBBLE_PX[look?.size ?? "standard"];
  const greeting = look?.greeting?.trim() || "Hi! I can answer questions and book appointments. How can I help?";
  const storeKey = `abc-chat-${agentId}`;
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try { const saved = sessionStorage.getItem(storeKey); if (saved) setMessages(JSON.parse(saved)); } catch { /* ignore */ }
  }, [storeKey]);
  useEffect(() => {
    try { sessionStorage.setItem(storeKey, JSON.stringify(messages.slice(-40))); } catch { /* ignore */ }
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, storeKey]);

  const send = async () => {
    const text = input.trim();
    if (!text || busy) return;
    setInput(""); setError("");
    const next: Msg[] = [...messages, { role: "user", text }];
    setMessages(next);
    setBusy(true);
    try {
      const res = await fetch("/api/agent-chat", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ tenantId, agentId, messages: next.slice(-20) }),
      });
      const j = await res.json();
      if (!res.ok) setError(j.error ?? "Something went wrong — please try again.");
      else if (j.reply) setMessages((p) => [...p, { role: "agent", text: j.reply }]);
    } catch { setError("Connection problem — please try again."); }
    finally { setBusy(false); }
  };

  return (
    <div style={{ position: "fixed", ...(onLeft ? { left: 20 } : { right: 20 }), bottom: 20, zIndex: 9999, fontFamily: "system-ui, sans-serif" }}>
      {open && (
        <div style={{ width: 340, height: 460, marginBottom: 12, display: "flex", flexDirection: "column", background: "#fff", borderRadius: 16, boxShadow: "0 12px 40px rgba(0,0,0,.18)", overflow: "hidden", border: "1px solid #e2e8f0" }}>
          <div style={{ background: color, color: "#fff", padding: "12px 16px" }}>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{agentName}</div>
            <div style={{ fontSize: 11, opacity: 0.85 }}>AI assistant — ask anything or book a time</div>
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: 12, background: "#f8fafc" }}>
            {messages.length === 0 && (
              <div style={{ textAlign: "center", color: "#94a3b8", fontSize: 13, padding: "40px 12px" }}>
                {greeting}
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} style={{ textAlign: m.role === "user" ? "right" : "left", marginBottom: 8 }}>
                <span style={{
                  display: "inline-block", maxWidth: "85%", padding: "8px 12px", borderRadius: 14, fontSize: 13, lineHeight: 1.45,
                  whiteSpace: "pre-wrap", textAlign: "left",
                  background: m.role === "user" ? color : "#fff", color: m.role === "user" ? "#fff" : "#0f172a",
                  border: m.role === "user" ? "none" : "1px solid #e2e8f0",
                }}>{m.text}</span>
              </div>
            ))}
            {busy && <div style={{ color: "#94a3b8", fontSize: 12 }}>typing…</div>}
            {error && <div style={{ color: "#dc2626", fontSize: 12, marginTop: 4 }}>{error}</div>}
            <div ref={endRef} />
          </div>
          <div style={{ display: "flex", gap: 8, padding: 10, borderTop: "1px solid #e2e8f0", background: "#fff" }}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="Type a message…"
              style={{ flex: 1, border: "1px solid #cbd5e1", borderRadius: 10, padding: "8px 10px", fontSize: 13, outline: "none" }}
            />
            <button onClick={send} disabled={busy}
              style={{ background: color, color: "#fff", border: "none", borderRadius: 10, padding: "8px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer", opacity: busy ? 0.6 : 1 }}>
              Send
            </button>
          </div>
        </div>
      )}
      <button onClick={() => setOpen((v) => !v)} aria-label={open ? "Close chat" : "Chat with us"}
        style={{ display: "flex", alignItems: "center", justifyContent: "center", width: bubble, height: bubble, borderRadius: "50%", background: color, color: "#fff", border: "none", boxShadow: "0 8px 24px rgba(0,0,0,.22)", cursor: "pointer", float: onLeft ? "left" : "right" }}>
        {open ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M4 4h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H8.8L5 20.6A1 1 0 0 1 3.4 19.8V6a2 2 0 0 1 .6-1.4A2 2 0 0 1 4 4z" /></svg>
        )}
      </button>
    </div>
  );
}
