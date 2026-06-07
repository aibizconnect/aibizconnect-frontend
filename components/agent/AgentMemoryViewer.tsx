"use client";

import { useEffect, useState } from "react";

interface MemoryEntry {
  id: string;
  type: string;
  created_at: string;
  data?: Record<string, unknown>;
}

export default function AgentMemoryViewer({ tenantId }: { tenantId: string }) {
  const [entries, setEntries] = useState<MemoryEntry[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      const res = await fetch(`/agent/tenants/${tenantId}/agent/memory`, {
        cache: "no-store"
      });
      if (res.ok) {
        setEntries(await res.json());
        setLastUpdated(new Date());
      }
    } catch {
      setError("Failed to load memory entries.");
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
        <h1 className="text-2xl font-bold text-gray-900">Agent Memory</h1>
        <span className="text-xs text-gray-400">
          Last updated: {lastUpdated.toLocaleTimeString()}
        </span>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
      )}

      {entries.length === 0 && !error && (
        <p className="text-sm text-gray-400">No memory entries found.</p>
      )}

      <ul className="space-y-3">
        {entries.map(entry => (
          <li key={entry.id} className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="flex items-start justify-between gap-4 mb-2">
              <span className="text-sm font-semibold text-gray-900">{entry.type}</span>
              <span className="text-xs text-gray-400 shrink-0">
                {new Date(entry.created_at).toLocaleString()}
              </span>
            </div>
            {entry.data && Object.keys(entry.data).length > 0 && (
              <pre className="text-xs bg-gray-50 rounded-lg border border-gray-100 p-3 overflow-auto max-h-40">
                {JSON.stringify(entry.data, null, 2)}
              </pre>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
