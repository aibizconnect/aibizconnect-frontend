import Link from "next/link";
import { headers } from "next/headers";
import { emailReady } from "@/lib/server/email-send";

/** Sites → Client Portal admin (D-348): the shareable customer-portal link + status. */
export default async function ClientPortalAdmin({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = await params;
  const h = await headers();
  const host = h.get("x-forwarded-host") || h.get("host") || "app.aibizconnect.app";
  const proto = h.get("x-forwarded-proto") || "https";
  const portalUrl = `${proto}://${host}/portal/${tenantId}`;
  const ready = await emailReady(tenantId).catch(() => ({ ok: false } as { ok: boolean }));

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-1 flex items-center gap-2 text-sm">
        <Link href={`/tenants/${tenantId}/sites`} className="text-slate-400 hover:text-slate-700">Sites</Link>
        <span className="text-slate-300">/</span><span className="text-slate-600">Client Portal</span>
      </div>
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Client Portal</h1>
      <p className="mb-5 text-sm text-slate-500">A private, password-free area where your customers sign in with their email to see their invoices, estimates, appointments and deals.</p>

      {!ready.ok && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          <b>Sign-in email isn&apos;t set up yet.</b> The portal sends a secure magic link by email — set up a verified sender in <Link href={`/tenants/${tenantId}/settings?tab=email`} className="underline">Settings → Email Services</Link> so customers can sign in.
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="text-sm font-semibold text-slate-700">Your portal link</div>
        <p className="text-xs text-slate-400">Share this with your customers, or link to it from your website footer.</p>
        <div className="mt-2 flex items-center gap-2">
          <code className="flex-1 truncate rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">{portalUrl}</code>
          <a href={portalUrl} target="_blank" rel="noreferrer" className="rounded-lg bg-[#1e3a8a] px-4 py-2 text-sm font-medium text-white">Preview ↗</a>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {["Invoices & pay-online links", "Estimates", "Upcoming appointments", "Their open deals"].map((t) => (
          <div key={t} className="rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-600">✓ {t}</div>
        ))}
      </div>
      <p className="mt-4 text-xs text-slate-400">Customers only ever see records linked to their own contact. Sign-in links are private and expire after 30 days.</p>
    </div>
  );
}
