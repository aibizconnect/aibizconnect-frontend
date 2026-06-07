"use client";

export default function RunOverviewCard({ run, runId, tenantId }: any) {
  const result = run?.data?.result || {};

  const status =
    result.test?.status ||
    result.merge?.status ||
    result.review?.status ||
    result.builder?.status ||
    result.architect?.status ||
    "unknown";

  const startedAt = run.timestamp || null;

  const finishedAt =
    result.test?.timestamp ||
    result.merge?.timestamp ||
    result.review?.timestamp ||
    result.builder?.timestamp ||
    result.architect?.timestamp ||
    null;

  const duration =
    startedAt && finishedAt
      ? `${Math.round(
          (new Date(finishedAt).getTime() -
            new Date(startedAt).getTime()) /
            1000
        )}s`
      : "—";

  const agents = [
    result.architect && "Architect",
    result.builder && "Builder",
    result.review && "Reviewer",
    result.merge && "Merge",
    result.test && "Test"
  ].filter(Boolean);

  const errorCount =
    (result.architect?.errors?.length || 0) +
    (result.builder?.errors?.length || 0) +
    (result.review?.errors?.length || 0) +
    (result.merge?.errors?.length || 0) +
    (result.test?.errors?.length || 0);

  return (
    <section
      style={{
        marginBottom: 32,
        padding: 24,
        border: "1px solid #ddd",
        borderRadius: 8,
        background: "#fafafa"
      }}
    >
      <h2 style={{ marginBottom: 16 }}>Run Overview</h2>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          rowGap: 12
        }}
      >
        <OverviewItem label="Run ID" value={runId} />
        <OverviewItem label="Tenant" value={tenantId} />
        <OverviewItem label="Status" value={status} />

        <OverviewItem label="Started" value={startedAt || "—"} />
        <OverviewItem label="Finished" value={finishedAt || "—"} />
        <OverviewItem label="Duration" value={duration} />

        <OverviewItem label="Agents" value={agents.join(", ") || "—"} />
        <OverviewItem label="Errors" value={errorCount} />
        <OverviewItem label="Workflow" value={run?.workflowName || "—"} />
      </div>
    </section>
  );
}

function OverviewItem({ label, value }: { label: string; value: any }) {
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <span style={{ fontSize: 12, opacity: 0.6 }}>{label}</span>
      <span style={{ fontWeight: 600 }}>{value}</span>
    </div>
  );
}
