"use client";

import { use, useState } from "react";

export default function BillingPortalPage({
  params
}: {
  params: Promise<{ tenantId: string }>;
}) {
  const { tenantId } = use(params);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function openPortal() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/agent/tenants/${tenantId}/billing/portal`, {
        method: "POST"
      });

      const data = await res.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        setError("Billing portal URL not returned. Please try again.");
        setLoading(false);
      }
    } catch (err: any) {
      setError(err.message ?? "Unable to open billing portal.");
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 max-w-lg">
      <h1 className="text-2xl font-bold text-gray-900">Billing &amp; Subscription</h1>

      <p className="text-gray-600 text-sm">
        Manage your subscription, payment methods, and invoices through the
        Stripe Billing Portal.
      </p>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
      )}

      <button
        onClick={openPortal}
        disabled={loading}
        className="rounded-lg bg-blue-600 px-6 py-3 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60 transition-colors"
      >
        {loading ? "Redirecting..." : "Open Billing Portal"}
      </button>
    </div>
  );
}
