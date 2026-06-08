"use client";

import { useState } from "react";
import { notify, notifyError } from "@/lib/ui/dialogs";

type Step = {
  task: string;
  description: string;
};

export default function WorkflowBuilder({ tenantId }: { tenantId: string }) {
  const [name, setName] = useState("");
  const [steps, setSteps] = useState<Step[]>([]);

  function addStep() {
    setSteps([...steps, { task: "", description: "" }]);
  }

  function updateStep(index: number, field: keyof Step, value: string) {
    const updated = [...steps];
    updated[index][field] = value;
    setSteps(updated);
  }

  function removeStep(index: number) {
    setSteps(steps.filter((_, i) => i !== index));
  }

  function moveStep(index: number, direction: "up" | "down") {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= steps.length) return;

    const updated = [...steps];
    const [moved] = updated.splice(index, 1);
    updated.splice(newIndex, 0, moved);
    setSteps(updated);
  }

  async function saveWorkflow() {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/tenants/${tenantId}/workflows`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token") || ""}`
        },
        body: JSON.stringify({ name, steps })
      }
    );

    if (!res.ok) {
      notifyError("Failed to save workflow");
      return;
    }

    notify("Workflow saved!");
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Workflow Builder</h1>

      <div>
        <label className="block font-medium mb-1">Workflow Name</label>
        <input
          className="border p-2 rounded w-full"
          value={name}
          onChange={e => setName(e.target.value)}
        />
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Steps</h2>
          <button
            className="bg-blue-600 text-white px-3 py-1 rounded"
            onClick={addStep}
          >
            Add Step
          </button>
        </div>

        {steps.map((step, index) => (
          <div
            key={index}
            className="p-4 bg-white border rounded space-y-3 flex flex-col gap-2"
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold">Step {index + 1}</span>
              <div className="flex gap-2">
                <button
                  className="text-sm text-gray-600 border px-2 py-1 rounded"
                  onClick={() => moveStep(index, "up")}
                  disabled={index === 0}
                >
                  ↑
                </button>
                <button
                  className="text-sm text-gray-600 border px-2 py-1 rounded"
                  onClick={() => moveStep(index, "down")}
                  disabled={index === steps.length - 1}
                >
                  ↓
                </button>
                <button
                  className="text-sm text-red-600 border px-2 py-1 rounded"
                  onClick={() => removeStep(index)}
                >
                  Remove
                </button>
              </div>
            </div>

            <div>
              <label className="block font-medium mb-1">Task</label>
              <input
                className="border p-2 rounded w-full"
                value={step.task}
                onChange={e => updateStep(index, "task", e.target.value)}
              />
            </div>

            <div>
              <label className="block font-medium mb-1">Description</label>
              <textarea
                className="border p-2 rounded w-full"
                value={step.description}
                onChange={e =>
                  updateStep(index, "description", e.target.value)
                }
              />
            </div>
          </div>
        ))}
      </div>

      <button
        className="bg-green-600 text-white px-6 py-3 rounded"
        onClick={saveWorkflow}
      >
        Save Workflow
      </button>
    </div>
  );
}
