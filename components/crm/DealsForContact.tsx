"use client";

import { useEffect, useState } from "react";

export default function DealsForContact({
  tenantId,
  contactId
}: {
  tenantId: string;
  contactId: string;
}) {
  const [deals, setDeals] = useState<any[]>([]);

  useEffect(() => {
    fetch(`/tenants/${tenantId}/deals`)
      .then(res => res.json())
      .then(data => {
        const filtered = (data.deals || []).filter(
          (d: any) => d.contact_id === contactId
        );
        setDeals(filtered);
      });
  }, [tenantId, contactId]);

  if (deals.length === 0) return null;

  return (
    <div style={{ marginBottom: 32 }}>
      <h2>Deals</h2>

      {deals.map(d => (
        <div
          key={d.id}
          style={{
            padding: 12,
            border: "1px solid var(--border)",
            borderRadius: 6,
            marginBottom: 8
          }}
        >
          <strong>{d.title}</strong>
          <div style={{ opacity: 0.8 }}>
            {d.value ? `$${d.value}` : "No value"} • {d.status}
          </div>
        </div>
      ))}
    </div>
  );
}
