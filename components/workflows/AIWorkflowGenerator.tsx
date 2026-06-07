"use client";

import { useState } from "react";

interface WorkflowStep {
  task: string;
  description: string;
}

interface WorkflowDraft {
  name: string;
  steps: WorkflowStep[];
}

type SaveState = "idle" | "saving" | "saved" | "error";

export default function AIWorkflowGenerator({ tenantId }: { tenantId: string }) {
  const [prompt, setPrompt] = useState("");
  const [draft, setDraft] = useState<WorkflowDraft | null>(null);
  const [generating, setGenerating] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    if (!prompt.trim()) { setError("Enter a prompt first."); return; }
    setError(null);
    setGenerating(true);
    setDraft(null);

    try {
      const res = await fetch(`/agent/tenants/${tenantId}/workflows/ai/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt })
      });
      if (!res.ok) throw new Error(`Server responded ${res.status}`);
      setDraft(await res.json());
    } catch (err: any) {
      setError(err.message ?? "Generation failed.");
    } finally {
      setGenerating(false);
    }
  }

  async function save() {
    if (!draft) return;
    setSaveState("saving");
    setError(null);

    try {
      const res = await fetch(`/agent/tenants/${tenantId}/workflows`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft)
      });
      if (!res.ok) throw new Error(`Server responded ${res.status}`);
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 3000);
    } catch (err: any) {
      setError(err.message ?? "Save failed.");
      setSaveState("error");
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900">AI Workflow Generator</h1>
      <p className="text-sm text-gray-500">
        Describe what you want to automate in plain language and the AI will
        generate a workflow draft for you.
      </p>

      {/* Prompt input */}
      <div>
        <textarea
          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
          rows={5}
          placeholder="e.g. When a new Stripe payment is received, send a confirmation SMS via Twilio and log the event."
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
        />
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
      )}

      <button
        onClick={generate}
        disabled={generating}
        className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60 transition-colors"
      >
        {generating ? "Generating..." : "Generate Workflow"}
      </button>

      {/* Draft preview */}
      {draft && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 space-y-5">
          <h2 className="text-lg font-semibold text-gray-900">Draft Workflow</h2>

          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Name</p>
            <p className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-sm text-gray-900">
              {draft.name}
            </p>
          </div>

          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
              Steps ({draft.steps.length})
            </p>
            <ol className="space-y-2">
              {draft.steps.map((s, i) => (
                <li key={i} className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
                  <p className="text-sm font-medium text-gray-900">{i + 1}. {s.task}</p>
                  {s.description && (
                    <p className="text-xs text-gray-500 mt-0.5">{s.description}</p>
                  )}
                </li>
              ))}
            </ol>
          </div>

          <button
            onClick={save}
            disabled={saveState === "saving"}
            className="rounded-lg bg-green-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-60 transition-colors"
          >
            {saveState === "saving" ? "Saving..." : saveState === "saved" ? "✓ Saved!" : "Save Workflow"}
          </button>
        </div>
      )}
    </div>
  );
}
