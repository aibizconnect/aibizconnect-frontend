"use client";

import { useState } from "react";

export default function CreateDealModal({
  tenantId,
  pipelineId,
  stageId,
  onCreated
}: {
  tenantId: string;
  pipelineId: string;
  stageId: string;
  onCreated: () => void;
}) {
  const [title, setTitle] = useState("");
  const [value, setValue] = useState("");

  async function submit() {
    await fetch(`/tenants/${tenantId}/deals`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pipeline_id: pipelineId,
        stage_id: stageId,
        title,
        value
      })
    });

    onCreated();
  }

  return (
    <div style={{ marginBottom: 16 }}>
      <input
        value={title}
        onChange={e => setTitle(e.target.value)}
        placeholder="Deal title"
        style={{
          width: "100%",
          padding: 12,
          borderRadius: 6,
          border: "1px solid var(--border)",
          background: "var(--card)",
          color: "var(--text)",
          marginBottom: 8
        }}
      />

      <input
        value={value}
        onChange={e => setValue(e.target.value)}
        placeholder="Value"
        style={{
          width: "100%",
          padding: 12,
          borderRadius: 6,
          border: "1px solid var(--border)",
          background: "var(--card)",
          color: "var(--text)",
          marginBottom: 8
        }}
      />

      <button
        onClick={submit}
        style={{
          padding: "8px 16px",
          borderRadius: 6,
          background: "#4f46e5",
          color: "white",
          border: "none",
          cursor: "pointer"
        }}
      >
        Create Deal
      </button>
    </div>
  );
}
