"use client";

import { useEffect, useRef, useState } from "react";

export default function LiveAgentLogs({
  tenantId,
  runId
}: {
  tenantId: string;
  runId: string;
}) {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;

    async function poll() {
      try {
        const res = await fetch(
          `/tenants/${tenantId}/audit?type=live_logs&runId=${runId}`
        );
        const data = await res.json();

        if (active) {
          setLogs(data.logs || []);
          setLoading(false);
        }
      } catch (err) {
        console.error(err);
      }

      if (active) {
        setTimeout(poll, 1500); // poll every 1.5s
      }
    }

    poll();

    return () => {
      active = false;
    };
  }, [tenantId, runId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  if (loading) {
    return (
      <div style={{ padding: 16, opacity: 0.6 }}>Loading live logs…</div>
    );
  }

  return (
    <div
      style={{
        marginTop: 32,
        padding: 24,
        border: "1px solid #ddd",
        borderRadius: 8,
        maxHeight: 400,
        overflowY: "auto",
        background: "#fafafa"
      }}
    >
      <h2 style={{ marginBottom: 16 }}>Live Agent Logs</h2>

      {logs.length === 0 && (
        <div style={{ opacity: 0.6 }}>No logs yet.</div>
      )}

      {logs.map((log, i) => (
        <LogLine key={i} log={log} />
      ))}

      <div ref={bottomRef} />
    </div>
  );
}

function LogLine({ log }: { log: any }) {
  const color =
    log.agent === "architect"
      ? "#4f46e5"
      : log.agent === "builder"
      ? "#0ea5e9"
      : log.agent === "reviewer"
      ? "#10b981"
      : log.agent === "merge"
      ? "#f59e0b"
      : log.agent === "test"
      ? "#ef4444"
      : "#6b7280";

  return (
    <div style={{ marginBottom: 8 }}>
      <span style={{ color, fontWeight: 600 }}>
        [{log.agent?.toUpperCase() || "SYSTEM"}]
      </span>{" "}
      <span style={{ opacity: 0.8 }}>{log.message}</span>
      {log.timestamp && (
        <div style={{ fontSize: 11, opacity: 0.5 }}>
          {log.timestamp}
        </div>
      )}
    </div>
  );
}
