"use client";

import { useState } from "react";

/**
 * Section Library preview switcher (P-C). The two preset renders are server components passed in as
 * props (RSC children-as-props) — flipping the toggle just shows the other one, so the re-skin is
 * visible at a glance without any client rendering of sections.
 */
export default function SectionLibraryPreview({
  realestate,
  neutral,
  count,
}: {
  realestate: React.ReactNode;
  neutral: React.ReactNode;
  count: number;
}) {
  const [preset, setPreset] = useState<"realestate" | "neutral">("realestate");

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <div>
            <h1 className="text-base font-semibold text-slate-900">Section Library</h1>
            <p className="text-xs text-slate-500">{count} re-skinnable variants · flip the preset to watch them re-skin</p>
          </div>
          <div className="inline-flex rounded-lg border border-slate-300 bg-slate-50 p-0.5 text-sm">
            {(["realestate", "neutral"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPreset(p)}
                className={`rounded-md px-3 py-1.5 font-medium transition ${preset === p ? "bg-[#1e3a8a] text-white" : "text-slate-600 hover:text-slate-900"}`}
              >
                {p === "realestate" ? "Real Estate" : "Neutral"}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-8">
        <div className={preset === "realestate" ? "" : "hidden"}>{realestate}</div>
        <div className={preset === "neutral" ? "" : "hidden"}>{neutral}</div>
      </div>
    </div>
  );
}
