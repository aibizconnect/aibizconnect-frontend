import type { Metadata } from "next";
import Link from "next/link";
import { listCalendars } from "@/lib/calendars";

export const metadata: Metadata = { title: "Book a time" };

/**
 * Public booking INDEX (D-237 — our Calendar Groups equivalent): one shareable link
 * (/book/<tenant>) that lists every booking calendar so the visitor picks the right one.
 * ?embed=1 (D-254) tightens padding for in-site embedding; calendar links carry it through.
 */
export default async function BookingIndexPage({ params, searchParams }: { params: Promise<{ tenantId: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { tenantId } = await params;
  const embed = (await searchParams).embed === "1";
  let cals: Awaited<ReturnType<typeof listCalendars>> = [];
  try { cals = await listCalendars(tenantId); } catch { /* tables not applied */ }

  const vars = { "--abc-color-primary": "#2563eb", "--abc-color-accent": "#22d3ee" } as React.CSSProperties;
  const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return (
    <main style={vars} className={`min-h-screen bg-slate-50 ${embed ? "px-3 py-4" : "px-4 py-12"}`}>
      <div className="mx-auto max-w-xl">
        <h1 className="mb-1 text-2xl font-semibold tracking-tight text-slate-900">Book a time</h1>
        <p className="mb-6 text-sm text-slate-500">Choose the type of appointment that fits.</p>
        {cals.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-400">No booking calendars are available right now.</div>
        ) : (
          <div className="space-y-3">
            {cals.map((c) => (
              <Link key={c.id} href={`/book/${tenantId}/${c.slug}${embed ? "?embed=1" : ""}`}
                className="block rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-[#2563eb]/50 hover:shadow">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate font-medium text-slate-900">{c.name}</div>
                    <div className="mt-0.5 text-xs text-slate-500">
                      {c.durationMin} min · {c.weekdays.map((d) => DOW[d]).join(" ")} · {c.startHour}:00–{c.endHour}:00
                      {c.assignedToName ? ` · with ${c.assignedToName}` : ""}
                    </div>
                  </div>
                  <span className="shrink-0 rounded-lg bg-[#2563eb] px-3 py-1.5 text-xs font-medium text-white">Pick a time →</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
