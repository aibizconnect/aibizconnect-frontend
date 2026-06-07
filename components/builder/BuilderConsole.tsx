"use client";

import { useState } from "react";

interface BuilderIteration {
  step?: number | string;
  action?: string;
  output?: string;
  [key: string]: unknown;
}

interface BuilderResult {
  iterations?: BuilderIteration[];
  summary?: string;
  [key: string]: unknown;
}

type RunState = "idle" | "running" | "done" | "error";

export default function BuilderConsole({ tenantId }: { tenantId: string }) {
  const [goal, setGoal] = useState("");
  const [result, setResult] = useState<BuilderResult | null>(null);
  const [runState, setRunState] = useState<RunState>("idle");
  const [error, setError] = useState<string | null>(null);

  async function run() {
    if (!goal.trim()) { setError("Enter a goal first."); return; }
    setError(null);
    setResult(null);
    setRunState("running");

    try {
      const res = await fetch(`/agent/tenants/${tenantId}/agent/builder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal })
      });

      if (!res.ok) throw new Error(`Server responded ${res.status}`);
      setResult(await res.json());
      setRunState("done");
    } catch (err: any) {
      setError(err.message ?? "Builder run failed.");
      setRunState("error");
    }
  }

  const iterations = result?.iterations ?? [];

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Builder Agent</h1>
        <p className="text-sm text-gray-500 mt-1">
          Describe a goal and the agent will plan and execute the build loop.
        </p>
      </div>

      <textarea
        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 resize-none"
        rows={5}
        placeholder="e.g. Build a workflow that sends a welcome SMS when a new user signs up via Stripe..."
        value={goal}
        onChange={e => setGoal(e.target.value)}
      />

      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
      )}

      <button
        onClick={run}
        disabled={runState === "running"}
        className="rounded-lg bg-green-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-60 transition-colors"
      >
        {runState === "running" ? "Building..." : "Run Builder"}
      </button>

      {/* Iterations */}
      {iterations.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-900">
            Iterations ({iterations.length})
          </h2>
          <ol className="space-y-2">
            {iterations.map((iter, i) => (
              <li key={i} className="rounded-lg border border-gray-200 bg-white p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                    Step {iter.step ?? i + 1}
                  </span>
                  {iter.action && (
                    <span className="text-sm font-medium text-gray-900">{iter.action}</span>
                  )}
                </div>
                {iter.output && (
                  <p className="text-sm text-gray-600">{iter.output}</p>
                )}
                {/* Remaining fields not already shown */}
                {Object.keys(iter).filter(k => !["step", "action", "output"].includes(k)).length > 0 && (
                  <pre className="mt-2 text-xs bg-gray-50 rounded-lg border border-gray-100 p-3 overflow-auto max-h-32">
                    {JSON.stringify(
                      Object.fromEntries(
                        Object.entries(iter).filter(([k]) => !["step", "action", "output"].includes(k))
                      ),
                      null,
                      2
                    )}
                  </pre>
                )}
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Summary or raw result fallback */}
      {result && (
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">
            {result.summary ? "Summary" : "Full Result"}
          </h2>
          {result.summary ? (
            <p className="text-sm text-gray-700">{result.summary}</p>
          ) : (
            <pre className="text-xs bg-gray-50 rounded-lg border border-gray-100 p-3 overflow-auto max-h-60">
              {JSON.stringify(result, null, 2)}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}
