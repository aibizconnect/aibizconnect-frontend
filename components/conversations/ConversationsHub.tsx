"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { listThreadsAction, openThreadAction, replyAction } from "@/app/tenants/[tenantId]/conversations/actions";
import type { ThreadSummary, ConvMessage, Channel } from "@/lib/server/conversations";

/**
 * Unified inbox (D-300) — GHL "Conversations". Thread list (left) + conversation pane (right)
 * + composer. Channel filter across SMS / Email / Webchat. Inbound SMS lands here via the
 * Twilio webhook; outbound 1:1 replies send through the tenant's connected channel.
 */

const CHANNELS: { key: Channel | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "sms", label: "SMS" },
  { key: "email", label: "Email" },
  { key: "facebook", label: "Messenger" },
  { key: "instagram", label: "Instagram" },
  { key: "whatsapp", label: "WhatsApp" },
  { key: "webchat", label: "Web chat" },
];

const BUBBLE = "M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.5 8.5 0 0 1-3.8-.9L3 21l1.9-5.7A8.5 8.5 0 0 1 4 11.5 8.38 8.38 0 0 1 12.5 3 8.38 8.38 0 0 1 21 11.5Z";
const CHANNEL_META: Record<Channel, { label: string; icon: string; tint: string }> = {
  sms: { label: "SMS", icon: BUBBLE, tint: "bg-emerald-100 text-emerald-700" },
  email: { label: "Email", icon: "M4 4h16v16H4zM22 6l-10 7L2 6", tint: "bg-sky-100 text-sky-700" },
  webchat: { label: "Web chat", icon: "M8 12h.01M12 12h.01M16 12h.01M21 12a9 9 0 0 1-9 9 8.96 8.96 0 0 1-4-.94L3 21l1.06-3A8.96 8.96 0 0 1 3 12a9 9 0 1 1 18 0Z", tint: "bg-violet-100 text-violet-700" },
  facebook: { label: "Messenger", icon: BUBBLE, tint: "bg-blue-100 text-blue-700" },
  instagram: { label: "Instagram", icon: "M3 8a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z", tint: "bg-pink-100 text-pink-700" },
  whatsapp: { label: "WhatsApp", icon: BUBBLE, tint: "bg-green-100 text-green-700" },
};

function initials(name: string): string {
  const p = name.trim().split(/\s+/).filter(Boolean);
  if (!p.length) return "?";
  return ((p[0][0] || "") + (p.length > 1 ? p[p.length - 1][0] : "")).toUpperCase();
}
function relTime(iso: string): string {
  const d = new Date(iso).getTime();
  if (!d) return "";
  const s = Math.floor((Date.now() - d) / 1000);
  if (s < 60) return "now";
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  if (s < 604800) return `${Math.floor(s / 86400)}d`;
  return new Date(iso).toLocaleDateString();
}

function ChannelIcon({ channel, className = "h-4 w-4" }: { channel: Channel; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d={CHANNEL_META[channel].icon} />
    </svg>
  );
}

export default function ConversationsHub({ tenantId, initial }: { tenantId: string; initial: ThreadSummary[] }) {
  const [filter, setFilter] = useState<Channel | "all">("all");
  const [threads, setThreads] = useState<ThreadSummary[]>(initial);
  const [activeId, setActiveId] = useState<string | null>(initial[0]?.id ?? null);
  const [messages, setMessages] = useState<ConvMessage[]>([]);
  const [loadingThread, setLoadingThread] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [sendErr, setSendErr] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const visible = useMemo(
    () => (filter === "all" ? threads : threads.filter((t) => t.channel === filter)),
    [threads, filter],
  );
  const active = useMemo(() => threads.find((t) => t.id === activeId) ?? null, [threads, activeId]);

  async function refreshThreads() {
    try { setThreads(await listThreadsAction(tenantId)); } catch { /* offline */ }
  }

  async function openThread(id: string) {
    setActiveId(id);
    setSendErr(null);
    setLoadingThread(true);
    try {
      const t = await openThreadAction(tenantId, id);
      setMessages(t?.messages ?? []);
      // opening clears unread locally too
      setThreads((prev) => prev.map((x) => (x.id === id ? { ...x, unreadCount: 0 } : x)));
    } finally {
      setLoadingThread(false);
    }
  }

  // Load the first thread on mount.
  useEffect(() => {
    if (activeId) void openThread(activeId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-scroll to newest message.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, loadingThread]);

  // Light polling so inbound replies appear without a manual refresh.
  useEffect(() => {
    const t = setInterval(() => { void refreshThreads(); }, 20000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId]);

  async function send() {
    if (!activeId || !draft.trim() || sending) return;
    setSending(true);
    setSendErr(null);
    const body = draft.trim();
    try {
      const res = await replyAction(tenantId, activeId, body);
      if (!res.ok) setSendErr(res.error ?? "Could not send.");
      else setDraft("");
      if (res.thread) {
        setMessages(res.thread.messages);
        // bump this thread to top with new preview
        setThreads((prev) => {
          const updated = prev.map((x) => (x.id === activeId ? res.thread!.thread : x));
          return [...updated].sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt));
        });
      }
    } finally {
      setSending(false);
    }
  }

  const totalUnread = threads.reduce((s, t) => s + (t.unreadCount || 0), 0);

  return (
    <div className="flex h-[calc(100vh-0px)] flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold text-slate-900">
            Conversations
            {totalUnread > 0 && <span className="rounded-full bg-blue-600 px-2 py-0.5 text-xs font-semibold text-white">{totalUnread}</span>}
          </h1>
          <p className="text-sm text-slate-500">Every SMS, email, and web-chat thread in one inbox.</p>
        </div>
        <div className="flex gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1">
          {CHANNELS.map((c) => (
            <button key={c.key} onClick={() => setFilter(c.key)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${filter === c.key ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        {/* Thread list */}
        <div className="flex w-[340px] shrink-0 flex-col border-r border-slate-200">
          <div className="min-h-0 flex-1 overflow-y-auto">
            {visible.length === 0 ? (
              <div className="px-6 py-16 text-center text-sm text-slate-400">
                <p className="font-medium text-slate-500">No conversations yet</p>
                <p className="mt-1">When a contact texts your connected number, the thread shows up here.</p>
              </div>
            ) : (
              visible.map((t) => {
                const on = t.id === activeId;
                return (
                  <button key={t.id} onClick={() => openThread(t.id)}
                    className={`flex w-full items-start gap-3 border-b border-slate-100 px-4 py-3 text-left transition ${on ? "bg-blue-50" : "hover:bg-slate-50"}`}>
                    <span className="relative grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-slate-200 to-slate-300 text-sm font-semibold text-slate-700">
                      {initials(t.contactName)}
                      <span className={`absolute -bottom-0.5 -right-0.5 grid h-4 w-4 place-items-center rounded-full ring-2 ring-white ${CHANNEL_META[t.channel].tint}`}>
                        <ChannelIcon channel={t.channel} className="h-2.5 w-2.5" />
                      </span>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className={`truncate text-sm ${t.unreadCount ? "font-semibold text-slate-900" : "font-medium text-slate-700"}`}>{t.contactName}</span>
                        <span className="shrink-0 text-[11px] text-slate-400">{relTime(t.lastMessageAt)}</span>
                      </span>
                      <span className="mt-0.5 flex items-center gap-2">
                        <span className={`truncate text-xs ${t.unreadCount ? "text-slate-700" : "text-slate-400"}`}>{t.lastPreview || "—"}</span>
                        {t.unreadCount > 0 && <span className="ml-auto grid h-4 min-w-4 shrink-0 place-items-center rounded-full bg-blue-600 px-1 text-[10px] font-semibold text-white">{t.unreadCount}</span>}
                      </span>
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Conversation pane */}
        <div className="flex min-w-0 flex-1 flex-col bg-slate-50">
          {!active ? (
            <div className="grid flex-1 place-items-center text-sm text-slate-400">Select a conversation</div>
          ) : (
            <>
              <div className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3">
                <div className="flex items-center gap-3">
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-slate-200 to-slate-300 text-sm font-semibold text-slate-700">{initials(active.contactName)}</span>
                  <div>
                    <div className="text-sm font-semibold text-slate-900">{active.contactName}</div>
                    <div className="flex items-center gap-1 text-xs text-slate-500"><ChannelIcon channel={active.channel} className="h-3 w-3" />{CHANNEL_META[active.channel].label}</div>
                  </div>
                </div>
              </div>

              <div ref={scrollRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-6 py-5">
                {loadingThread ? (
                  <div className="grid h-full place-items-center text-sm text-slate-400">Loading…</div>
                ) : messages.length === 0 ? (
                  <div className="grid h-full place-items-center text-sm text-slate-400">No messages in this thread yet.</div>
                ) : (
                  messages.map((m) => {
                    const out = m.direction === "outbound";
                    return (
                      <div key={m.id} className={`flex ${out ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm shadow-sm ${out ? "bg-blue-600 text-white" : "bg-white text-slate-800 ring-1 ring-slate-200"}`}>
                          {m.subject && <div className={`mb-1 text-xs font-semibold ${out ? "text-blue-100" : "text-slate-500"}`}>{m.subject}</div>}
                          <div className="whitespace-pre-wrap break-words">{m.body}</div>
                          <div className={`mt-1 text-[10px] ${out ? "text-blue-200" : "text-slate-400"}`}>
                            {relTime(m.createdAt)}{out && m.status === "failed" ? " · failed" : ""}{out && m.senderName ? ` · ${m.senderName}` : ""}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Composer */}
              <div className="border-t border-slate-200 bg-white px-4 py-3">
                {sendErr && <div className="mb-2 rounded-md bg-rose-50 px-3 py-1.5 text-xs text-rose-700">{sendErr}</div>}
                <div className="flex items-end gap-2">
                  <textarea
                    value={draft} onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); void send(); } }}
                    rows={2} placeholder={active.channel === "webchat" ? "Web-chat replies aren't deliverable yet — use SMS or email" : `Reply by ${CHANNEL_META[active.channel].label}…`}
                    disabled={active.channel === "webchat"}
                    className="min-h-[44px] flex-1 resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50 disabled:text-slate-400" />
                  <button onClick={() => void send()} disabled={sending || !draft.trim() || active.channel === "webchat"}
                    className="grid h-11 shrink-0 place-items-center rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-40">
                    {sending ? "Sending…" : "Send"}
                  </button>
                </div>
                <p className="mt-1 text-[11px] text-slate-400">Direct 1:1 reply · ⌘/Ctrl+Enter to send</p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
