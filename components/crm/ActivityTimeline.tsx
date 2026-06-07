"use client";

import { useEffect, useState } from "react";

export default function ActivityTimeline({
  tenantId,
  contactId
}: {
  tenantId: string;
  contactId: string;
}) {
  const [activities, setActivities] = useState<any[]>([]);

  useEffect(() => {
    fetch(`/tenants/${tenantId}/activities?contactId=${contactId}`)
      .then(res => res.json())
      .then(data => setActivities(data.activities || []));
  }, [tenantId, contactId]);

  return (
    <div style={{ marginTop: 16 }}>
      {activities.map(a => (
        <div
          key={a.id}
          style={{
            padding: 12,
            borderBottom: "1px solid var(--border)",
            marginBottom: 8
          }}
        >
          <strong>{a.type}</strong>
          <div style={{ opacity: 0.8 }}>{a.content}</div>
        </div>
      ))}
    </div>
  );
}
