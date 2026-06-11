"use client";

import { useEffect, useState } from "react";
import { listCompaniesAction } from "@/app/tenants/[tenantId]/contacts/crm-actions";

/** Companies tab (GHL parity, D-236): rolled up from each contact's Company field —
 *  click a company to see its people. */
export default function CompaniesTab({ tenantId, onOpen }: { tenantId: string; onOpen: (name: string) => void }) {
  const [rows, setRows] = useState<{ name: string; count: number }[]>([]);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => { listCompaniesAction(tenantId).then((r) => { setRows(r); setLoaded(true); }).catch(() => setLoaded(true)); }, [tenantId]);

  return (
    <div>
      <p className="mb-3 text-sm text-slate-500">Companies are rolled up from each contact&apos;s Company field.</p>
      {rows.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-10 text-center text-sm text-slate-400">
          {loaded ? "No companies yet — set a Company on your contacts." : "Loading…"}
        </div>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((c) => (
            <button key={c.name} onClick={() => onOpen(c.name)}
              className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-left shadow-sm transition hover:border-[#1e3a8a]/40">
              <span className="min-w-0 truncate text-sm font-medium text-slate-800">{c.name}</span>
              <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">{c.count}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
