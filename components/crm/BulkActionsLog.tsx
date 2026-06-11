"use client";

import { useEffect, useState } from "react";
import { listCrmAuditAction } from "@/app/tenants/[tenantId]/contacts/crm-actions";

/** Bulk Actions tab (GHL parity, D-235): the audit trail of contact operations. */
const LABEL: Record<string, string> = {
  "crm.contacts.bulk_delete": "Bulk delete",
  "crm.contacts.import": "CSV import",
  "crm.contacts.merge": "Merge duplicates",
  "crm.contacts.bulk_update": "Bulk field update",
  "crm.contacts.restore": "Restore",
  "crm.contacts.purge": "Delete forever",
};

export default function BulkActionsLog({ tenantId }: { tenantId: string }) {
  const [rows, setRows] = useState<{ action: string; meta: Record<string, unknown>; at: string }[]>([]);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => { listCrmAuditAction(tenantId).then((r) => { setRows(r); setLoaded(true); }).catch(() => setLoaded(true)); }, [tenantId]);

  const detail = (r: { action: string; meta: Record<string, unknown> }) => {
    const m = r.meta;
    if (r.action === "crm.contacts.import") return `${m.inserted ?? 0} imported, ${m.skipped ?? 0} skipped`;
    if (r.action === "crm.contacts.merge") return `${m.merged ?? 0} merged into one`;
    if (r.action === "crm.contacts.bulk_update") return `${m.field}: ${m.count ?? 0} contacts`;
    if (m.count != null) return `${m.count} contacts`;
    return "";
  };

  return (
    <div>
      <p className="mb-3 text-sm text-slate-500">Every bulk operation on contacts, newest first.</p>
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {rows.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-slate-400">{loaded ? "No bulk actions yet." : "Loading…"}</div>
        ) : (
          <ul className="divide-y divide-slate-50">
            {rows.map((r, i) => (
              <li key={i} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                <span className="font-medium text-slate-800">{LABEL[r.action] ?? r.action}</span>
                <span className="min-w-0 flex-1 truncate text-xs text-slate-500">{detail(r)}</span>
                <span className="whitespace-nowrap text-xs text-slate-400">{new Date(r.at).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
