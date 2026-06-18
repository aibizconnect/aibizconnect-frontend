"use client";

import { useState } from "react";
import Link from "next/link";
import { v, btnPrimary, btnGhost, Check } from "./Shell";

/** Billing toggle + the four pricing tiers (Claude Design Pricing). Annual = 20% off. */
const TIERS = [
  { name: "Starter", tagline: "For solo pros getting online fast.", m: 39, a: 31, cta: "Start free", href: "/start",
    head: "Includes", feats: ["AI website & funnels", "CRM up to 1,000 contacts", "Email & SMS nurture", "Online booking & calendar", "1 user seat"], highlight: false },
  { name: "Pro", tagline: "For growing teams that sell.", m: 89, a: 71, cta: "Start free", href: "/start",
    head: "Everything in Starter, plus", feats: ["Unlimited contacts & pipelines", "24/7 AI concierge", "Automation workflows", "Payments & invoicing", "Up to 5 user seats"], highlight: true },
  { name: "Agency", tagline: "Manage many clients & brands.", m: 199, a: 159, cta: "Start free", href: "/start",
    head: "Everything in Pro, plus", feats: ["Multi-site & white-label", "Unlimited client sub-accounts", "Team roles & permissions", "API & advanced integrations", "Priority support"], highlight: false },
  { name: "Enterprise", tagline: "For larger teams with custom needs.", m: null, a: null, cta: "Contact sales", href: "/contact",
    head: "Everything in Agency, plus", feats: ["Custom contracts & SLA", "SSO & advanced security", "Dedicated success manager", "Onboarding & migration", "Volume pricing"], highlight: false },
];

export default function PricingPlans() {
  const [annual, setAnnual] = useState(false);
  const seg = (active: boolean): React.CSSProperties => ({
    borderRadius: v("--radius-pill"), padding: "8px 18px", fontSize: v("--text-sm"), fontWeight: 600, cursor: "pointer", border: "none",
    background: active ? v("--surface-card") : "transparent", color: active ? v("--text-strong") : v("--text-muted"), boxShadow: active ? v("--shadow-xs") : "none",
  });
  return (
    <>
      <div style={{ textAlign: "center" }}>
        <div className="inline-flex items-center gap-1" style={{ marginTop: 24, background: v("--surface-sunken"), borderRadius: v("--radius-pill"), padding: 4 }}>
          <button type="button" onClick={() => setAnnual(false)} style={seg(!annual)}>Monthly</button>
          <button type="button" onClick={() => setAnnual(true)} style={seg(annual)}>Annual</button>
          <span style={{ marginLeft: 6, marginRight: 8, fontSize: v("--text-xs"), fontWeight: 700, color: v("--green-600") }}>Save 20% yearly</span>
        </div>
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4" style={{ marginTop: 40, alignItems: "start" }}>
        {TIERS.map((t) => (
          <div key={t.name} style={{ position: "relative", background: v("--surface-card"), borderRadius: v("--radius-xl"), padding: 26, border: t.highlight ? `2px solid ${v("--border-brand")}` : `1px solid ${v("--border-subtle")}`, boxShadow: t.highlight ? v("--shadow-lg") : v("--shadow-xs") }}>
            {t.highlight && <span style={{ position: "absolute", top: -13, left: "50%", transform: "translateX(-50%)", background: v("--color-primary"), color: v("--white"), borderRadius: v("--radius-pill"), padding: "4px 14px", fontSize: v("--text-xs"), fontWeight: 700 }}>Most popular</span>}
            <h3 style={{ fontSize: v("--text-xl"), color: v("--text-strong") }}>{t.name}</h3>
            <p style={{ marginTop: 6, fontSize: v("--text-sm"), color: v("--text-muted"), minHeight: 38 }}>{t.tagline}</p>
            <div style={{ marginTop: 14, display: "flex", alignItems: "baseline", gap: 4 }}>
              {t.m === null
                ? <span style={{ fontFamily: v("--font-display"), fontSize: v("--text-3xl"), fontWeight: 700, color: v("--text-strong") }}>Custom</span>
                : <><span style={{ fontFamily: v("--font-display"), fontSize: v("--text-4xl"), fontWeight: 700, color: v("--text-strong") }}>${annual ? t.a : t.m}</span><span style={{ color: v("--text-muted"), fontSize: v("--text-sm") }}>/mo</span></>}
            </div>
            <span style={{ display: "block", fontSize: v("--text-xs"), color: v("--text-muted"), minHeight: 16 }}>{t.m === null ? "let's talk" : annual ? "billed annually" : "billed monthly"}</span>
            <Link href={t.href} style={{ ...(t.highlight ? btnPrimary : btnGhost), marginTop: 18, width: "100%" }}>{t.cta}</Link>
            <div style={{ marginTop: 22, fontSize: v("--text-xs"), fontWeight: 700, letterSpacing: v("--tracking-caps"), textTransform: "uppercase", color: v("--text-muted") }}>{t.head}</div>
            <ul style={{ listStyle: "none", padding: 0, margin: "12px 0 0", display: "grid", gap: 11 }}>
              {t.feats.map((f) => <li key={f} className="flex items-center gap-2.5" style={{ fontSize: v("--text-sm"), color: v("--text-body") }}><Check />{f}</li>)}
            </ul>
          </div>
        ))}
      </div>
      <p style={{ textAlign: "center", marginTop: 28, fontSize: v("--text-sm"), color: v("--text-muted") }}>
        All plans include SSL, hosting, unlimited pages, and the AIBizConnect mobile app. Prices in USD. Need more than Agency? <Link href="/contact" style={{ color: v("--color-primary"), fontWeight: 600 }}>Talk to sales →</Link>
      </p>
    </>
  );
}
