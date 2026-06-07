"use client";

import { useEffect, useState } from "react";
import ActivityTimeline from "./ActivityTimeline";
import AddActivityForm from "./AddActivityForm";
import DealsForContact from "./DealsForContact";

export default function ContactDetail({
  tenantId,
  contactId
}: {
  tenantId: string;
  contactId: string;
}) {
  const [contact, setContact] = useState<any>(null);

  useEffect(() => {
    fetch(`/tenants/${tenantId}/contacts`)
      .then(res => res.json())
      .then(data => {
        const found = data.contacts.find((c: any) => c.id === contactId);
        setContact(found);
      });
  }, [tenantId, contactId]);

  if (!contact) return <div style={{ padding: 32 }}>Loading…</div>;

  return (
    <div style={{ padding: 32 }}>
      <h1 style={{ marginBottom: 8 }}>
        {contact.first_name} {contact.last_name}
      </h1>

      <div style={{ opacity: 0.7, marginBottom: 24 }}>
        {contact.email} • {contact.phone} • {contact.company}
      </div>

      <DealsForContact tenantId={tenantId} contactId={contactId} />

      <h2 style={{ marginTop: 32 }}>Activity</h2>
      <AddActivityForm tenantId={tenantId} contactId={contactId} />
      <ActivityTimeline tenantId={tenantId} contactId={contactId} />
    </div>
  );
}
