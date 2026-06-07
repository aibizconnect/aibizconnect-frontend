"use client";

import { useEffect, useState } from "react";

interface WorkflowRun {
  id: string;
  workflow_name: string;
  status: string;
  created_at: string;
  error?: string;
}

const statusColors: Record<string, string> = {
  completed: "bg-green-100 text-green-700",
  running: "bg-blue-100 text-blue-700",
  pending: "bg-yellow-100 text-yellow-700",
  failed: "bg-red-100 text-red-700"
};

export default function WorkflowRuns({
  tenantId,
  initialRuns
}: {
  tenantId: string;
  initialRuns: WorkflowRun[];
}) {
  const [runs, setRuns] = useState<WorkflowRun[]>(initialRuns);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        // Route through the Next.js reverse proxy — avoids exposing backend URL
        // or auth tokens to the browser directly
        const res = await fetch(`/agent/tenants/${tenantId}/workflow-runs`, {
          cache: "no-store"
        });
        if (res.ok) {
          const data = await res.json();
          setRuns(data);
          setLastUpdated(new Date());
        }
      } catch {
        // silently retry next tick
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [tenantId]);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-900">Workflow Status</h1>
        <span className="text-xs text-gray-400">
          Last updated: {lastUpdated.toLocaleTimeString()}
        </span>
      </div>

      {runs.length === 0 && (
        <p className="text-gray-500 text-sm">No workflow runs found.</p>
      )}

      <ul className="space-y-3">
        {runs.map(run => (
          <li key={run.id} className="p-4 bg-white rounded-lg border border-gray-200">
            <div className="flex items-center justify-between mb-1">
              <span className="font-semibold text-gray-900">{run.workflow_name}</span>
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  statusColors[run.status] ?? "bg-gray-100 text-gray-600"
                }`}
              >
                {run.status}
              </span>
            </div>
            <div className="text-xs text-gray-400">
              Started: {new Date(run.created_at).toLocaleString()}
            </div>
            {run.error && (
              <div className="mt-2 text-sm text-red-600 bg-red-50 rounded p-2">
                Error: {run.error}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
