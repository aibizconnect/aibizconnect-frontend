import type { Metadata } from "next";
import { AbcPage, CtaBand, SectionHead, CONTAINER, v, card } from "@/components/marketing/abc/Shell";
import PricingPlans from "@/components/marketing/abc/PricingPlans";
import Faq from "@/components/marketing/abc/Faq";

/**
 * Pricing — built faithfully from the Claude Design "Pricing" page (design-handoffs/pricing/),
 * on the shared AIBizConnect OS chrome. Hero · plans (billing toggle) · compare table · power-ups ·
 * trust strip · FAQ · CTA.
 */
export const metadata: Metadata = {
  title: "Pricing — AIBizConnect OS",
  description: "One plan to run your whole business. Starter $39, Pro $89, Agency $199 — every plan includes your AI-built site, CRM, and concierge. 14-day free trial, no credit card.",
};

const COMPARE = {
  cols: ["Starter", "Pro", "Premium", "Agency"],
  prices: ["$39/mo", "$89/mo", "$399/mo", "$699/mo"],
  rows: [
    ["AI website & funnel builder", "✓", "✓", "✓", "✓"],
    ["CRM contacts", "1,000", "Unlimited", "Unlimited", "Unlimited"],
    ["Sales pipelines", "1", "Unlimited", "Unlimited", "Unlimited"],
    ["Email & SMS nurture", "✓", "✓", "✓", "✓"],
    ["24/7 AI concierge", "—", "✓", "✓", "✓"],
    ["Automation workflows", "—", "✓", "✓", "✓"],
    ["Payments & invoicing", "—", "✓", "✓", "✓"],
    ["Advanced analytics & reporting", "—", "—", "✓", "✓"],
    ["White-label & multi-site", "—", "—", "—", "✓"],
    ["Client sub-accounts", "—", "—", "—", "Unlimited"],
    ["User seats", "1", "5", "15", "Unlimited"],
    ["Support", "Email", "Priority", "Priority", "Priority + CSM"],
  ],
};
const POWERUPS = [
  { name: "Extra AI credits", price: "+$19/mo", body: "More concierge conversations and AI-generated content beyond your plan limit." },
  { name: "Dedicated phone number", price: "+$12/mo", body: "A local number for SMS and call tracking, wired straight into your CRM." },
  { name: "Priority onboarding", price: "+$99 once", body: "A specialist imports your data and sets up your first funnels and automations." },
];
const TRUST = [
  { t: "14-day free trial", d: "Full access, no credit card. Cancel anytime." },
  { t: "No lock-in", d: "Month-to-month. Export your data whenever you like." },
  { t: "Cancel anytime", d: "No contracts or cancellation fees, ever." },
  { t: "Bank-grade security", d: "Encryption in transit & at rest, SOC 2 ready." },
];
const FAQ = [
  { q: "Can I try it before paying?", a: "Yes — every plan starts with a 14-day free trial with full access. No credit card required, and you can cancel anytime during the trial." },
  { q: "What counts as a \"contact\"?", a: "A contact is any unique person stored in your CRM. Duplicate detection keeps your count accurate, and you can archive contacts you no longer need." },
  { q: "Can I switch plans later?", a: "Anytime — upgrade or downgrade from your billing settings. Changes are prorated, so you only pay for what you use." },
  { q: "Do you offer annual billing?", a: "Yes. Switch to annual and save 20% versus monthly. You can change billing cadence whenever you like." },
  { q: "Is there a discount for agencies?", a: "The Agency plan is built for multi-client work with white-label and sub-accounts. For volume needs beyond that, talk to sales about custom pricing." },
  { q: "What happens to my data if I cancel?", a: "Your data is yours. Export contacts, content, and site files anytime — there's no lock-in and no cancellation fee." },
];

export default function PricingPage() {
  return (
    <AbcPage>
      {/* HERO + PLANS */}
      <section style={{ background: "radial-gradient(110% 60% at 50% -5%, var(--blue-50) 0%, var(--surface-page) 60%)" }}>
        <div className={`${CONTAINER}`} style={{ paddingTop: 72 }}>
          <SectionHead eyebrow="Simple pricing" title="A plan for every stage of growth" sub="Every plan includes your AI-built site, CRM, and concierge. Start free for 14 days — no credit card, cancel anytime." />
        </div>
        <div className="mx-auto w-full max-w-[1300px] px-6" style={{ paddingBottom: 80 }}>
          <PricingPlans />
        </div>
      </section>

      {/* COMPARE */}
      <section style={{ background: v("--surface-card") }}>
        <div className={`${CONTAINER}`} style={{ paddingTop: 80, paddingBottom: 80 }}>
          <SectionHead eyebrow="Compare plans" title="Everything in every plan, side by side" />
          <div style={{ marginTop: 40, overflowX: "auto", border: `1px solid ${v("--border-subtle")}`, borderRadius: v("--radius-xl") }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 760, fontSize: v("--text-sm") }}>
              <thead>
                <tr style={{ background: v("--surface-page") }}>
                  <th style={{ textAlign: "left", padding: "16px 18px", color: v("--text-muted"), fontWeight: 600 }}>Features</th>
                  {COMPARE.cols.map((c, i) => (
                    <th key={c} style={{ textAlign: "center", padding: "14px 18px", color: v("--text-strong") }}>
                      <div style={{ fontFamily: v("--font-display"), fontWeight: 700 }}>{c}</div>
                      <div style={{ fontSize: v("--text-xs"), color: v("--text-muted"), fontWeight: 500 }}>{COMPARE.prices[i]}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {COMPARE.rows.map((r, ri) => (
                  <tr key={r[0]} style={{ borderTop: `1px solid ${v("--border-subtle")}`, background: ri % 2 ? v("--surface-page") : v("--surface-card") }}>
                    <td style={{ padding: "13px 18px", color: v("--text-body"), fontWeight: 500 }}>{r[0]}</td>
                    {r.slice(1).map((cell, ci) => (
                      <td key={ci} style={{ textAlign: "center", padding: "13px 18px", color: cell === "—" ? v("--text-muted") : cell === "✓" ? v("--green-600") : v("--text-strong"), fontWeight: cell === "✓" || cell === "—" ? 700 : 600 }}>{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* POWER-UPS */}
      <section style={{ background: v("--surface-page") }}>
        <div className={`${CONTAINER}`} style={{ paddingTop: 80, paddingBottom: 64 }}>
          <SectionHead eyebrow="Power-ups" title="Add only what you need" sub="Optional extras that bolt onto any plan. Turn them on and off anytime." />
          <div className="grid gap-6 md:grid-cols-3" style={{ marginTop: 40 }}>
            {POWERUPS.map((p) => (
              <div key={p.name} style={card}>
                <div className="flex items-baseline justify-between gap-3">
                  <h3 style={{ fontSize: v("--text-lg"), color: v("--text-strong") }}>{p.name}</h3>
                  <span style={{ fontFamily: v("--font-display"), fontWeight: 700, color: v("--color-primary"), fontSize: v("--text-md") }}>{p.price}</span>
                </div>
                <p style={{ marginTop: 8, fontSize: v("--text-sm"), color: v("--text-body"), lineHeight: 1.6 }}>{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TRUST STRIP */}
      <section style={{ background: v("--surface-card") }}>
        <div className={`${CONTAINER} grid gap-6 sm:grid-cols-2 lg:grid-cols-4`} style={{ paddingTop: 48, paddingBottom: 48 }}>
          {TRUST.map((t) => (
            <div key={t.t}>
              <div style={{ fontFamily: v("--font-display"), fontWeight: 600, fontSize: v("--text-md"), color: v("--text-strong") }}>{t.t}</div>
              <p style={{ marginTop: 6, fontSize: v("--text-sm"), color: v("--text-muted"), lineHeight: 1.55 }}>{t.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section style={{ background: v("--surface-page") }}>
        <div className={`${CONTAINER}`} style={{ paddingTop: 80, paddingBottom: 80 }}>
          <SectionHead eyebrow="Questions" title="Pricing FAQ" />
          <Faq items={FAQ} />
        </div>
      </section>

      <CtaBand heading="Start free. Upgrade when you're ready." sub="14 days on us — your AI gets to work the moment you sign up." note="No credit card required · cancel anytime" />
    </AbcPage>
  );
}
