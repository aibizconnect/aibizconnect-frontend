"use client";

import { useState } from "react";

export default function AddActivityForm({
  tenantId,
  contactId
}: {
  tenantId: string;
  contactId: string;
}) {
  const [content, setContent] = useState("");

  async function submit() {
    await fetch(`/tenants/${tenantId}/activities`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contact_id: contactId,
        type: "note",
        content
      })
    });

    setContent("");
    location.reload();
  }

  return (
    <div style={{ marginBottom: 16 }}>
      <textarea
        value={content}
        onChange={e => setContent(e.target.value)}
        placeholder="Add a note..."
        style={{
          width: "100%",
          padding: 12,
          borderRadius: 6,
          border: "1px solid var(--border)",
          background: "var(--card)",
          color: "var(--text)"
        }}
      />

      <button
        onClick={submit}
        style={{
          marginTop: 8,
          padding: "8px 16px",
          borderRadius: 6,
          background: "#4f46e5",
          color: "white",
          border: "none",
          cursor: "pointer"
        }}
      >
        Add Note
      </button>
    </div>
  );
}
