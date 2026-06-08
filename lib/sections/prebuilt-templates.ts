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
  category: "Contemporary Luxury" | "Hero" | "Content" | "Social Proof" | "Conversion";
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

// ── Contemporary Luxury design system (the saved "template") ────────────────────
// Warm ivory + ink + champagne-gold, Playfair Display headings over Inter body.
// Self-contained: every element sets explicit colors/fonts so the look holds in ANY
// site theme. Mirrors public/design-preview/contemporary-luxury.html.
const LX = { ink: "#1A1714", body: "#5C544B", gold: "#B08D57", ivory: "#F7F4EF", white: "#FFFFFF", panel: "#F1EADD", hair: "#E4DCCE" } as const;
const SERIF = "Playfair Display", SANS = "Inter";
type Align = "left" | "center" | "right";
const lxEyebrow = (t: string, align: Align = "center"): SectionContent =>
  ({ type: "text", text: t, align, color: LX.gold, fontFamily: SANS, fontSize: 13, fontWeight: "600", letterSpacing: 2.2, textTransform: "uppercase" } as SectionContent);
const lxH = (t: string, level: "h1" | "h2" | "h3" = "h2", align: Align = "center", fontSize?: number): SectionContent =>
  ({ type: "heading", text: t, level, align, color: LX.ink, fontFamily: SERIF, fontWeight: "600", letterSpacing: -0.4, ...(fontSize ? { fontSize } : {}) } as SectionContent);
const lxBody = (t: string, align: Align = "center"): SectionContent =>
  ({ type: "text", text: t, align, color: LX.body, fontFamily: SANS, fontSize: 17, lineHeight: 1.75 } as SectionContent);
const lxBtn = (label: string, o: { variant?: "solid" | "outline"; bg?: string; fg?: string; hover?: string; align?: Align }): SectionContent =>
  ({ type: "button", label, href: "#", align: o.align ?? "center", size: "lg", variant: o.variant ?? "solid", bgColor: o.bg, textColor: o.fg, radius: 0, fontFamily: SANS, fontWeight: "600", hover: o.hover ?? "lift" } as SectionContent);
const lxCounter = (start: number, end: number, suffix: string, label: string): SectionContent =>
  ({ type: "number-counter", value: String(end), start, end, duration: 2, suffix, label } as SectionContent);
const lxCard = { bg: LX.white, borderStyle: "solid", borderWidth: 1, borderColor: LX.hair, shadow: "soft", pt: 40, pb: 40, pl: 34, pr: 34, radius: 2 };

const LUXURY_TEMPLATES: PrebuiltTemplate[] = [
  {
    id: "lux-hero", name: "Luxury — Hero", category: "Contemporary Luxury", icon: "◆",
    blurb: "Ivory hero, serif headline, dual CTAs",
    sections: [{
      type: "row", columns: 1, contentWidth: "boxed", gap: 18, valign: "center", widths: [1], minHeight: 600,
      _style: { bg: LX.ivory, pt: 140, pb: 120, paddingX: 24, align: "center" }, _anim: { entrance: "fade-in" },
      children: [[
        lxEyebrow("Bespoke Atelier"),
        lxH("Spaces composed with intention, crafted to endure.", "h1", "center", 60),
        lxBody("A considered approach — where material, light and proportion meet restraint. Built for those who value the quiet confidence of timeless design."),
        {
          type: "row", columns: 2, contentWidth: "boxed", gap: 14, widths: [0.5, 0.5],
          _style: { pt: 14 },
          children: [
            [lxBtn("Book a consultation", { variant: "solid", bg: LX.ink, fg: LX.ivory, hover: "lift", align: "right" })],
            [lxBtn("View portfolio", { variant: "outline", bg: LX.ink, fg: LX.ink, hover: "fill", align: "left" })],
          ],
        } as SectionContent,
      ]],
    }],
  },
  {
    id: "lux-features", name: "Luxury — Feature Trio", category: "Contemporary Luxury", icon: "❖",
    blurb: "Three bordered cards on ivory",
    sections: [
      { type: "row", columns: 1, contentWidth: "boxed", gap: 12, widths: [1], _style: { bg: LX.ivory, pt: 112, pb: 36, paddingX: 24, align: "center" }, _anim: { entrance: "fade-up" },
        children: [[lxEyebrow("What we offer"), lxH("A practice built on detail", "h2")]] },
      { type: "row", columns: 3, contentWidth: "boxed", gap: 30, widths: [1 / 3, 1 / 3, 1 / 3],
        _style: { bg: LX.ivory, pt: 0, pb: 112, paddingX: 24 }, _anim: { entrance: "fade-up" },
        colStyles: [lxCard, lxCard, lxCard] as any,
        children: [
          [{ type: "text", text: "◇", align: "left", color: LX.gold, fontSize: 26 } as SectionContent, lxH("Full-service design", "h3", "left", 22), lxBody("From first sketch to final styling — a single, coherent vision carried through every room.", "left")],
          [{ type: "text", text: "❖", align: "left", color: LX.gold, fontSize: 26 } as SectionContent, lxH("Material curation", "h3", "left", 22), lxBody("Natural stone, aged brass, hand-finished timber. Sourced for warmth and longevity.", "left")],
          [{ type: "text", text: "✦", align: "left", color: LX.gold, fontSize: 26 } as SectionContent, lxH("Project stewardship", "h3", "left", 22), lxBody("Discreet, precise project management so the experience feels as refined as the result.", "left")],
        ] },
    ],
  },
  {
    id: "lux-stats", name: "Luxury — Stat Counters", category: "Contemporary Luxury", icon: "✦",
    blurb: "Animated counters, hairline band",
    sections: [{
      type: "row", columns: 3, contentWidth: "boxed", gap: 24, widths: [1 / 3, 1 / 3, 1 / 3],
      _style: { bg: LX.ivory, pt: 92, pb: 92, paddingX: 24, borderStyle: "solid", borderWidth: 1, borderColor: LX.hair }, _anim: { entrance: "fade-up" },
      colStyles: [{ itemsAlign: "center" }, { itemsAlign: "center" }, { itemsAlign: "center" }] as any,
      children: [
        [lxCounter(0, 120, "+", "Residences")],
        [lxCounter(0, 18, "", "Years of craft")],
        [lxCounter(0, 100, "%", "Bespoke")],
      ],
    }],
  },
  {
    id: "lux-testimonial", name: "Luxury — Testimonial", category: "Contemporary Luxury", icon: "❝",
    blurb: "Serif italic quote, gold attribution",
    sections: [{
      type: "row", columns: 1, contentWidth: "boxed", gap: 14, widths: [1], valign: "center",
      _style: { bg: LX.white, pt: 116, pb: 116, paddingX: 24, align: "center", width: "normal" }, _anim: { entrance: "fade-up" },
      children: [[
        lxEyebrow("Client"),
        { type: "text", text: "“They understood the home before we could describe it. The result is quiet, warm, and unmistakably ours.”", align: "center", color: LX.ink, fontFamily: SERIF, italic: true, fontSize: 25, lineHeight: 1.5 } as SectionContent,
        { type: "text", text: "— A private residence, Mayfair", align: "center", color: LX.gold, fontFamily: SANS, fontSize: 14, letterSpacing: 1.4, textTransform: "uppercase" } as SectionContent,
      ]],
    }],
  },
  {
    id: "lux-cta", name: "Luxury — CTA Panel", category: "Contemporary Luxury", icon: "✷",
    blurb: "Gold-tinted panel, glow button",
    sections: [{
      type: "row", columns: 1, contentWidth: "boxed", gap: 16, widths: [1], valign: "center",
      _style: { bg: LX.panel, pt: 124, pb: 124, paddingX: 24, align: "center", borderStyle: "solid", borderWidth: 1, borderColor: LX.hair }, _anim: { entrance: "fade-up" },
      children: [[
        { type: "divider", thickness: 2, color: LX.gold, widthPct: 6 } as SectionContent,
        lxH("Begin your commission", "h2"),
        lxBody("A limited number of projects each season, given the attention each deserves."),
        lxBtn("Enquire now", { variant: "solid", bg: LX.gold, fg: "#ffffff", hover: "glow" }),
      ]],
    }],
  },
];

export const PREBUILT_TEMPLATES: PrebuiltTemplate[] = [
  ...LUXURY_TEMPLATES,
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

export const PREBUILT_CATEGORIES: PrebuiltTemplate["category"][] = ["Contemporary Luxury", "Hero", "Content", "Social Proof", "Conversion"];
