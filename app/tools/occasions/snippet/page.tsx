import Link from "next/link";
import type { Metadata } from "next";
import { getSnippetForDomain } from "@/lib/server/occasion-widget";
import CopyBox from "./CopyBox";

/**
 * Public "get your snippet" / thank-you page for the Occasions Widget lead-gen tool (D-398..402).
 * The GHL funnel thank-you page links here with ?d=<the domain they registered>; we look up their
 * embed snippet and show the paste-in-<head> instructions. Standalone branded chrome (no tenant nav).
 */
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Your Occasions widget — AIBizConnect", robots: { index: false } };

const NAVY = "#1e3a8a";

export default async function OccasionsSnippetPage({ searchParams }: { searchParams: Promise<{ d?: string }> }) {
  const { d } = await searchParams;
  const reg = d ? await getSnippetForDomain(d).catch(() => null) : null;

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
        {!reg ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-100 text-2xl">✓</div>
            <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-900">Thanks for submitting!</h1>
            <p className="mx-auto mt-2 max-w-md text-slate-500">
              {d ? <>We’re setting up festive occasions for <b style={{ color: NAVY }}>{d}</b>.</> : "We’re setting up your festive occasions."} Please <b>check your email</b> — we’ve sent your one-line snippet and simple steps to add it to your website.
            </p>
            <p className="mx-auto mt-4 max-w-md text-xs text-slate-400">
              Don’t see it within a minute or two? Check your spam folder, or it may still be on its way.
            </p>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <span className="inline-block rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">You’re registered ✓</span>
              <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-900">Add festive occasions to <span style={{ color: NAVY }}>{reg.domain}</span></h1>
              <p className="mt-2 text-slate-500">Paste this one line just before <code className="rounded bg-slate-100 px-1.5 py-0.5 text-[13px]">&lt;/head&gt;</code> on your website. Holidays, sales, and seasonal animations will appear automatically on the right dates — and you can change them any time.</p>
            </div>

            <CopyBox value={reg.snippet} />

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              {[
                { n: "1", t: "Copy the snippet", d: "Use the Copy button above." },
                { n: "2", t: "Paste in your <head>", d: "Most site builders have a “custom code / header scripts” box." },
                { n: "3", t: "You’re done", d: "Active occasions show automatically — only on your registered site." },
              ].map((s) => (
                <div key={s.n} className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="grid h-7 w-7 place-items-center rounded-full text-sm font-bold text-white" style={{ background: NAVY }}>{s.n}</div>
                  <div className="mt-2 text-sm font-semibold text-slate-800">{s.t}</div>
                  <div className="mt-0.5 text-xs text-slate-500">{s.d}</div>
                </div>
              ))}
            </div>

            <div className="mt-8 rounded-xl border border-slate-200 bg-white p-5">
              <div className="text-sm font-semibold text-slate-800">Customize what shows</div>
              <p className="mt-1 text-sm text-slate-500">Choose your holidays, add a custom sale banner, or pick animations and dates.</p>
              <Link href={reg.manageUrl} className="mt-3 inline-block rounded-lg px-4 py-2 text-sm font-medium text-white" style={{ background: NAVY }}>Open my Occasions settings →</Link>
            </div>
          </>
        )}
      </div>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-3xl px-6 py-6 text-center text-xs text-slate-400">
          Powered by <span className="font-semibold" style={{ color: NAVY }}>AIBizConnect</span> — the AI Business OS.
        </div>
      </footer>
    </main>
  );
}
