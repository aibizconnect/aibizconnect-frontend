import type { Metadata } from "next";
import { notFound } from "next/navigation";
import BookingWidget from "@/components/calendars/BookingWidget";
import { getCalendarBySlug, availableSlots } from "@/lib/calendars";

export const metadata: Metadata = { title: "Book a time" };

/** Public booking page — brand-themed (navy/cyan). Lists available slots; booking creates
 * an appointment + a CRM contact. ?embed=1 (D-254) strips the AIBizConnect logo + outer
 * padding so the page can sit inside a tenant's website without our branding. */
export default async function BookingPage({ params, searchParams }: { params: Promise<{ tenantId: string; slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { tenantId, slug } = await params;
  const embed = (await searchParams).embed === "1";
  let cal = null, days: { date: string; slots: string[] }[] = [];
  try {
    cal = await getCalendarBySlug(tenantId, slug);
    if (cal) days = await availableSlots(tenantId, cal);
  } catch { /* tables not applied */ }
  if (!cal) notFound();

  const vars = { "--abc-color-primary": "#2563eb", "--abc-color-accent": "#22d3ee" } as React.CSSProperties;
  return (
    <div style={vars} className="min-h-screen bg-[#0a1224] text-[#e8eefc]">
      <div className={`mx-auto max-w-4xl ${embed ? "px-4 py-6" : "px-6 py-16"}`}>
        {!embed && (
          <div className="mb-8 flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logos/wordmark-white.png" alt="AIBizConnect" className="h-6 w-auto" />
          </div>
        )}
        <h1 className="text-3xl font-semibold tracking-tight" style={{ fontFamily: "MontserratAlt1, Inter, sans-serif" }}>Book a {cal.name}</h1>
        <p className="mb-8 mt-2 text-slate-400">Pick a time that works for you — {cal.durationMin} minutes.</p>
        <BookingWidget tenantId={tenantId} calendarId={cal.id} calendarName={cal.name} durationMin={cal.durationMin} days={days} venues={cal.venues} />
      </div>
    </div>
  );
}
