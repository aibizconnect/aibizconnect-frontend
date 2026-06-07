"use client";

import { useState } from "react";
import Link from "next/link";

/**
 * Onboarding wizard (Branch B, v1: steps 1–3 + generate) — the "supervised AI
 * business-launch system" front door. Lite email up front, animated industry picker,
 * cascading location, then one click generates a pre-branded DRAFT multipage site.
 * Nothing publishes/charges — review & publish happens later in the tenant workspace.
 */

type TemplateCard = { key: string; label: string; industry: string; tagline: string; pageCount: number; brandHint: { primary: string; accent: string; mood: string } };

const COUNTRIES: Record<string, string[]> = {
  Canada: ["Alberta", "British Columbia", "Manitoba", "New Brunswick", "Newfoundland and Labrador", "Nova Scotia", "Ontario", "Prince Edward Island", "Quebec", "Saskatchewan"],
  "United States": ["Alabama", "Alaska", "Arizona", "California", "Colorado", "Florida", "Georgia", "Illinois", "Massachusetts", "Michigan", "New York", "Ohio", "Texas", "Washington"],
};

export default function OnboardingWizard({ templates }: { templates: TemplateCard[] }) {
  const [step, setStep] = useState(1);
  const [businessName, setBusinessName] = useState("");
  const [email, setEmail] = useState("");
  const [templateKey, setTemplateKey] = useState("");
  const [country, setCountry] = useState("Canada");
  const [region, setRegion] = useState("");
  const [city, setCity] = useState("");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ previewPath: string; dashboardPath: string; pages: number } | null>(null);

  const selected = templates.find((t) => t.key === templateKey);
  const canNext = step === 1 ? businessName.trim().length >= 2 && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) : step === 2 ? !!templateKey : true;

  async function generate() {
    setError(null); setGenerating(true);
    try {
      const r = await fetch("/api/onboarding/start", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessName, email, templateKey, location: { country, region, city } }),
      });
      const j = await r.json();
      if (j.status === "ok" && j.result?.ok) {
        setResult({ previewPath: j.result.previewPath, dashboardPath: j.result.dashboardPath, pages: j.result.apply?.pages?.length ?? 0 });
      } else setError(j.result?.error ?? j.error ?? "Something went wrong. Please try again.");
    } catch (e) { setError((e as Error).message); }
    finally { setGenerating(false); }
  }

  const vars = { "--p": selected?.brandHint.primary ?? "#2563eb", "--a": selected?.brandHint.accent ?? "#22d3ee" } as React.CSSProperties;

  return (
    <div className="min-h-screen bg-[#0a1224] text-[#e8eefc]" style={vars}>
      <div className="mx-auto grid min-h-screen max-w-6xl gap-8 px-6 py-10 lg:grid-cols-[1.1fr_0.9fr]">
        {/* LEFT — steps */}
        <div className="flex flex-col">
          <Link href="/" className="mb-8 inline-flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logos/wordmark-white.png" alt="AIBizConnect" className="h-6 w-auto" />
          </Link>

          {!result && (
            <>
              {/* progress */}
              <div className="mb-8 flex items-center gap-2">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="flex flex-1 items-center gap-2">
                    <span className={`grid h-7 w-7 place-items-center rounded-full text-xs font-semibold ${step >= n ? "bg-[var(--p)] text-white" : "bg-white/10 text-slate-400"}`}>{n}</span>
                    {n < 3 && <span className={`h-0.5 flex-1 rounded ${step > n ? "bg-[var(--p)]" : "bg-white/10"}`} />}
                  </div>
                ))}
              </div>

              {step === 1 && (
                <div className="space-y-5">
                  <div>
                    <h1 className="text-3xl font-semibold tracking-tight">Let&apos;s launch your business</h1>
                    <p className="mt-2 text-slate-400">Tell us who you are. No credit card — your site stays private until you publish.</p>
                  </div>
                  <label className="block">
                    <span className="text-sm text-slate-300">Business name</span>
                    <input value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="e.g. Ali Realty"
                      className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 outline-none focus:border-[var(--a)]" />
                  </label>
                  <label className="block">
                    <span className="text-sm text-slate-300">Email</span>
                    <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="you@business.com"
                      className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 outline-none focus:border-[var(--a)]" />
                  </label>
                </div>
              )}

              {step === 2 && (
                <div>
                  <h1 className="text-3xl font-semibold tracking-tight">Pick your industry</h1>
                  <p className="mt-2 text-slate-400">We&apos;ll generate a complete, on-brand site tailored to it.</p>
                  <div className="mt-5 grid max-h-[52vh] grid-cols-2 gap-3 overflow-y-auto pr-1 sm:grid-cols-3">
                    {templates.map((t) => (
                      <button key={t.key} type="button" onClick={() => setTemplateKey(t.key)}
                        className={`group rounded-xl border p-3 text-left transition hover:-translate-y-0.5 hover:shadow-lg ${templateKey === t.key ? "border-[var(--a)] bg-white/10" : "border-white/10 bg-white/5"}`}>
                        <div className="h-10 w-full rounded-md transition group-hover:scale-[1.02]" style={{ background: `linear-gradient(135deg, ${t.brandHint.primary}, ${t.brandHint.accent})` }} />
                        <div className="mt-2 text-sm font-medium">{t.label}</div>
                        <div className="text-[11px] text-slate-400">{t.tagline}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-5">
                  <div>
                    <h1 className="text-3xl font-semibold tracking-tight">Where do you operate?</h1>
                    <p className="mt-2 text-slate-400">This tailors your local SEO and copy — &ldquo;serving {city || "your city"}&rdquo;.</p>
                  </div>
                  <label className="block">
                    <span className="text-sm text-slate-300">Country</span>
                    <select value={country} onChange={(e) => { setCountry(e.target.value); setRegion(""); }}
                      className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 outline-none focus:border-[var(--a)]">
                      {Object.keys(COUNTRIES).map((c) => <option key={c} value={c} className="bg-[#0a1224]">{c}</option>)}
                    </select>
                  </label>
                  <label className="block">
                    <span className="text-sm text-slate-300">State / Province</span>
                    <select value={region} onChange={(e) => setRegion(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 outline-none focus:border-[var(--a)]">
                      <option value="" className="bg-[#0a1224]">Select…</option>
                      {(COUNTRIES[country] ?? []).map((r) => <option key={r} value={r} className="bg-[#0a1224]">{r}</option>)}
                    </select>
                  </label>
                  <label className="block">
                    <span className="text-sm text-slate-300">City / Area</span>
                    <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. Richmond Hill"
                      className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 outline-none focus:border-[var(--a)]" />
                  </label>
                </div>
              )}

              {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

              <div className="mt-8 flex items-center justify-between">
                <button onClick={() => setStep((s) => Math.max(1, s - 1))} disabled={step === 1}
                  className="rounded-lg px-4 py-2 text-sm text-slate-400 hover:text-white disabled:opacity-0">← Back</button>
                {step < 3 ? (
                  <button onClick={() => setStep((s) => s + 1)} disabled={!canNext}
                    className="rounded-lg bg-[var(--p)] px-6 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-40">Continue</button>
                ) : (
                  <button onClick={generate} disabled={generating}
                    className="rounded-lg bg-[var(--p)] px-6 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50">
                    {generating ? "Generating your site…" : "✨ Generate my site"}
                  </button>
                )}
              </div>
            </>
          )}

          {result && (
            <div className="flex flex-1 flex-col justify-center">
              <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-8">
                <h1 className="text-3xl font-semibold tracking-tight">🎉 Your site is ready</h1>
                <p className="mt-2 text-slate-300">We generated {result.pages} on-brand page{result.pages === 1 ? "" : "s"} for <strong>{businessName}</strong>. It&apos;s a private draft — review it, then publish when it&apos;s perfect.</p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <a href={result.previewPath} target="_blank" rel="noreferrer" className="rounded-lg bg-[var(--p)] px-6 py-2.5 text-sm font-medium text-white hover:opacity-90">Preview my site ↗</a>
                  <Link href={result.dashboardPath} className="rounded-lg border border-white/15 px-6 py-2.5 text-sm font-medium hover:bg-white/5">Go to my dashboard</Link>
                </div>
                <p className="mt-4 text-xs text-slate-400">Next: customize in the editor, then publish (our AI quality check runs automatically). Full signup happens at publish.</p>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT — live preview */}
        <div className="hidden lg:block">
          <div className="sticky top-10 rounded-2xl border border-white/10 bg-[#0f1b33] p-3 shadow-2xl">
            <div className="mb-3 flex items-center gap-1.5 px-1">
              <span className="h-3 w-3 rounded-full bg-red-400/70" /><span className="h-3 w-3 rounded-full bg-amber-400/70" /><span className="h-3 w-3 rounded-full bg-emerald-400/70" />
              <span className="ml-3 truncate rounded bg-[#0a1224] px-2 py-0.5 font-mono text-[10px] text-slate-400">{(businessName ? businessName.toLowerCase().replace(/[^a-z0-9]+/g, "") : "yoursite") + ".aibizconnect.app"}</span>
            </div>
            <div className="overflow-hidden rounded-xl bg-[#0a1224]">
              <div className="p-6" style={{ background: `linear-gradient(135deg, var(--p), var(--a))` }}>
                <div className="h-2.5 w-20 rounded bg-white/40" />
                <div className="mt-4 text-2xl font-semibold text-white" style={{ fontFamily: "MontserratAlt1, Inter, sans-serif" }}>{businessName || "Your Business"}</div>
                <div className="mt-1 text-sm text-white/80">{selected?.tagline ?? "Pick an industry to preview"}</div>
                {city && <div className="mt-2 text-xs text-white/70">Serving {city}{region ? `, ${region}` : ""}</div>}
                <div className="mt-4 flex gap-2"><div className="h-7 w-24 rounded-lg bg-white/90" /><div className="h-7 w-24 rounded-lg border border-white/40" /></div>
              </div>
              <div className="grid grid-cols-3 gap-2 p-4">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="rounded-lg border border-white/10 p-2">
                    <div className="h-5 w-5 rounded" style={{ background: "var(--a)", opacity: 0.5 }} />
                    <div className="mt-2 h-1.5 w-full rounded bg-white/15" /><div className="mt-1 h-1.5 w-2/3 rounded bg-white/10" />
                  </div>
                ))}
              </div>
            </div>
            <p className="mt-3 px-1 text-center text-[11px] text-slate-400">Live preview · updates as you choose</p>
          </div>
        </div>
      </div>
    </div>
  );
}
