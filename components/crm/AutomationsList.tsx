"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function AutomationsList({ tenantId }: { tenantId: string }) {
  const [automations, setAutomations] = useState<any[]>([]);

  useEffect(() => {
    fetch(`/tenants/${tenantId}/automations`)
      .then(res => res.json())
      .then(data => setAutomations(data.automations || []));
  }, [tenantId]);

  return (
    <div style={{ padding: 32 }}>
      <h1 style={{ marginBottom: 24 }}>Automations</h1>

      <Link
        href={`/tenants/${tenantId}/automations/create`}
        style={{
          padding: "8px 16px",
          borderRadius: 6,
          background: "#4f46e5",
          color: "white",
          textDecoration: "none"
        }}
      >
        Create Automation
      </Link>

      <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 12 }}>
        {automations.map(a => (
          <div
            key={a.id}
            style={{
              padding: 16,
              borderRadius: 6,
              border: "1px solid var(--border)",
              background: "var(--card)"
            }}
          >
            <strong>{a.name}</strong>
            <div style={{ opacity: 0.7 }}>
              Trigger: {a.event_type}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
