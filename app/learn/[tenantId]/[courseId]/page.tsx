import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { getCourse, isEnrolled } from "@/lib/memberships";
import { readPortalToken } from "@/lib/server/portal";
import CoursePaywall from "@/components/memberships/CoursePaywall";

export const metadata: Metadata = { title: "Course" };

const priceOf = (cents: number, ccy: string) => new Intl.NumberFormat("en-US", { style: "currency", currency: ccy || "USD" }).format(cents / 100);

/** Public course viewer (member hub) — brand-themed. Paid courses are gated behind enrollment. */
export default async function LearnPage({ params }: { params: Promise<{ tenantId: string; courseId: string }> }) {
  const { tenantId, courseId } = await params;
  let course = null;
  try { course = await getCourse(tenantId, courseId); } catch { /* tables not applied */ }
  if (!course || course.status !== "published") notFound();

  const isPaid = course.priceCents > 0;
  const token = (await cookies()).get("abizportal")?.value;
  const sess = token ? readPortalToken(token, tenantId) : null;
  const access = !isPaid || (!!sess && await isEnrolled(tenantId, courseId, sess.email).catch(() => false));

  const vars = { "--abc-color-accent": "#22d3ee" } as React.CSSProperties;
  return (
    <div style={vars} className="min-h-screen bg-[#0a1224] text-[#e8eefc]">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <div className="mb-8 flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logos/wordmark-white.png" alt="AIBizConnect" className="h-6 w-auto" />
        </div>
        {course.coverImageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={course.coverImageUrl} alt="" className="mb-6 aspect-[16/9] w-full rounded-2xl object-cover" />
        )}
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-3xl font-semibold tracking-tight" style={{ fontFamily: "MontserratAlt1, Inter, sans-serif" }}>{course.title}</h1>
          {isPaid && <span className="shrink-0 rounded-full bg-white/10 px-3 py-1 text-sm font-semibold">{priceOf(course.priceCents, course.currency)}</span>}
        </div>
        {course.description && <p className="mb-10 mt-2 text-slate-400">{course.description}</p>}

        {access ? (
          <>
            <ol className="space-y-6">
              {course.lessons.map((l, i) => (
                <li key={l.id} className="rounded-2xl border border-white/10 bg-white/5 p-6">
                  <div className="mb-2 flex items-center gap-3">
                    <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#2563eb] text-sm font-bold text-white">{i + 1}</span>
                    <h2 className="text-lg font-semibold">{l.title}</h2>
                  </div>
                  {l.body && <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-300">{l.body}</p>}
                </li>
              ))}
            </ol>
            {course.lessons.length === 0 && <p className="text-slate-400">Lessons coming soon.</p>}
          </>
        ) : (
          <>
            <CoursePaywall tenantId={tenantId} courseId={courseId} priceLabel={priceOf(course.priceCents, course.currency)} isPaid={isPaid} />
            <div className="mt-8">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">What&apos;s inside</div>
              <ol className="space-y-2">
                {course.lessons.map((l, i) => (
                  <li key={l.id} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-slate-300">
                    <span className="grid h-6 w-6 place-items-center rounded bg-white/10 text-xs">{i + 1}</span>
                    <span className="flex-1 text-sm">{l.title}</span>
                    <span className="text-xs text-slate-500">🔒</span>
                  </li>
                ))}
              </ol>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
