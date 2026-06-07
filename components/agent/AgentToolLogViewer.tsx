"use client";

import { useEffect, useState } from "react";

interface ToolLog {
  id: string;
  tool_name: string;
  status: string;
  created_at: string;
  input?: unknown;
  output?: unknown;
}

export default function AgentToolLogViewer({ tenantId }: { tenantId: string }) {
  const [logs, setLogs] = useState<ToolLog[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      const res = await fetch(`/agent/tenants/${tenantId}/agent/tools/logs`, {
        cache: "no-store"
      });
      if (res.ok) {
        setLogs(await res.json());
        setLastUpdated(new Date());
      }
    } catch {
      setError("Failed to load tool logs.");
    }
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, [tenantId]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Agent Tool Execution Logs</h1>
        <span className="text-xs text-gray-400">
          Last updated: {lastUpdated.toLocaleTimeString()}
        </span>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
      )}

      {logs.length === 0 && !error && (
        <p className="text-sm text-gray-400">No tool execution logs found.</p>
      )}

      <ul className="space-y-3">
        {logs.map(log => (
          <li key={log.id} className="rounded-lg border border-gray-200 bg-white p-4 space-y-3">
            <div className="flex items-start justify-between gap-4">
              <span className="font-semibold text-gray-900">{log.tool_name}</span>
              <div className="flex items-center gap-3 shrink-0">
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    log.status === "success"
                      ? "bg-green-100 text-green-700"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  {log.status}
                </span>
                <span className="text-xs text-gray-400">
                  {new Date(log.created_at).toLocaleString()}
                </span>
              </div>
            </div>

            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Input</p>
              <pre className="text-xs bg-gray-50 rounded-lg border border-gray-100 p-3 overflow-auto max-h-32">
                {JSON.stringify(log.input, null, 2)}
              </pre>
            </div>

            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Output</p>
              <pre className="text-xs bg-gray-50 rounded-lg border border-gray-100 p-3 overflow-auto max-h-32">
                {JSON.stringify(log.output, null, 2)}
              </pre>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
