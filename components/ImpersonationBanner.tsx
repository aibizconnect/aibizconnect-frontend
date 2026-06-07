"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { stopImpersonation } from "@/app/tenants/[tenantId]/website/actions";

/**
 * Sticky banner shown whenever a superadmin is "acting as" another team member. Exit always
 * checks the REAL superadmin role server-side, so you can never get stuck impersonating.
 */
export default function ImpersonationBanner({ actingAs, realEmail }: { actingAs: string; realEmail: string | null }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function exit() {
    setBusy(true);
    try { await stopImpersonation(); router.refresh(); }
    finally { setBusy(false); }
  }

  return (
    <div className="sticky top-0 z-40 flex items-center justify-between gap-3 border-b border-amber-300 bg-amber-100 px-6 py-2 text-sm text-amber-900">
      <span>
        <b>Acting as {actingAs}</b>
        {realEmail ? <span className="text-amber-700"> · signed in as {realEmail}</span> : null}
        <span className="text-amber-700"> — changes are made as this user.</span>
      </span>
      <button onClick={exit} disabled={busy}
        className="shrink-0 rounded-md border border-amber-400 bg-white px-3 py-1 font-medium text-amber-800 transition hover:bg-amber-50 disabled:opacity-50">
        {busy ? "Exiting…" : "Exit impersonation"}
      </button>
    </div>
  );
}
