import type { SectionContent } from "./schemas";

/**
 * Prebuilt section templates — designed, ready-to-drop blocks with real placeholder
 * copy (professional-services / real-estate flavoured but generic). Each renders nicely
 * out of the box and stays fully editable. Surfaced in the Add panel's "Prebuilt Sections"
 * tab as draggable tiles (drag → drop on the canvas) and click-to-insert.
 */
export interface PrebuiltTemplate {
  id: string;
  name: string;
  category: "Hero" | "Content" | "Social Proof" | "Conversion";
  icon: string;          // single emoji/char for the tile
  blurb: string;         // one-line description
  sections: SectionContent[];
}

// Small helpers to keep the section objects terse + valid.
const heading = (text: string, level: "h1" | "h2" | "h3" = "h2", align: "left" | "center" | "right" = "center"): SectionContent =>
  ({ type: "heading", text, level, align });
const text = (t: string, align: "left" | "center" | "right" = "center"): SectionContent =>
  ({ type: "text", text: t, align });
const button = (label: string, variant: "solid" | "outline" = "solid", align: "left" | "center" | "right" = "center"): SectionContent =>
  ({ type: "button", label, href: "#", align, variant, size: "lg" });
const counter = (value: string, suffix: string, label: string): SectionContent =>
  ({ type: "number-counter", value, suffix, label });

export const PREBUILT_TEMPLATES: PrebuiltTemplate[] = [
  // ── HERO ────────────────────────────────────────────────────────────────────
  {
    id: "hero-lead", name: "Hero — Lead Capture", category: "Hero", icon: "🚀",
    blurb: "Bold headline + two CTAs",
    sections: [{
      type: "hero",
      heading: "Find Your Dream Home, Faster",
      subheading: "Browse exclusive listings, book showings, and get expert guidance — all in one place.",
      primaryCta: { label: "Browse Listings", href: "#listings" },
      secondaryCta: { label: "Book a Call", href: "#contact" },
    }],
  },
  {
    id: "hero-minimal", name: "Hero — Minimal Centered", category: "Hero", icon: "✨",
    blurb: "Clean centered intro + button",
    sections: [{
      type: "row", columns: 1, contentWidth: "boxed", gap: 16,
      widths: [1], minHeight: 360, valign: "center",
      _style: { paddingTop: 64, paddingBottom: 64 },
      children: [[
        heading("A Smarter Way to Grow Your Business", "h1"),
        text("Everything you need to attract, convert, and delight your clients — beautifully simple."),
        button("Get Started Free"),
      ]],
    }],
  },

  // ── CONTENT ───────────────────────────────────────────────────────────────────
  {
    id: "features-3up", name: "Features — 3 Up", category: "Content", icon: "🧩",
    blurb: "Three feature cards with icons",
    sections: [{
      type: "features",
      heading: "Why Clients Choose Us",
      features: [
        { title: "Local Expertise", description: "Decades of on-the-ground knowledge of your neighbourhood and market.", icon: "📍" },
        { title: "Full-Service", description: "From first showing to closing day, we handle every detail for you.", icon: "🤝" },
        { title: "Proven Results", description: "Hundreds of happy clients and homes sold above asking.", icon: "🏆" },
      ],
    }],
  },
  {
    id: "stats-bar", name: "Stats Bar", category: "Content", icon: "📊",
    blurb: "Four headline numbers",
    sections: [{
      type: "row", columns: 4, contentWidth: "boxed", gap: 24,
      widths: [0.25, 0.25, 0.25, 0.25],
      _style: { paddingTop: 40, paddingBottom: 40 },
      colStyles: [{ itemsAlign: "center" }, { itemsAlign: "center" }, { itemsAlign: "center" }, { itemsAlign: "center" }],
      children: [
        [counter("500", "+", "Homes Sold")],
        [counter("15", "+", "Years Experience")],
        [counter("98", "%", "Client Satisfaction")],
        [counter("24", "/7", "Support")],
      ],
    }],
  },
  {
    id: "about-split", name: "About — Image + Text", category: "Content", icon: "🖼️",
    blurb: "Two-column image and copy",
    sections: [{
      type: "row", columns: 2, contentWidth: "boxed", gap: 32, valign: "center",
      widths: [0.5, 0.5],
      _style: { paddingTop: 48, paddingBottom: 48 },
      children: [
        [{ type: "image", url: "", alt: "About our team", rounding: 16, objectFit: "cover" } as SectionContent],
        [
          heading("Meet Your Local Experts", "h2", "left"),
          text("We're a team of dedicated professionals who treat every client like family. Our mission is simple: make your next move smooth, confident, and even enjoyable.", "left"),
          button("Learn More About Us", "outline", "left"),
        ],
      ],
    }],
  },

  // ── SOCIAL PROOF ───────────────────────────────────────────────────────────────
  {
    id: "testimonials-3", name: "Testimonials — 3", category: "Social Proof", icon: "💬",
    blurb: "Three client quotes",
    sections: [{
      type: "testimonials",
      heading: "What Our Clients Say",
      items: [
        { name: "Sarah & Tom M.", role: "First-time buyers", quote: "They made a stressful process feel effortless. We found our home in two weeks!" },
        { name: "Priya K.", role: "Seller", quote: "Sold above asking in just four days. Professional, responsive, and genuinely caring." },
        { name: "James R.", role: "Investor", quote: "The market insight was invaluable. I'll never work with anyone else." },
      ],
    }],
  },
  {
    id: "faq-basic", name: "FAQ", category: "Social Proof", icon: "❓",
    blurb: "Common questions, answered",
    sections: [{
      type: "faq",
      items: [
        { q: "How much does it cost to get started?", a: "Your initial consultation is completely free — no obligation, no pressure." },
        { q: "How long does the process take?", a: "Most clients are up and running within a week. We move at your pace." },
        { q: "Do you work in my area?", a: "We serve the entire region. Reach out and we'll confirm coverage for your address." },
        { q: "Can I cancel anytime?", a: "Absolutely. There are no long-term contracts — stay because you love it." },
      ],
    }],
  },

  // ── CONVERSION ─────────────────────────────────────────────────────────────────
  {
    id: "pricing-3tier", name: "Pricing — 3 Tier", category: "Conversion", icon: "💳",
    blurb: "Starter / Pro / Premium",
    sections: [{
      type: "pricing",
      plans: [
        { name: "Starter", price: "$0", period: "/mo", features: [{ text: "1 website" }, { text: "Basic support" }, { text: "Core features" }], ctaLabel: "Start Free", ctaHref: "#" },
        { name: "Pro", price: "$49", period: "/mo", features: [{ text: "Everything in Starter" }, { text: "Priority support" }, { text: "Advanced analytics" }, { text: "Custom domain" }], ctaLabel: "Go Pro", ctaHref: "#" },
        { name: "Premium", price: "$99", period: "/mo", features: [{ text: "Everything in Pro" }, { text: "Dedicated manager" }, { text: "White-glove setup" }], ctaLabel: "Contact Sales", ctaHref: "#" },
      ],
    }],
  },
  {
    id: "cta-banner", name: "CTA Banner", category: "Conversion", icon: "📣",
    blurb: "Full-width call to action",
    sections: [{
      type: "cta",
      heading: "Ready to Make Your Move?",
      subheading: "Let's talk about your goals. Your first consultation is on us.",
      cta: { label: "Book a Free Consultation", href: "#contact" },
    }],
  },
  {
    id: "contact-simple", name: "Contact Form", category: "Conversion", icon: "✉️",
    blurb: "Name, email, message + submit",
    sections: [{
      type: "contact-form",
      heading: "Get in Touch",
      subheading: "Tell us a little about what you're looking for and we'll be in touch within one business day.",
      fields: [
        { name: "name", label: "Your Name", type: "text" },
        { name: "email", label: "Email Address", type: "email" },
        { name: "phone", label: "Phone", type: "tel" },
        { name: "message", label: "How can we help?", type: "textarea" },
      ],
      submitLabel: "Send Message",
      successMessage: "Thanks! We'll be in touch shortly.",
    }],
  },

  // ── IMAGE-LED + THEMED LOOKS (image slots auto-filled from your Media Library) ─────
  {
    id: "hero-image", name: "Hero — Image Background", category: "Hero", icon: "🌄",
    blurb: "Full-bleed photo hero",
    sections: [{
      type: "hero",
      heading: "Your Next Chapter Starts Here",
      subheading: "Stunning spaces, expert guidance, and a team that puts you first.",
      primaryCta: { label: "Get Started", href: "#contact" },
      backgroundImageUrl: "", // filled with one of your images
    }],
  },
  {
    id: "hero-split-image", name: "Hero — Split + Photo", category: "Hero", icon: "🖼️",
    blurb: "Copy left, photo right",
    sections: [{
      type: "row", columns: 2, contentWidth: "boxed", gap: 32, valign: "center", widths: [0.55, 0.45],
      _style: { paddingTop: 56, paddingBottom: 56 },
      children: [
        [
          heading("Where You Live Should Inspire You", "h1", "left"),
          text("Discover homes and spaces that match your lifestyle — handpicked and ready to tour.", "left"),
          button("Browse Now", "solid", "left"),
        ],
        [{ type: "image", url: "", alt: "Featured", rounding: 18, objectFit: "cover" } as SectionContent],
      ],
    }],
  },
  {
    id: "hero-gradient", name: "Hero — Gradient", category: "Hero", icon: "🎨",
    blurb: "Bold gradient band",
    sections: [{
      type: "row", columns: 1, contentWidth: "boxed", gap: 14, valign: "center", widths: [1], minHeight: 340,
      _style: { background: "linear-gradient(135deg,#1e3a8a,#7c3aed)", paddingTop: 72, paddingBottom: 72, borderRadius: 0 },
      children: [[
        { type: "heading", text: "Grow Faster. Stress Less.", level: "h1", align: "center", color: "#ffffff" } as SectionContent,
        { type: "text", text: "One platform for your website, leads, and clients.", align: "center", color: "#e9e9ff" } as SectionContent,
        button("Start Free Trial"),
      ]],
    }],
  },
  {
    id: "feature-cards-img", name: "Feature Cards — Photos", category: "Content", icon: "🧱",
    blurb: "Three image cards",
    sections: [{
      type: "row", columns: 3, contentWidth: "boxed", gap: 24, widths: [1 / 3, 1 / 3, 1 / 3],
      _style: { paddingTop: 48, paddingBottom: 48 },
      children: [
        [{ type: "image", url: "", alt: "", rounding: 14, objectFit: "cover" } as SectionContent, heading("Buy", "h3", "left"), text("Find the perfect place with a team that knows the market.", "left")],
        [{ type: "image", url: "", alt: "", rounding: 14, objectFit: "cover" } as SectionContent, heading("Sell", "h3", "left"), text("List with confidence and sell for the best possible price.", "left")],
        [{ type: "image", url: "", alt: "", rounding: 14, objectFit: "cover" } as SectionContent, heading("Invest", "h3", "left"), text("Build long-term wealth with data-driven opportunities.", "left")],
      ],
    }],
  },
  {
    id: "gallery-6", name: "Gallery — 6 Photos", category: "Content", icon: "🏞️",
    blurb: "Responsive photo grid",
    sections: [{ type: "gallery", images: [] }],
  },
  {
    id: "logos-row", name: "Partners / Logos", category: "Social Proof", icon: "🤝",
    blurb: "Logo strip",
    sections: [
      heading("Trusted by great teams", "h3"),
      { type: "logos", images: [] } as SectionContent,
    ],
  },
  {
    id: "testimonial-photo", name: "Testimonials — Photos", category: "Social Proof", icon: "🗣️",
    blurb: "Quotes with headshots",
    sections: [{
      type: "testimonials",
      heading: "Loved by Our Clients",
      items: [
        { name: "Sarah M.", role: "Homeowner", quote: "Truly the best experience — they went above and beyond at every step.", avatarUrl: "" },
        { name: "Daniel R.", role: "Investor", quote: "Sharp, responsive, and always honest. I recommend them to everyone.", avatarUrl: "" },
        { name: "Aisha K.", role: "First-time buyer", quote: "They made my dream of owning a home feel easy and exciting.", avatarUrl: "" },
      ],
    }],
  },
  {
    id: "cta-dark", name: "CTA — Dark Band", category: "Conversion", icon: "⬛",
    blurb: "High-contrast call to action",
    sections: [{
      type: "row", columns: 1, contentWidth: "boxed", gap: 12, valign: "center", widths: [1],
      _style: { background: "#0f172a", paddingTop: 56, paddingBottom: 56, borderRadius: 16 },
      children: [[
        { type: "heading", text: "Let's Build Something Great", level: "h2", align: "center", color: "#ffffff" } as SectionContent,
        { type: "text", text: "Book a free strategy call and see what's possible.", align: "center", color: "#cbd5e1" } as SectionContent,
        button("Book a Call"),
      ]],
    }],
  },
];

// Curated, theme-appropriate sample photos (free Unsplash CDN) used so prebuilt templates
// look finished out of the box. The user's own Media Library images take priority when present.
const u = (id: string) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=1200&q=70`;
export const DEFAULT_STOCK: string[] = [
  u("1560518883-ce09059eeffa"), // keys / handshake (real estate)
  u("1568605114967-8130f3a36994"), // modern house exterior
  u("1512917774080-9991f1c4c750"), // suburban home
  u("1505691938895-1758d7feb511"), // modern interior
  u("1502672260266-1c1ef2d93688"), // cozy living room
  u("1493809842364-78817add7ffb"), // bright interior
  u("1497366754035-f200968a6e72"), // office space
  u("1486406146926-c627a92ad1ab"), // city skyline
];
export const DEFAULT_AVATARS: string[] = [
  u("1500648767791-00dcc994a43e"),
  u("1494790108377-be9c29b29330"),
  u("1507003211169-0a1dd7228f2d"),
];

/**
 * Fill a template's image slots with images. Priority: the tenant's REAL Media Library
 * images (passed in), else the curated DEFAULT_STOCK so the template still looks finished.
 * Applied at drag/insert time. Leaves slots that already have a URL untouched.
 */
export function applyTemplateImages(sections: SectionContent[], urls: string[]): SectionContent[] {
  const pool = Array.isArray(urls) && urls.length ? urls : DEFAULT_STOCK;
  const avatars = Array.isArray(urls) && urls.length ? urls : DEFAULT_AVATARS;
  let k = 0, a = 0;
  const next = () => pool[k++ % pool.length];
  const nextAvatar = () => avatars[a++ % avatars.length];
  const walk = (node: any): any => {
    if (Array.isArray(node)) return node.map(walk);
    if (node && typeof node === "object") {
      const n: any = { ...node };
      for (const key of Object.keys(n)) if (n[key] && typeof n[key] === "object") n[key] = walk(n[key]);
      if (n.type === "image" && !n.url) n.url = next();
      else if (n.type === "hero" && !n.backgroundImageUrl) n.backgroundImageUrl = next();
      else if ((n.type === "gallery" || n.type === "logos" || n.type === "slider") && Array.isArray(n.images) && !n.images.length)
        n.images = Array.from({ length: 6 }, () => ({ url: next() }));
      else if (n.type === "testimonials" && Array.isArray(n.items))
        n.items = n.items.map((it: any) => ({ ...it, avatarUrl: it.avatarUrl || nextAvatar() }));
      return n;
    }
    return node;
  };
  return sections.map(walk);
}

export const PREBUILT_CATEGORIES: PrebuiltTemplate["category"][] = ["Hero", "Content", "Social Proof", "Conversion"];
