import { useEffect, useState } from "react";
import AgentActivityGraphs from "@/components/AgentActivityGraphs";


export default function TenantDashboard({ tenantId }: { tenantId: string }) {
  const [runs, setRuns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [goal, setGoal] = useState("");
  const [files, setFiles] = useState("");
  const [launching, setLaunching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch recent workflow runs (using audit logs for now)
  useEffect(() => {
    async function loadRuns() {
      try {
        const res = await fetch(`/tenants/${tenantId}/audit?type=full_workflow`);
        const data = await res.json();
        setRuns(data.logs || []);
      } catch (err: any) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadRuns();
  }, [tenantId]);

  async function runWorkflow() {
    setLaunching(true);
    setError(null);

    try {
      const res = await fetch(`/tenants/${tenantId}/workflows/full`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer YOUR_JWT"
        },
        body: JSON.stringify({
          goal: goal.trim(),
          files: files
            .split(",")
            .map(f => f.trim())
            .filter(Boolean)
        })
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Request failed with ${res.status}`);
      }

      // Refresh runs after launching
      const updated = await fetch(`/tenants/${tenantId}/audit?type=full_workflow`);
      const updatedData = await updated.json();
      setRuns(updatedData.logs || []);
      setGoal("");
      setFiles("");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLaunching(false);
    }
  }

  return (
    <div style={{ padding: 32, fontFamily: "Inter, sans-serif" }}>
      <h1 style={{ marginBottom: 8 }}>Tenant Dashboard</h1>
      <div style={{ opacity: 0.7, marginBottom: 32 }}>
        Tenant ID: <strong>{tenantId}</strong>
      </div>

      {/* Run Workflow Panel */}
      <section
        style={{
          padding: 24,
          border: "1px solid #ddd",
          borderRadius: 8,
          marginBottom: 40
        }}
      >
        <h2 style={{ marginBottom: 16 }}>Run Full Multi‑Agent Workflow</h2>

        <label style={{ display: "block", marginBottom: 12 }}>
          <div style={{ marginBottom: 4 }}>Goal</div>
          <textarea
            value={goal}
            onChange={e => setGoal(e.target.value)}
            placeholder="Describe what you want the agents to build or change..."
            style={{
              width: "100%",
              minHeight: 80,
              padding: 8,
              borderRadius: 6,
              border: "1px solid #ccc"
            }}
          />
        </label>

        <label style={{ display: "block", marginBottom: 12 }}>
          <div style={{ marginBottom: 4 }}>Files (optional, comma‑separated)</div>
          <input
            value={files}
            onChange={e => setFiles(e.target.value)}
            placeholder="src/foo.ts, src/bar.ts"
            style={{
              width: "100%",
              padding: 8,
              borderRadius: 6,
              border: "1px solid #ccc"
            }}
          />
        </label>

        <button
          onClick={runWorkflow}
          disabled={launching || !goal.trim()}
          style={{
            padding: "10px 18px",
            borderRadius: 6,
            background: launching ? "#999" : "#0070f3",
            color: "white",
            border: "none",
            cursor: launching ? "default" : "pointer"
          }}
        >
          {launching ? "Running..." : "Run Workflow"}
        </button>

        {error && (
          <div style={{ marginTop: 12, color: "red" }}>
            {error}
          </div>
        )}
      </section>

      {/* Recent Runs */}
      <section>
<AgentActivityGraphs tenantId={tenantId} />
        <h2 style={{ marginBottom: 16 }}>Recent Workflow Runs</h2>

        {loading ? (
          <div>Loading...</div>
        ) : runs.length === 0 ? (
          <div>No workflow runs yet.</div>
        ) : (
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              border: "1px solid #ddd"
            }}
          >
            <thead>
              <tr style={{ background: "#f7f7f7" }}>
                <th style={th}>Timestamp</th>
                <th style={th}>Goal</th>
                <th style={th}>Status</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((run, i) => (
                <tr key={i} style={{ borderTop: "1px solid #eee" }}>
                  <td style={td}>{run.timestamp}</td>
                  <td style={td}>{run.data?.goal || "(unknown)"}</td>
                  <td style={td}>
                    {run.event === "full_workflow_complete"
                      ? "Complete"
                      : run.event === "full_workflow_start"
                      ? "Started"
                      : run.event}
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

const th = {
  textAlign: "left" as const,
  padding: "8px 12px",
  borderBottom: "1px solid #ddd"
};

const td = {
  padding: "8px 12px"
};
