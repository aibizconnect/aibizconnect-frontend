"use client";

import { useEffect, useRef, useState } from "react";

interface Message {
  role: "user" | "agent";
  text: string;
}

export default function AgentChat({ tenantId }: { tenantId: string }) {
  const [messages, setMessages] = useState<Message[]>([
    { role: "agent", text: "Hello! How can I help you today?" }
  ]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to latest message / token
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streaming]);

  function send() {
    if (!input.trim() || streaming) return;

    const text = input.trim();
    setInput("");
    setError(null);

    // 1. Append user message
    // 2. Append empty agent placeholder — must be in place BEFORE EventSource fires
    setMessages(prev => [
      ...prev,
      { role: "user", text },
      { role: "agent", text: "" }
    ]);

    setStreaming(true);

    const url = `/agent/tenants/${tenantId}/agent/stream?message=${encodeURIComponent(text)}`;
    const eventSource = new EventSource(url);

    eventSource.addEventListener("token", (e: MessageEvent) => {
      try {
        const token: string = JSON.parse(e.data);
        setMessages(prev => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          updated[updated.length - 1] = { ...last, text: last.text + token };
          return updated;
        });
      } catch {
        // Malformed token — skip
      }
    });

    eventSource.addEventListener("done", () => {
      setStreaming(false);
      eventSource.close();
    });

    eventSource.addEventListener("error", () => {
      setStreaming(false);
      eventSource.close();
      setError("Stream interrupted. The agent may be unavailable.");
      setMessages(prev => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        // Only replace placeholder if nothing streamed yet
        if (last.role === "agent" && last.text === "") {
          updated[updated.length - 1] = {
            role: "agent",
            text: "⚠ Could not reach the agent. Please try again."
          };
        }
        return updated;
      });
    });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <div className="flex flex-col h-full max-h-[calc(100vh-6rem)]">
      <h1 className="text-2xl font-bold text-gray-900 mb-4 shrink-0">Agent Console</h1>

      {/* Message thread */}
      <div className="flex-1 overflow-y-auto rounded-xl border border-gray-200 bg-white p-4 space-y-3 mb-4">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                m.role === "user"
                  ? "bg-blue-600 text-white rounded-br-sm"
                  : "bg-gray-100 text-gray-900 rounded-bl-sm"
              }`}
            >
              {m.text}
              {/* Blinking cursor on the active streaming message */}
              {streaming && i === messages.length - 1 && m.role === "agent" && (
                <span className="inline-block w-0.5 h-3.5 bg-gray-500 ml-0.5 animate-pulse align-middle" />
              )}
            </div>
          </div>
        ))}

        {/* Three-dot loader shown only before first token arrives */}
        {streaming && messages[messages.length - 1]?.text === "" && (
          <div className="flex justify-start -mt-1">
            <div className="rounded-2xl rounded-bl-sm bg-gray-100 px-4 py-3">
              <span className="flex gap-1 items-center">
                <span className="h-1.5 w-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:0ms]" />
                <span className="h-1.5 w-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:150ms]" />
                <span className="h-1.5 w-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:300ms]" />
              </span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {error && (
        <p className="text-xs text-red-500 mb-2 shrink-0">{error}</p>
      )}

      {/* Input bar */}
      <div className="flex gap-2 shrink-0">
        <input
          className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask your agent something... (Enter to send)"
          disabled={streaming}
        />
        <button
          onClick={send}
          disabled={streaming || !input.trim()}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {streaming ? "Streaming..." : "Send"}
        </button>
      </div>
    </div>
  );
}
