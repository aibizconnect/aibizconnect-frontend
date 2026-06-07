import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCourse } from "@/lib/memberships";

export const metadata: Metadata = { title: "Course" };

/** Public course viewer (member hub) — brand-themed, clean lesson list + reader. */
export default async function LearnPage({ params }: { params: Promise<{ tenantId: string; courseId: string }> }) {
  const { tenantId, courseId } = await params;
  let course = null;
  try { course = await getCourse(tenantId, courseId); } catch { /* tables not applied */ }
  if (!course || course.status !== "published") notFound();

  const vars = { "--abc-color-accent": "#22d3ee" } as React.CSSProperties;
  return (
    <div style={vars} className="min-h-screen bg-[#0a1224] text-[#e8eefc]">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <div className="mb-8 flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logos/wordmark-white.png" alt="AIBizConnect" className="h-6 w-auto" />
        </div>
        <h1 className="text-3xl font-semibold tracking-tight" style={{ fontFamily: "MontserratAlt1, Inter, sans-serif" }}>{course.title}</h1>
        {course.description && <p className="mb-10 mt-2 text-slate-400">{course.description}</p>}

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
      </div>
    </div>
  );
}
