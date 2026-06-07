"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Loading } from "@/components/ui/Loading";

export default function WorkflowPage() {
  const [topic, setTopic] = useState("");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function runWorkflow() {
    if (!topic.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/agent/runWorkflow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic })
      });
      const json = await res.json();
      setResult(json);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 space-y-6">
      <Card>
        <h2 className="text-xl font-semibold mb-4">Run Multi-AI Workflow</h2>
        <input
          className="w-full rounded-lg border border-zinc-200 bg-zinc-50 p-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
          placeholder="Enter topic..."
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && runWorkflow()}
        />
        <Button onClick={runWorkflow} disabled={loading || !topic.trim()}>
          {loading ? "Running..." : "Run Workflow"}
        </Button>
        {loading && <div className="mt-4"><Loading label="Running multi-AI workflow..." /></div>}
        {error && <p className="mt-4 text-sm text-red-500">{error}</p>}
      </Card>

      {result && (
        <Card>
          <h3 className="text-lg font-semibold mb-4">Results</h3>
          <pre className="whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-300 overflow-auto max-h-[60vh]">
            {JSON.stringify(result, null, 2)}
          </pre>
        </Card>
      )}
    </div>
  );
}
