import type { Metadata } from "next";
import { AbcPage, SectionHead, CONTAINER, v, card } from "@/components/marketing/abc/Shell";
import ContactForm from "@/components/marketing/abc/ContactForm";

export const metadata: Metadata = {
  title: "Contact — AIBizConnect OS",
  description: "Talk to the AIBizConnect team — or start free and let AI build your platform in minutes.",
};

const WAYS = [
  { icon: "💬", title: "Chat with sales", body: "Questions about plans, migration, or agencies? We'll help you find the right fit." },
  { icon: "🚀", title: "Start free instead", body: "Skip the call — answer a few questions and AI builds your platform in minutes.", href: "/start" },
  { icon: "📚", title: "Browse resources", body: "Guides, webinars, and playbooks to get the most out of your OS.", href: "/resources" },
];

export default function ContactPage() {
  return (
    <AbcPage>
      <section style={{ background: "radial-gradient(110% 60% at 50% -5%, var(--blue-50) 0%, var(--surface-page) 60%)" }}>
        <div className={`${CONTAINER}`} style={{ paddingTop: 72, paddingBottom: 40 }}>
          <SectionHead eyebrow="Contact" title="Let's talk about your business" sub="Tell us what you're working on and we'll point you to the fastest path — or start free and your AI gets to work immediately." />
        </div>
      </section>
      <section style={{ background: v("--surface-page") }}>
        <div className={`${CONTAINER} grid gap-10 lg:grid-cols-[1.2fr_0.8fr]`} style={{ paddingBottom: 80 }}>
          <ContactForm />
          <div style={{ display: "grid", gap: 16, alignContent: "start" }}>
            {WAYS.map((w) => {
              const inner = (
                <div style={{ ...card, height: "100%" }}>
                  <div style={{ display: "grid", placeItems: "center", width: 44, height: 44, borderRadius: v("--radius-lg"), background: v("--blue-50"), fontSize: 20 }}>{w.icon}</div>
                  <h3 style={{ marginTop: 14, fontSize: v("--text-md"), color: v("--text-strong") }}>{w.title}</h3>
                  <p style={{ marginTop: 6, fontSize: v("--text-sm"), color: v("--text-body"), lineHeight: 1.55 }}>{w.body}</p>
                </div>
              );
              return w.href ? <a key={w.title} href={w.href} style={{ textDecoration: "none" }}>{inner}</a> : <div key={w.title}>{inner}</div>;
            })}
          </div>
        </div>
      </section>
    </AbcPage>
  );
}
