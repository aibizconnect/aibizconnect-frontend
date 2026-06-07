"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function PipelinesBoard({ tenantId }: { tenantId: string }) {
  const [pipelines, setPipelines] = useState<any[]>([]);

  useEffect(() => {
    fetch(`/tenants/${tenantId}/pipelines`)
      .then(res => res.json())
      .then(data => setPipelines(data.pipelines || []));
  }, [tenantId]);

  return (
    <div style={{ padding: 32 }}>
      <h1 style={{ marginBottom: 24 }}>Pipelines</h1>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {pipelines.map(p => (
          <Link
            key={p.id}
            href={`/tenants/${tenantId}/pipelines/${p.id}`}
            style={{
              padding: 16,
              borderRadius: 6,
              border: "1px solid var(--border)",
              background: "var(--card)",
              color: "var(--text)",
              textDecoration: "none"
            }}
          >
            {p.name}
          </Link>
        ))}
      </div>
    </div>
  );
}
