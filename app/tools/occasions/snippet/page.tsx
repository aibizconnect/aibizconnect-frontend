import type { Metadata } from "next";

/**
 * Public thank-you page for the Occasions Widget lead-gen tool (D-398..402).
 * The GHL funnel thank-you page links here with ?d=<the domain they registered>.
 *
 * IMPORTANT (Ali, 2026-06-21): the embed snippet is delivered ONLY by email — it is intentionally
 * NOT shown on this page. That forces registrants to give a real, working email address (which is
 * the lead we capture). The email carries the snippet + the link to their Occasions settings.
 */
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Thanks for submitting — AIBizConnect Occasions", robots: { index: false } };

const NAVY = "#1e3a8a";

export default async function OccasionsSnippetPage({ searchParams }: { searchParams: Promise<{ d?: string }> }) {
  const { d } = await searchParams;

  return (
    <main className="min-h-screen bg-slate-50 text-slate-800">
      {/* header */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center gap-2 px-6 py-4">
          <span className="grid h-8 w-8 place-items-center rounded-lg text-white" style={{ background: NAVY }}>🎉</span>
          <span className="text-lg font-semibold tracking-tight" style={{ color: NAVY }}>AIBizConnect <span className="font-normal text-slate-400">Occasions</span></span>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-6 py-10">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-100 text-2xl">✓</div>
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-900">Thanks for submitting!</h1>
          <p className="mx-auto mt-2 max-w-md text-slate-500">
            {d ? <>We’re setting up festive occasions for <b style={{ color: NAVY }}>{d}</b>.</> : "We’re setting up your festive occasions."} Please <b>check your email</b> — we’ve sent your one-line snippet and simple steps to add it to your website.
          </p>

          <div className="mx-auto mt-6 max-w-md rounded-xl border border-slate-200 bg-slate-50 p-4 text-left">
            <div className="text-sm font-semibold text-slate-700">What to do next</div>
            <ol className="mt-2 space-y-1.5 text-sm text-slate-500">
              <li><b className="text-slate-600">1.</b> Open the email from AIBizConnect Occasions.</li>
              <li><b className="text-slate-600">2.</b> Copy the one-line snippet and paste it before <code className="rounded bg-white px-1 py-0.5 text-[12px]">&lt;/head&gt;</code> on your site.</li>
              <li><b className="text-slate-600">3.</b> Use the link in the email to choose your holidays and animations.</li>
            </ol>
          </div>

          <p className="mx-auto mt-5 max-w-md text-xs text-slate-400">
            Don’t see it within a minute or two? Check your spam folder. If it still hasn’t arrived, the email address may have a typo — just submit the form again with the correct address.
          </p>
        </div>
      </div>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-3xl px-6 py-6 text-center text-xs text-slate-400">
          Powered by <span className="font-semibold" style={{ color: NAVY }}>AIBizConnect</span> — the AI Business OS.
        </div>
      </footer>
    </main>
  );
}
