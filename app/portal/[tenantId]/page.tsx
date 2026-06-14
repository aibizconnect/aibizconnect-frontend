import type { Metadata } from "next";
import { cookies } from "next/headers";
import { readPortalToken, getPortalData } from "@/lib/server/portal";
import { listEnrolledCourses } from "@/lib/memberships";
import { getBlogBrand } from "@/lib/server/blog";
import PortalLogin from "@/components/portal/PortalLogin";
import { logoutPortal } from "./actions";

export const metadata: Metadata = { title: "Client Portal", robots: { index: false, follow: false } };

const money = (n: number, ccy: string) => `${ccy === "USD" ? "$" : ccy + " "}${n.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
const STATUS_TINT: Record<string, string> = { paid: "bg-emerald-100 text-emerald-700", sent: "bg-sky-100 text-sky-700", overdue: "bg-rose-100 text-rose-700", accepted: "bg-emerald-100 text-emerald-700", open: "bg-sky-100 text-sky-700", won: "bg-emerald-100 text-emerald-700", lost: "bg-rose-100 text-rose-600" };
const pill = (s: string) => `rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ${STATUS_TINT[s] ?? "bg-slate-100 text-slate-500"}`;

export default async function PortalPage({ params, searchParams }: { params: Promise<{ tenantId: string }>; searchParams: Promise<{ e?: string }> }) {
  const { tenantId } = await params;
  const { e } = await searchParams;
  const brand = await getBlogBrand(tenantId).catch(() => ({ businessName: "Client Portal", accent: "#1e3a8a" }));

  const store = await cookies();
  const token = store.get("abizportal")?.value;
  const sess = token ? readPortalToken(token, tenantId) : null;
  if (!sess) return <PortalLogin tenantId={tenantId} businessName={brand.businessName} accent={brand.accent} invalid={e === "invalid"} />;

  const [data, courses] = await Promise.all([
    getPortalData(tenantId, sess.contactId, sess.email),
    listEnrolledCourses(tenantId, sess.email).catch(() => []),
  ]);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white" style={{ borderTopColor: brand.accent, borderTopWidth: 3 }}>
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-5">
          <div>
            <div className="text-xs font-semibold uppercase tracking-widest" style={{ color: brand.accent }}>{brand.businessName}</div>
            <h1 className="text-lg font-semibold text-slate-900">Your portal</h1>
          </div>
          <form action={logoutPortal.bind(null, tenantId)}>
            <button className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">Sign out</button>
          </form>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-8 px-6 py-8">
        <Section title="Invoices" empty="No invoices.">
          {data.invoices.map((i) => (
            <Row key={i.id} left={<><span className="font-medium text-slate-800">{i.invoiceNumber}</span> <span className={pill(i.status)}>{i.status}</span></>}
              sub={i.dueDate ? `Due ${new Date(i.dueDate).toLocaleDateString()}` : ""}
              right={<div className="flex items-center gap-3"><span className="font-semibold text-slate-800">{money(i.totalAmount, i.currency)}</span>{i.status !== "paid" && i.paymentLinkUrl && <a href={i.paymentLinkUrl} className="rounded-lg px-3 py-1.5 text-xs font-medium text-white" style={{ background: brand.accent }}>Pay</a>}</div>} />
          ))}
        </Section>

        <Section title="Estimates" empty="No estimates.">
          {data.estimates.map((es) => (
            <Row key={es.id} left={<><span className="font-medium text-slate-800">{es.estimateNumber}</span> <span className={pill(es.status)}>{es.status}</span></>}
              sub={es.expiryDate ? `Valid until ${new Date(es.expiryDate).toLocaleDateString()}` : ""}
              right={<span className="font-semibold text-slate-800">{money(es.totalAmount, es.currency)}</span>} />
          ))}
        </Section>

        <Section title="Appointments" empty="No upcoming appointments.">
          {data.appointments.map((a) => (
            <Row key={a.id} left={<><span className="font-medium text-slate-800">{a.title || "Appointment"}</span> <span className={pill(a.status)}>{a.status}</span></>}
              sub={new Date(a.startAt).toLocaleString()} right={null} />
          ))}
        </Section>

        <Section title="Your courses" empty="No courses yet.">
          {courses.map((c) => (
            <a key={c.id} href={`/learn/${tenantId}/${c.id}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-slate-50">
              <span className="text-sm font-medium text-slate-800">{c.title}</span>
              <span className="text-xs font-medium" style={{ color: brand.accent }}>Open →</span>
            </a>
          ))}
        </Section>

        <Section title="Your deals" empty="Nothing here yet.">
          {data.opportunities.map((o) => (
            <Row key={o.id} left={<><span className="font-medium text-slate-800">{o.name}</span> <span className={pill(o.status)}>{o.status}</span></>}
              sub={o.stage} right={<span className="font-semibold text-slate-800">{o.value ? `$${o.value.toLocaleString()}` : ""}</span>} />
          ))}
        </Section>
      </main>
    </div>
  );
}

function Section({ title, empty, children }: { title: string; empty: string; children: React.ReactNode }) {
  const items = Array.isArray(children) ? children.filter(Boolean) : children;
  const isEmpty = Array.isArray(items) ? items.length === 0 : !items;
  return (
    <section>
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</h2>
      {isEmpty ? <p className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-6 text-center text-sm text-slate-400">{empty}</p> : <div className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">{items}</div>}
    </section>
  );
}
function Row({ left, sub, right }: { left: React.ReactNode; sub?: string; right: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3">
      <div className="min-w-0"><div className="flex items-center gap-2 text-sm">{left}</div>{sub && <div className="text-xs text-slate-400">{sub}</div>}</div>
      {right && <div className="shrink-0 text-sm">{right}</div>}
    </div>
  );
}
