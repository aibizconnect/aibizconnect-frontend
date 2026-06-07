"use client";

import { useEffect, useState } from "react";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

export default function AgentActivityGraphs({ tenantId }: { tenantId: string }) {
  const [activity, setActivity] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/tenants/${tenantId}/audit?window=24h`);
        const data = await res.json();

        const logs = data.logs || [];

        const counts = {
          architect: 0,
          builder: 0,
          reviewer: 0,
          merge: 0,
          tester: 0
        };

        for (const log of logs) {
          const event = log.event || "";

          if (event.includes("architect")) counts.architect++;
          if (event.includes("builder")) counts.builder++;
          if (event.includes("reviewer")) counts.reviewer++;
          if (event.includes("merge")) counts.merge++;
          if (event.includes("test")) counts.tester++;
        }

        setActivity(counts);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [tenantId]);

  if (loading) return <div>Loading agent activity…</div>;
  if (!activity) return <div>No activity found.</div>;

  const data = {
    labels: ["Architect", "Builder", "Reviewer", "Merge", "Tester"],
    datasets: [
      {
        label: "Activity (last 24h)",
        data: [
          activity.architect,
          activity.builder,
          activity.reviewer,
          activity.merge,
          activity.tester
        ],
        backgroundColor: [
          "#4F46E5",
          "#0EA5E9",
          "#10B981",
          "#F59E0B",
          "#EF4444"
        ]
      }
    ]
  };

  return (
    <div style={{ padding: 24, border: "1px solid #ddd", borderRadius: 8 }}>
      <h2 style={{ marginBottom: 16 }}>Agent Activity (Last 24 Hours)</h2>
      <Bar data={data} />
    </div>
  );
}
