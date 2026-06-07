"use client";

import { useState } from "react";

export default function CreateTaskForm({
  tenantId,
  onCreated
}: {
  tenantId: string;
  onCreated: () => void;
}) {
  const [title, setTitle] = useState("");
  const [due, setDue] = useState("");

  async function submit() {
    await fetch(`/tenants/${tenantId}/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        due_date: due || null
      })
    });

    setTitle("");
    setDue("");
    onCreated();
  }

  return (
    <div style={{ marginBottom: 24 }}>
      <input
        value={title}
        onChange={e => setTitle(e.target.value)}
        placeholder="Task title"
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
        type="date"
        value={due}
        onChange={e => setDue(e.target.value)}
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
        Create Task
      </button>
    </div>
  );
}
