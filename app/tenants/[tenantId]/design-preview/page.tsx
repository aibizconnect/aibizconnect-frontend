import { ComponentRenderer } from "@/components/design/ComponentRenderer";
import { getBrandMemory } from "@/lib/design/brand-memory";
import { tokensToCssVars } from "@/lib/design/tokens";

/**
 * Design-system preview (DL-2 deepening). Renders the component library with the
 * tenant's brand tokens applied as --abc-* CSS vars, proving the responsive,
 * token-themed render layer end-to-end. Internal/QA surface for the design system.
 */
export default async function DesignPreview({ params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = await params;
  const { memory } = await getBrandMemory(tenantId);
  const cssVars = tokensToCssVars(memory.tokens) as React.CSSProperties;

  return (
    <main
      style={cssVars}
      className="min-h-screen bg-[var(--abc-color-background,#0b1020)] text-[var(--abc-color-foreground,#e5e7eb)]"
    >
      <ComponentRenderer type="hero" props={{
        heading: "Premium AI, built for your business",
        subheading: "Sophisticated websites, campaigns, and automations — designed and shipped by your Agent Mesh.",
        primaryCta: { label: "Get started", href: "#" },
        secondaryCta: { label: "See how it works", href: "#" },
      }} layoutOverride={{ background: "surface" }} />

      <ComponentRenderer type="logo-cloud" props={{ heading: "Trusted by teams at", logos: [{ alt: "Northwind" }, { alt: "Acme" }, { alt: "Globex" }, { alt: "Initech" }, { alt: "Umbrella" }] }} />

      <ComponentRenderer type="feature-grid" props={{
        heading: "Everything your business needs",
        features: [
          { icon: "🌐", title: "Websites", description: "Design-system-driven pages, cohesive and on-brand." },
          { icon: "✉️", title: "Email", description: "Campaigns drafted in your voice, gated for safety." },
          { icon: "📣", title: "Social", description: "Platform-ready posts, scheduled and approved." },
        ],
      }} />

      <ComponentRenderer type="stats" props={{ stats: [
        { value: "3×", label: "faster launches" }, { value: "100%", label: "on-brand output" },
        { value: "24/7", label: "always-on agents" }, { value: "0", label: "unsafe sends" },
      ] }} layoutOverride={{ background: "surface", columns: 4 }} />

      <ComponentRenderer type="pricing-table" props={{
        heading: "Simple, scalable pricing",
        tiers: [
          { name: "Starter", price: "$49/mo", features: ["1 site", "Email agent", "Critic gate"], cta: { label: "Choose", href: "#" } },
          { name: "Growth", price: "$149/mo", features: ["3 sites", "Email + Social", "Orchestrator"], cta: { label: "Choose", href: "#" }, highlight: true },
          { name: "Scale", price: "Custom", features: ["Unlimited", "All channels", "BYOK"], cta: { label: "Contact", href: "#" } },
        ],
      }} />

      <ComponentRenderer type="testimonial" props={{ quote: "It feels like a top agency and a modern SaaS had a child.", author: "Ali", role: "Founder, AI Biz Connect" }} layoutOverride={{ background: "surface" }} />

      <ComponentRenderer type="faq" props={{ heading: "Questions, answered", items: [
        { q: "Is anything sent automatically?", a: "No — every send, spend, or call requires human approval." },
        { q: "Can I use my own brand?", a: "Yes — brand tokens drive every component, so it's always on-brand." },
      ] }} />

      <ComponentRenderer type="cta-banner" props={{ heading: "Ready to build something world-class?", subheading: "Your Agent Mesh is standing by.", cta: { label: "Start now", href: "#" } }} layoutOverride={{ background: "primary" }} />
    </main>
  );
}
