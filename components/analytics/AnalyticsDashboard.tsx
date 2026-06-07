"use client";

import { useEffect, useState } from "react";

interface AnalyticsData {
  sms_volume?: number;
  stripe_events?: number;
  error_rate?: number | string;
  memory_entries?: number;
  trigger_events_by_provider?: Record<string, number>;
  workflow_runs_per_day?: Record<string, number>;
  [key: string]: unknown;
}

function StatCard({ title, value }: { title: string; value: number | string | undefined }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <p className="text-sm text-gray-500 mb-1">{title}</p>
      <p className="text-3xl font-bold text-gray-900">
        {value ?? <span className="text-gray-300">—</span>}
      </p>
    </div>
  );
}

function DataTable({ title, data }: { title: string; data?: Record<string, number> }) {
  const entries = Object.entries(data ?? {});
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">{title}</h2>
      {entries.length === 0 ? (
        <p className="text-sm text-gray-400">No data.</p>
      ) : (
        <table className="w-full text-sm">
          <tbody>
            {entries.map(([key, val]) => (
              <tr key={key} className="border-t border-gray-100">
                <td className="py-2 text-gray-600">{key}</td>
                <td className="py-2 text-right font-mono font-medium text-gray-900">{val}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default function AnalyticsDashboard({
  tenantId,
  initialData
}: {
  tenantId: string;
  initialData: AnalyticsData;
}) {
  const [data, setData] = useState<AnalyticsData>(initialData ?? {});
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/agent/tenants/${tenantId}/analytics`, {
          cache: "no-store"
        });
        if (res.ok) {
          setData(await res.json());
          setLastUpdated(new Date());
        }
      } catch {
        // silently retry next tick
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [tenantId]);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
        <span className="text-xs text-gray-400">
          Last updated: {lastUpdated.toLocaleTimeString()}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard title="SMS Volume" value={data.sms_volume} />
        <StatCard title="Stripe Events" value={data.stripe_events} />
        <StatCard title="Error Rate" value={data.error_rate} />
        <StatCard title="Memory Entries" value={data.memory_entries} />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <DataTable
          title="Trigger Events by Provider"
          data={data.trigger_events_by_provider}
        />
        <DataTable
          title="Workflow Runs Per Day"
          data={data.workflow_runs_per_day}
        />
      </div>
    </div>
  );
}
