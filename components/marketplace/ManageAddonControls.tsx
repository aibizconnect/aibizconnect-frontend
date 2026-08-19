"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cancelAddonAction, saveAddonConfigAction } from "@/app/tenants/[tenantId]/marketplace/actions";

/**
 * Per-add-on management controls (client): edit a display label (config), and cancel.
 * "Add more" is a plain link to the catalog, rendered by the page. Kept intentionally
 * small — the config surface grows per add-on as each one ships.
 */
export default function ManageAddonControls({
  tenantId,
  itemKey,
  initialLabel = "",
}: {
  tenantId: string;
  itemKey: string;
  initialLabel?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [label, setLabel] = useState(initialLabel);
  const [msg, setMsg] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  function save() {
    setMsg(null);
    startTransition(async () => {
      const r = await saveAddonConfigAction(tenantId, itemKey, { label });
      setMsg(r.ok ? "Saved." : (r.error ?? "Could not save."));
      if (r.ok) router.refresh();
    });
  }

  function cancel() {
    setMsg(null);
    startTransition(async () => {
      const r = await cancelAddonAction(tenantId, itemKey);
      if (r.ok) { router.refresh(); return; }
      setMsg(r.error ?? "Could not cancel.");
    });
  }

  return (
    <div className="mt-3 border-t border-slate-100 pt-3">
      <label className="block text-xs font-semibold text-slate-500">Label (optional)</label>
      <div className="mt-1 flex gap-2">
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="e.g. Marketing team"
          className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm"
        />
        <button onClick={save} disabled={pending} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60">
          Save
        </button>
      </div>

      <div className="mt-3">
        {confirming ? (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-slate-600">Cancel this add-on?</span>
            <button onClick={cancel} disabled={pending} className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:brightness-110 disabled:opacity-60">
              {pending ? "Canceling…" : "Yes, cancel"}
            </button>
            <button onClick={() => setConfirming(false)} disabled={pending} className="text-xs font-medium text-slate-500 hover:text-slate-700">
              Keep it
            </button>
          </div>
        ) : (
          <button onClick={() => setConfirming(true)} className="text-xs font-medium text-red-600 hover:text-red-700">
            Cancel add-on
          </button>
        )}
      </div>

      {msg && <p className="mt-2 text-xs text-slate-500">{msg}</p>}
    </div>
  );
}
