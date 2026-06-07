"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function ContactsTable({ tenantId }: { tenantId: string }) {
  const [contacts, setContacts] = useState<any[]>([]);

  useEffect(() => {
    fetch(`/tenants/${tenantId}/contacts`)
      .then(res => res.json())
      .then(data => setContacts(data.contacts || []));
  }, [tenantId]);

  return (
    <div style={{ padding: 32 }}>
      <h1 style={{ marginBottom: 24 }}>Contacts</h1>

      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={{ textAlign: "left", paddingBottom: 8 }}>Name</th>
            <th style={{ textAlign: "left", paddingBottom: 8 }}>Email</th>
            <th style={{ textAlign: "left", paddingBottom: 8 }}>Phone</th>
            <th style={{ textAlign: "left", paddingBottom: 8 }}>Company</th>
          </tr>
        </thead>

        <tbody>
          {contacts.map(c => (
            <tr key={c.id}>
              <td style={{ padding: "8px 0" }}>
                <Link
                  href={`/tenants/${tenantId}/contacts/${c.id}`}
                  style={{ color: "var(--text)", textDecoration: "underline" }}
                >
                  {c.first_name} {c.last_name}
                </Link>
              </td>
              <td>{c.email || "—"}</td>
              <td>{c.phone || "—"}</td>
              <td>{c.company || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
