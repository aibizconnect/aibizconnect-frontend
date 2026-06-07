import { useEffect, useState } from "react";

type RunSummary = {
  id: string;
  status: string;
  startedAt: string;
  finishedAt?: string;
  agentCount?: number;
  errorCount?: number;
};

export default function Dashboard({ tenantId }: { tenantId: string }) {
  const [runs, setRuns] = useState<RunSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(
          `/tenants/${tenantId}/audit?type=recent_runs`
        );
        const data = await res.json();
        setRuns(data.runs || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [tenantId]);

  async function runFullWorkflow() {
    try {
      setRunning(true);
      const res = await fetch(
        `/tenants/${tenantId}/workflows/full`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            input: {
              goal: "Generate and review a new feature",
              context: "Demo run from dashboard"
            }
          })
        }
      );
      const data = await res.json();
      console.log("Started workflow:", data);
    } catch (err) {
      console.error(err);
    } finally {
      setRunning(false);
    }
  }

  return (
    <div style={{ padding: 32, fontFamily: "Inter, sans-serif" }}>
      <h1 style={{ marginBottom: 8 }}>AI Workflow Dashboard</h1>
      <div style={{ opacity: 0.7, marginBottom: 24 }}>
        Tenant: <strong>{tenantId}</strong>
      </div>

      {/* Quick actions */}
      <section
        style={{
          marginBottom: 32,
          padding: 24,
          border: "1px solid #ddd",
          borderRadius: 8,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}
      >
        <div>
          <h2 style={{ marginBottom: 8 }}>Quick Actions</h2>
          <div style={{ opacity: 0.8 }}>
            Trigger a full multi‑agent workflow run.
          </div>
        </div>
        <button
          onClick={runFullWorkflow}
          disabled={running}
          style={{
            padding: "10px 18px",
            borderRadius: 6,
            border: "none",
            background: running ? "#9ca3af" : "#4f46e5",
            color: "white",
            cursor: running ? "default" : "pointer",
            fontWeight: 600
          }}
        >
          {running ? "Running..." : "Run Full Workflow"}
        </button>
      </section>

      {/* Recent runs */}
      <section
        style={{
          padding: 24,
          border: "1px solid #ddd",
          borderRadius: 8
        }}
      >
        <h2 style={{ marginBottom: 16 }}>Recent Workflow Runs</h2>

        {loading ? (
          <div style={{ opacity: 0.6 }}>Loading runs…</div>
        ) : runs.length === 0 ? (
          <div style={{ opacity: 0.6 }}>No runs yet.</div>
        ) : (
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: 14
            }}
          >
            <thead>
              <tr>
                <th style={{ textAlign: "left", paddingBottom: 8 }}>Run ID</th>
                <th style={{ textAlign: "left", paddingBottom: 8 }}>Status</th>
                <th style={{ textAlign: "left", paddingBottom: 8 }}>Started</th>
                <th style={{ textAlign: "left", paddingBottom: 8 }}>Finished</th>
                <th style={{ textAlign: "left", paddingBottom: 8 }}>Agents</th>
                <th style={{ textAlign: "left", paddingBottom: 8 }}>Errors</th>
              </tr>
            </thead>
            <tbody>
              {runs.map(run => (
                <tr key={run.id}>
                  <td style={{ padding: "6px 0" }}>{run.id}</td>
                  <td style={{ padding: "6px 0" }}>{run.status}</td>
                  <td style={{ padding: "6px 0" }}>{run.startedAt}</td>
                  <td style={{ padding: "6px 0" }}>
                    {run.finishedAt || "—"}
                  </td>
                  <td style={{ padding: "6px 0" }}>
                    {run.agentCount ?? "—"}
                  </td>
                  <td style={{ padding: "6px 0" }}>
                    {run.errorCount ?? 0}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
