"use client";

import { useState } from "react";
import { purchaseProduct } from "@/app/sites/[tenantId]/store/actions";

/** Storefront buy button (D-350) — starts Stripe Checkout and redirects. */
export default function BuyButton({ tenantId, productId, label, accent }: { tenantId: string; productId: string; label: string; accent: string }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  async function buy() {
    setBusy(true); setErr(null);
    const r = await purchaseProduct(tenantId, productId);
    if (r.ok && r.url) { window.location.href = r.url; return; }
    setErr(r.error ?? "Couldn't start checkout."); setBusy(false);
  }
  return (
    <div>
      <button onClick={buy} disabled={busy} className="rounded-lg px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-50" style={{ background: accent }}>{busy ? "…" : label}</button>
      {err && <p className="mt-2 text-sm text-rose-600">{err}</p>}
    </div>
  );
}
