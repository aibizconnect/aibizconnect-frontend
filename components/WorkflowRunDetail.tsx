"use client";

import { useEffect, useState } from "react";
import BuilderIterationViewer from "@/components/BuilderIterationViewer";
import MergeConflictVisualizer from "@/components/MergeConflictVisualizer";
import TestCoveragePanel from "@/components/TestCoveragePanel";
import ArchitectPlanViewer from "@/components/ArchitectPlanViewer";
import ReviewerIssueInspector from "@/components/ReviewerIssueInspector";
import WorkflowTimeline from "@/components/WorkflowTimeline";
import LiveAgentLogs from "@/components/LiveAgentLogs";
import RunOverviewCard from "@/components/RunOverviewCard";


export default function WorkflowRunDetail({
  tenantId,
  runId
}: {
  tenantId: string;
  runId: string;
}) {
  const [run, setRun] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(
          `/tenants/${tenantId}/audit?type=full_workflow&runId=${runId}`
        );
        const data = await res.json();
        setRun(data.log || null);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [tenantId, runId]);

  if (loading) return <div style={{ padding: 32 }}>Loading...</div>;
  if (!run) return <div style={{ padding: 32 }}>Workflow run not found.</div>;

  const result = run.data?.result || {};

  const timelineEvents = [
    {
      label: "Workflow Started",
      timestamp: run.timestamp,
      status: "started"
    },
    {
      label: "Architect",
      timestamp: result.architect?.timestamp,
      status: result.architect?.status
    },
    {
      label: "Builder",
      timestamp: result.builder?.timestamp,
      status: result.builder?.status
    },
    {
      label: "Reviewer",
      timestamp: result.review?.timestamp,
      status: result.review?.status
    },
    {
      label: "Merge",
      timestamp: result.merge?.timestamp,
      status: result.merge?.status
    },
    {
      label: "Test",
      timestamp: result.test?.timestamp,
      status: result.test?.status
    }
  ].filter(e => e.timestamp);

  return (
    <div style={{ padding: 32, fontFamily: "Inter, sans-serif" }}>
      <h1 style={{ marginBottom: 8 }}>Workflow Run Detail</h1>

      <RunOverviewCard run={run} runId={runId} tenantId={tenantId} />

      {/* Timeline */}
      <WorkflowTimeline events={timelineEvents} />

      {/* Live Logs */}
      <LiveAgentLogs tenantId={tenantId} runId={runId} />

      <div style={{ opacity: 0.7, marginBottom: 32 }}>
        Tenant: <strong>{tenantId}</strong> • Run ID: <strong>{runId}</strong>
      </div>

      {/* Architect */}
      <ArchitectPlanViewer architect={result.architect} />

      {/* Builder */}
      <AgentPanel title="Builder Summary" data={result.builder} />
      <BuilderIterationViewer
        iterations={result.builder?.iterations || []}
      />

      {/* Reviewer */}
      <ReviewerIssueInspector review={result.review} />

      {/* Merge */}
      <MergeConflictVisualizer merge={result.merge} />

      {/* Test */}
      <TestCoveragePanel test={result.test} />
    </div>
  );
}

function AgentPanel({ title, data }: { title: string; data: any }) {
  return (
    <section
      style={{
        marginBottom: 40,
        padding: 24,
        border: "1px solid #ddd",
        borderRadius: 8
      }}
    >
      <h2 style={{ marginBottom: 12 }}>{title}</h2>

      {!data ? (
        <div style={{ opacity: 0.6 }}>No data.</div>
      ) : (
        <pre
          style={{
            background: "#fafafa",
            padding: 16,
            borderRadius: 6,
            overflowX: "auto"
          }}
        >
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
    </section>
  );
}
