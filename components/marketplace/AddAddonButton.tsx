"use client";

import { useState, useTransition } from "react";
import { startAddonCheckoutAction } from "@/app/tenants/[tenantId]/marketplace/actions";

/** "Add" button for an available add-on — starts platform Stripe checkout and redirects. */
export default function AddAddonButton({ tenantId, itemKey, label = "Add" }: { tenantId: string; itemKey: string; label?: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onClick() {
    setError(null);
    startTransition(async () => {
      const r = await startAddonCheckoutAction(tenantId, itemKey);
      if (r.ok && r.url) { window.location.href = r.url; return; }
      setError(r.error ?? "Could not start checkout.");
    });
  }

  return (
    <div>
      <button
        onClick={onClick}
        disabled={pending}
        className="inline-flex items-center gap-1 rounded-lg bg-[#3D49C4] px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-60"
      >
        {pending ? "Starting…" : `${label} →`}
      </button>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
