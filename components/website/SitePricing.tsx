"use client";

import { useState } from "react";
import type { Tier } from "@/lib/marketing/pricing-tiers";

/**
 * Public pricing section for a TENANT site — renders the tenant's live plan list (from their
 * Payments → Subscriptions control panel) as branded tier cards. Brand-aware via the site's
 * injected CSS vars (--primary / --font-heading). Used by the "pricing" section type; the page
 * resolves the tiers and passes them in (dynamic-section pattern, like booking/listings).
 */
export default function SitePricing({ tiers, heading, subheading }: { tiers: Tier[]; heading?: string; subheading?: string }) {
  const [annual, setAnnual] = useState(false);
  if (!tiers.length) return null;
  const showToggle = tiers.some((t) => t.m !== null && t.a !== null && t.a !== t.m);
  const primary = "var(--primary, #1e3a8a)";

  return (
    <section className="mx-auto w-full max-w-6xl px-6 py-16">
      {(heading || subheading) && (
        <div className="mb-8 text-center">
          {heading && <h2 className="text-3xl font-semibold tracking-tight" style={{ fontFamily: "var(--font-heading, inherit)" }}>{heading}</h2>}
          {subheading && <p className="mx-auto mt-2 max-w-2xl text-slate-500">{subheading}</p>}
        </div>
      )}

      {showToggle && (
        <div className="mb-8 flex justify-center">
          <div className="inline-flex items-center gap-1 rounded-full bg-slate-100 p-1">
            <button type="button" onClick={() => setAnnual(false)} className={`rounded-full px-4 py-1.5 text-sm font-semibold ${!annual ? "bg-white shadow" : "text-slate-500"}`}>Monthly</button>
            <button type="button" onClick={() => setAnnual(true)} className={`rounded-full px-4 py-1.5 text-sm font-semibold ${annual ? "bg-white shadow" : "text-slate-500"}`}>Annual</button>
            <span className="ml-1 mr-2 text-xs font-bold text-emerald-600">Save 20%</span>
          </div>
        </div>
      )}

      <div style={{ display: "grid", gap: 20, gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
        {tiers.map((t) => (
          <div key={t.name} className="relative flex flex-col rounded-2xl border bg-white p-6"
            style={{ borderColor: t.highlight ? primary : "#e2e8f0", borderWidth: t.highlight ? 2 : 1, boxShadow: t.highlight ? "0 10px 30px rgba(0,0,0,0.08)" : "0 1px 2px rgba(0,0,0,0.04)" }}>
            {t.highlight && <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-1 text-xs font-bold text-white" style={{ background: primary }}>Most popular</span>}
            <h3 className="text-lg font-semibold text-slate-900" style={{ fontFamily: "var(--font-heading, inherit)" }}>{t.name}</h3>
            {t.tagline && <p className="mt-1 min-h-[40px] text-sm text-slate-500">{t.tagline}</p>}
            <div className="mt-3 flex items-baseline gap-1">
              {t.m === null
                ? <span className="text-3xl font-bold text-slate-900">Contact us</span>
                : <><span className="text-4xl font-bold text-slate-900">${annual && t.a !== null ? t.a : t.m}</span><span className="text-sm text-slate-500">/mo</span></>}
            </div>
            <span className="mt-1 block text-xs text-slate-400">{t.m === null ? "custom pricing" : annual ? "billed annually" : "billed monthly"}</span>
            <a href={t.href || "#"} className="mt-5 block rounded-lg px-4 py-2.5 text-center text-sm font-semibold transition"
              style={t.highlight ? { background: primary, color: "#fff" } : { border: `1px solid ${primary}`, color: primary }}>{t.cta || "Get started"}</a>
            {t.head && <div className="mt-6 text-xs font-bold uppercase tracking-wide text-slate-400">{t.head}</div>}
            <ul className="mt-3 space-y-2.5">
              {t.feats.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm text-slate-600">
                  <svg viewBox="0 0 20 20" className="mt-0.5 h-4 w-4 shrink-0" style={{ color: primary }} fill="currentColor"><path d="M16.7 5.3a1 1 0 0 1 0 1.4l-7.5 7.5a1 1 0 0 1-1.4 0L3.3 9.7a1 1 0 1 1 1.4-1.4l3.1 3.1 6.8-6.8a1 1 0 0 1 1.4 0Z" /></svg>
                  {f}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
