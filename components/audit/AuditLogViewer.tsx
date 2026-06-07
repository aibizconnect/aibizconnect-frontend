"use client";

import { useEffect, useState } from "react";

interface AuditLog {
  id: string;
  action: string;
  created_at: string;
  details?: Record<string, unknown>;
}

const actionColors: Record<string, string> = {
  create: "bg-green-100 text-green-700",
  update: "bg-blue-100 text-blue-700",
  delete: "bg-red-100 text-red-700",
  invite: "bg-purple-100 text-purple-700",
  login: "bg-gray-100 text-gray-600"
};

function actionBadgeClass(action: string) {
  const key = Object.keys(actionColors).find(k => action.toLowerCase().includes(k));
  return key ? actionColors[key] : "bg-gray-100 text-gray-600";
}

export default function AuditLogViewer({
  tenantId,
  initialLogs
}: {
  tenantId: string;
  initialLogs: AuditLog[];
}) {
  const [logs, setLogs] = useState<AuditLog[]>(initialLogs ?? []);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/agent/tenants/${tenantId}/audit`, {
          cache: "no-store"
        });
        if (res.ok) {
          setLogs(await res.json());
          setLastUpdated(new Date());
        }
      } catch {
        // silently retry next tick
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [tenantId]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Audit Logs</h1>
        <span className="text-xs text-gray-400">
          Last updated: {lastUpdated.toLocaleTimeString()}
        </span>
      </div>

      {logs.length === 0 && (
        <p className="text-sm text-gray-400">No audit events recorded yet.</p>
      )}

      <ul className="space-y-3">
        {logs.map(log => (
          <li key={log.id} className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="flex items-start justify-between gap-4 mb-2">
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${actionBadgeClass(log.action)}`}>
                {log.action}
              </span>
              <span className="text-xs text-gray-400 shrink-0">
                {new Date(log.created_at).toLocaleString()}
              </span>
            </div>
            {log.details && Object.keys(log.details).length > 0 && (
              <pre className="mt-2 text-xs bg-gray-50 rounded-lg border border-gray-100 p-3 overflow-auto max-h-40">
                {JSON.stringify(log.details, null, 2)}
              </pre>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
