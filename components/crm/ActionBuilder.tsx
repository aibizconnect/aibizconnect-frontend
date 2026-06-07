"use client";

import { useState } from "react";

export default function ActionBuilder({
  value,
  onChange
}: {
  value: any[];
  onChange: (v: any[]) => void;
}) {
  const [actionType, setActionType] = useState("");
  const [payload, setPayload] = useState("{}");

  function addAction() {
    try {
      const parsed = JSON.parse(payload);
      onChange([...value, { type: actionType, payload: parsed }]);
      setActionType("");
      setPayload("{}");
    } catch {}
  }

  return (
    <div style={{ marginBottom: 24 }}>
      <h3>Actions</h3>

      <select
        value={actionType}
        onChange={e => setActionType(e.target.value)}
        style={{
          width: "100%",
          padding: 12,
          borderRadius: 6,
          border: "1px solid var(--border)",
          background: "var(--card)",
          color: "var(--text)",
          marginBottom: 8
        }}
      >
        <option value="">Select action…</option>
        <option value="send_email">Send Email</option>
        <option value="create_task">Create Task</option>
        <option value="update_deal_stage">Update Deal Stage</option>
        <option value="add_contact_tag">Add Contact Tag</option>
      </select>

      <textarea
        value={payload}
        onChange={e => setPayload(e.target.value)}
        placeholder="{}"
        style={{
          width: "100%",
          height: 120,
          padding: 12,
          borderRadius: 6,
          border: "1px solid var(--border)",
          background: "var(--card)",
          color: "var(--text)",
          marginBottom: 8
        }}
      />

      <button
        onClick={addAction}
        style={{
          padding: "8px 16px",
          borderRadius: 6,
          background: "#4f46e5",
          color: "white",
          border: "none",
          cursor: "pointer"
        }}
      >
        Add Action
      </button>
    </div>
  );
}
