import type { ComponentType, Layout } from "./components";
import { validateComponent } from "./components";

/**
 * Industry Template Library (DL-2, "templates for all sorts of industries").
 *
 * Each template is a design-system-native BLUEPRINT: an ordered list of components
 * (the same vocabulary the ComponentRenderer + O-3 critic understand), with sensible
 * defaults, on-brand copy, SEO metadata, and a per-industry BrandHint (palette/type)
 * the tenant can accept or override. Templates are intentionally token-relative — they
 * never hard-code colors in props — so applying a tenant's brand re-themes the whole
 * site by swapping tokens, not rewriting content.
 *
 * Pipeline fit:
 *   1) tenant picks a template -> instantiateTemplate() fills the business name
 *   2) pages are written as drafts (legacy section schema or component schema)
 *   3) supervisedPublish() runs the O-3 critic as a HARD gate before going live
 *
 * Safety: templates produce DRAFTS only. Nothing here publishes, sends, or spends.
 */

export interface BrandHint {
  /** Suggested palette (hex) — maps onto colorTokens. Tenant may override. */
  primary: string;
  accent: string;
  /** Mood label to guide the brand agent / token generation. */
  mood: string;
  fontHeading: string;
  fontBody: string;
}

export interface TemplateComponent {
  type: ComponentType;
  props: Record<string, any>;
  layout?: Partial<Layout>;
}

export interface TemplatePage {
  slug: string;
  title: string;
  seo: { title: string; description: string };
  components: TemplateComponent[];
}

export interface IndustryTemplate {
  key: string;
  label: string;
  industry: string;
  tagline: string;
  description: string;
  brandHint: BrandHint;
  pages: TemplatePage[];
}

/** Placeholder filled at instantiation time. */
export const NAME_TOKEN = "{{name}}";

// ---------- small builders to keep templates DRY but tailored ----------

const footer = (name: string): TemplateComponent => ({
  type: "footer",
  props: {
    columns: [
      { heading: "Company", links: [{ label: "About", href: "/about" }, { label: "Contact", href: "/contact" }] },
      { heading: "Legal", links: [{ label: "Privacy", href: "/privacy" }, { label: "Terms", href: "/terms" }] },
    ],
    legal: `© ${name}. All rights reserved.`,
  },
  layout: { width: "full", background: "surface" },
});

const contactForm = (heading: string): TemplateComponent => ({
  type: "contact-form",
  props: {
    heading,
    fields: [
      { name: "name", label: "Your name", type: "text" },
      { name: "email", label: "Email", type: "email" },
      { name: "phone", label: "Phone", type: "tel" },
      { name: "message", label: "How can we help?", type: "textarea" },
    ],
    submitLabel: "Send message",
  },
  layout: { width: "narrow" },
});

const N = NAME_TOKEN;

// ---------------------------- the catalog ----------------------------

const TEMPLATES: IndustryTemplate[] = [
  // 1) REAL ESTATE (flagship)
  {
    key: "real-estate",
    label: "Real Estate Agent / Brokerage",
    industry: "Real Estate",
    tagline: "Sell listings and capture buyer & seller leads",
    description: "Listings-forward site for agents, teams, and brokerages with lead capture, neighborhood proof, and a clear path to book a showing or valuation.",
    brandHint: { primary: "#0f3d5c", accent: "#c9a227", mood: "trustworthy, upscale, calm", fontHeading: "Playfair Display", fontBody: "Inter, system-ui, sans-serif" },
    pages: [
      {
        slug: "home",
        title: "Home",
        seo: { title: `${N} | Homes for Sale & Expert Real Estate`, description: `Buy, sell, or value your home with ${N}. Browse featured listings, get a free home valuation, and book a showing today.` },
        components: [
          { type: "hero", props: { heading: `Find the home that fits your life`, subheading: `${N} helps buyers and sellers move with confidence — local expertise, honest advice, and results.`, primaryCta: { label: "Browse listings", href: "/listings" }, secondaryCta: { label: "Free home valuation", href: "/valuation" } } },
          { type: "stats", props: { heading: "Proven results", stats: [{ value: "250+", label: "Homes sold" }, { value: "12 days", label: "Avg. on market" }, { value: "99%", label: "List-to-sale price" }, { value: "4.9★", label: "Client rating" }] }, layout: { columns: 4 } },
          { type: "feature-grid", props: { heading: "How I help you win", features: [
            { title: "For buyers", description: "Curated listings, sharp negotiation, and guidance from search to closing." },
            { title: "For sellers", description: "Pricing strategy, staging, and marketing that gets top dollar, fast." },
            { title: "Local expert", description: "Neighborhood-level insight on schools, value trends, and timing." },
          ] }, layout: { columns: 3 } },
          { type: "gallery", props: { heading: "Featured listings", images: [
            { src: "/placeholder/listing-1.jpg", alt: "Featured listing 1" },
            { src: "/placeholder/listing-2.jpg", alt: "Featured listing 2" },
            { src: "/placeholder/listing-3.jpg", alt: "Featured listing 3" },
          ] }, layout: { columns: 3 } },
          { type: "testimonial", props: { quote: `${N} sold our home above asking in under two weeks. Total professionals.`, author: "The Martins", role: "Sellers" } },
          { type: "cta-banner", props: { heading: "Thinking of making a move?", subheading: "Get a free, no-obligation home valuation today.", cta: { label: "Get my valuation", href: "/valuation" } }, layout: { background: "primary" } },
          footer(N),
        ],
      },
      {
        slug: "valuation",
        title: "Free Home Valuation",
        seo: { title: `Free Home Valuation | ${N}`, description: `Find out what your home is worth in today's market. Get a free, accurate valuation from ${N}.` },
        components: [
          { type: "hero", props: { heading: "What's your home worth?", subheading: "Get a free, data-driven valuation — no obligation.", primaryCta: { label: "Start now", href: "#form" } } },
          contactForm("Request your free valuation"),
          footer(N),
        ],
      },
    ],
  },

  // 2) RESTAURANT
  {
    key: "restaurant",
    label: "Restaurant / Café",
    industry: "Food & Hospitality",
    tagline: "Menus, reservations, and mouth-watering visuals",
    description: "Appetite-first site with menu highlights, gallery, hours, and a reservation/contact path.",
    brandHint: { primary: "#7a1f1f", accent: "#e0a458", mood: "warm, appetizing, inviting", fontHeading: "Cormorant Garamond", fontBody: "Inter, system-ui, sans-serif" },
    pages: [
      {
        slug: "home",
        title: "Home",
        seo: { title: `${N} | Restaurant & Reservations`, description: `Dine at ${N}. See our menu, view the gallery, and reserve your table today.` },
        components: [
          { type: "hero", props: { heading: `Taste the difference at ${N}`, subheading: "Seasonal dishes, crafted cocktails, and a room worth lingering in.", primaryCta: { label: "Reserve a table", href: "/reserve" }, secondaryCta: { label: "View menu", href: "/menu" } } },
          { type: "feature-grid", props: { heading: "Why guests love us", features: [
            { title: "Seasonal menu", description: "Locally sourced ingredients, changed with the seasons." },
            { title: "Crafted drinks", description: "A bar program built around fresh, balanced cocktails." },
            { title: "Made for gathering", description: "Warm service and a room designed for great nights out." },
          ] }, layout: { columns: 3 } },
          { type: "gallery", props: { heading: "On the plate", images: [
            { src: "/placeholder/dish-1.jpg", alt: "Signature dish" },
            { src: "/placeholder/dish-2.jpg", alt: "Dessert" },
            { src: "/placeholder/dish-3.jpg", alt: "Dining room" },
          ] }, layout: { columns: 3 } },
          { type: "testimonial", props: { quote: "Best meal we've had all year — we're already planning our next visit.", author: "Dana R.", role: "Regular guest" } },
          { type: "cta-banner", props: { heading: "Hungry yet?", subheading: "Tables fill fast on weekends.", cta: { label: "Book your table", href: "/reserve" } }, layout: { background: "primary" } },
          footer(N),
        ],
      },
    ],
  },

  // 3) DENTAL / MEDICAL
  {
    key: "dental",
    label: "Dental / Medical Practice",
    industry: "Healthcare",
    tagline: "Build trust and fill the appointment book",
    description: "Reassuring, clean practice site with services, trust signals, FAQ, and appointment booking.",
    brandHint: { primary: "#0e7490", accent: "#34d399", mood: "clean, calm, trustworthy", fontHeading: "Poppins", fontBody: "Inter, system-ui, sans-serif" },
    pages: [
      {
        slug: "home",
        title: "Home",
        seo: { title: `${N} | Gentle, Modern Dental Care`, description: `${N} provides comfortable, modern dental care for the whole family. Book your appointment today.` },
        components: [
          { type: "hero", props: { heading: "Healthy smiles, gentle care", subheading: `${N} combines modern dentistry with a calm, judgment-free experience.`, primaryCta: { label: "Book appointment", href: "/book" }, secondaryCta: { label: "Our services", href: "/services" } } },
          { type: "feature-grid", props: { heading: "Our services", features: [
            { title: "Preventive care", description: "Cleanings, exams, and education to keep your smile healthy." },
            { title: "Cosmetic", description: "Whitening, veneers, and smile makeovers." },
            { title: "Restorative", description: "Crowns, implants, and same-day repairs." },
          ] }, layout: { columns: 3 } },
          { type: "stats", props: { stats: [{ value: "15+", label: "Years caring" }, { value: "10k+", label: "Happy patients" }, { value: "4.9★", label: "Average rating" }, { value: "Same-day", label: "Emergencies" }] }, layout: { columns: 4 } },
          { type: "faq", props: { heading: "Common questions", items: [
            { q: "Do you accept my insurance?", a: "We work with most major plans and offer flexible financing." },
            { q: "Are you taking new patients?", a: "Yes — new patients are always welcome." },
            { q: "What about nervous patients?", a: "We specialize in gentle, anxiety-friendly care." },
          ] } },
          { type: "cta-banner", props: { heading: "Ready for a healthier smile?", cta: { label: "Book your visit", href: "/book" } }, layout: { background: "primary" } },
          footer(N),
        ],
      },
    ],
  },

  // 4) LAW FIRM
  {
    key: "law-firm",
    label: "Law Firm / Attorney",
    industry: "Professional Services",
    tagline: "Authority, practice areas, and consultations",
    description: "Authoritative firm site with practice areas, credibility, FAQ, and consultation capture.",
    brandHint: { primary: "#1e293b", accent: "#b08d57", mood: "authoritative, established, confident", fontHeading: "Merriweather", fontBody: "Inter, system-ui, sans-serif" },
    pages: [
      {
        slug: "home",
        title: "Home",
        seo: { title: `${N} | Trusted Legal Counsel`, description: `${N} provides experienced legal representation. Schedule a confidential consultation today.` },
        components: [
          { type: "hero", props: { heading: "Experienced counsel when it matters most", subheading: `${N} delivers clear advice and strong representation.`, primaryCta: { label: "Free consultation", href: "/consult" }, secondaryCta: { label: "Practice areas", href: "/practice" } } },
          { type: "feature-grid", props: { heading: "Practice areas", features: [
            { title: "Family law", description: "Divorce, custody, and mediation handled with care." },
            { title: "Business law", description: "Formation, contracts, and dispute resolution." },
            { title: "Real estate", description: "Transactions, closings, and litigation." },
          ] }, layout: { columns: 3 } },
          { type: "stats", props: { stats: [{ value: "20+", label: "Years experience" }, { value: "1,000+", label: "Cases handled" }, { value: "98%", label: "Client satisfaction" }] }, layout: { columns: 3 } },
          { type: "testimonial", props: { quote: "Professional, responsive, and genuinely on my side throughout.", author: "Former client", role: "Family law" } },
          { type: "cta-banner", props: { heading: "Discuss your case confidentially", cta: { label: "Schedule consultation", href: "/consult" } }, layout: { background: "primary" } },
          footer(N),
        ],
      },
    ],
  },

  // 5) FITNESS / GYM
  {
    key: "fitness",
    label: "Gym / Fitness Studio",
    industry: "Health & Fitness",
    tagline: "Memberships, classes, and free trials",
    description: "High-energy site with programs, pricing, social proof, and a free-trial CTA.",
    brandHint: { primary: "#111827", accent: "#f43f5e", mood: "energetic, bold, motivating", fontHeading: "Anton", fontBody: "Inter, system-ui, sans-serif" },
    pages: [
      {
        slug: "home",
        title: "Home",
        seo: { title: `${N} | Train Hard, Get Results`, description: `Join ${N}. Classes, coaching, and a community that pushes you. Claim your free trial.` },
        components: [
          { type: "hero", props: { heading: "Stronger starts today", subheading: `${N} — coaching, classes, and a community that shows up.`, primaryCta: { label: "Claim free trial", href: "/trial" }, secondaryCta: { label: "See classes", href: "/classes" } } },
          { type: "feature-grid", props: { heading: "Programs", features: [
            { title: "Strength", description: "Coached lifting for every level." },
            { title: "Conditioning", description: "High-intensity classes that burn." },
            { title: "Personal training", description: "1:1 plans built around your goals." },
          ] }, layout: { columns: 3 } },
          { type: "pricing-table", props: { heading: "Membership", tiers: [
            { name: "Class pass", price: "$59/mo", features: ["8 classes / month", "App access"], cta: { label: "Choose", href: "/join" } },
            { name: "Unlimited", price: "$99/mo", features: ["Unlimited classes", "Open gym", "App access"], cta: { label: "Choose", href: "/join" }, highlight: true },
            { name: "Coaching", price: "$199/mo", features: ["Unlimited + 1:1", "Nutrition plan"], cta: { label: "Choose", href: "/join" } },
          ] }, layout: { columns: 3 } },
          { type: "cta-banner", props: { heading: "Your first week is on us", cta: { label: "Start free trial", href: "/trial" } }, layout: { background: "primary" } },
          footer(N),
        ],
      },
    ],
  },

  // 6) SALON / SPA
  {
    key: "salon-spa",
    label: "Salon / Spa",
    industry: "Beauty & Wellness",
    tagline: "Services, gallery, and online booking",
    description: "Elegant, relaxing site with service menu, gallery, and booking.",
    brandHint: { primary: "#6d28d9", accent: "#f9a8d4", mood: "elegant, serene, indulgent", fontHeading: "Cormorant Garamond", fontBody: "Inter, system-ui, sans-serif" },
    pages: [
      {
        slug: "home",
        title: "Home",
        seo: { title: `${N} | Salon & Spa`, description: `Relax and refresh at ${N}. Browse services and book your appointment online.` },
        components: [
          { type: "hero", props: { heading: "Look good, feel restored", subheading: `${N} — expert stylists and a calm space to unwind.`, primaryCta: { label: "Book now", href: "/book" }, secondaryCta: { label: "Services", href: "/services" } } },
          { type: "feature-grid", props: { heading: "Services", features: [
            { title: "Hair", description: "Cuts, color, and styling by senior stylists." },
            { title: "Skin", description: "Facials and treatments tailored to you." },
            { title: "Spa", description: "Massage and relaxation rituals." },
          ] }, layout: { columns: 3 } },
          { type: "gallery", props: { heading: "Our work", images: [
            { src: "/placeholder/salon-1.jpg", alt: "Hair styling" },
            { src: "/placeholder/salon-2.jpg", alt: "Spa room" },
            { src: "/placeholder/salon-3.jpg", alt: "Color work" },
          ] }, layout: { columns: 3 } },
          { type: "cta-banner", props: { heading: "Treat yourself today", cta: { label: "Book appointment", href: "/book" } }, layout: { background: "primary" } },
          footer(N),
        ],
      },
    ],
  },

  // 7) HOME SERVICES / CONTRACTOR
  {
    key: "home-services",
    label: "Home Services / Contractor",
    industry: "Trades & Home Services",
    tagline: "Quotes, trust, and fast response",
    description: "Conversion-focused site for plumbers, HVAC, electricians, roofers, and contractors with quote capture and trust signals.",
    brandHint: { primary: "#1d4ed8", accent: "#f59e0b", mood: "dependable, professional, fast", fontHeading: "Poppins", fontBody: "Inter, system-ui, sans-serif" },
    pages: [
      {
        slug: "home",
        title: "Home",
        seo: { title: `${N} | Reliable Home Services`, description: `${N} — licensed, insured, and fast. Get a free quote today.` },
        components: [
          { type: "hero", props: { heading: "Done right, the first time", subheading: `${N} — licensed, insured, and on time. Free estimates.`, primaryCta: { label: "Get a free quote", href: "/quote" }, secondaryCta: { label: "Our services", href: "/services" } } },
          { type: "feature-grid", props: { heading: "What we do", features: [
            { title: "Repairs", description: "Fast, reliable fixes when things go wrong." },
            { title: "Installation", description: "Quality installs done to code." },
            { title: "Maintenance", description: "Plans to keep your home running." },
          ] }, layout: { columns: 3 } },
          { type: "stats", props: { stats: [{ value: "24/7", label: "Emergency service" }, { value: "5★", label: "Rated" }, { value: "100%", label: "Satisfaction" }] }, layout: { columns: 3 } },
          { type: "testimonial", props: { quote: "Showed up on time, fair price, and fixed it fast. Highly recommend.", author: "Homeowner", role: "Verified review" } },
          { type: "cta-banner", props: { heading: "Need it fixed?", subheading: "Same-day appointments available.", cta: { label: "Request a quote", href: "/quote" } }, layout: { background: "primary" } },
          footer(N),
        ],
      },
    ],
  },

  // 8) SAAS / TECH STARTUP
  {
    key: "saas",
    label: "SaaS / Tech Startup",
    industry: "Technology",
    tagline: "Product value, pricing, and signups",
    description: "Modern product site with value prop, features, pricing, FAQ, and signup CTA.",
    brandHint: { primary: "#4f46e5", accent: "#22d3ee", mood: "modern, sharp, confident", fontHeading: "Inter, system-ui, sans-serif", fontBody: "Inter, system-ui, sans-serif" },
    pages: [
      {
        slug: "home",
        title: "Home",
        seo: { title: `${N} | Software that works for you`, description: `${N} helps teams move faster. Start free — no credit card required.` },
        components: [
          { type: "hero", props: { heading: "Ship faster with " + N, subheading: "The all-in-one platform your team will actually use.", primaryCta: { label: "Start free", href: "/signup" }, secondaryCta: { label: "Book a demo", href: "/demo" } } },
          { type: "logo-cloud", props: { heading: "Trusted by teams everywhere", logos: [
            { alt: "Customer 1", src: "/placeholder/logo-1.svg" },
            { alt: "Customer 2", src: "/placeholder/logo-2.svg" },
            { alt: "Customer 3", src: "/placeholder/logo-3.svg" },
          ] } },
          { type: "feature-grid", props: { heading: "Everything you need", features: [
            { title: "Fast", description: "Built for speed from day one." },
            { title: "Secure", description: "Enterprise-grade security by default." },
            { title: "Integrated", description: "Connects with the tools you already use." },
          ] }, layout: { columns: 3 } },
          { type: "pricing-table", props: { heading: "Simple pricing", tiers: [
            { name: "Starter", price: "$0", features: ["Up to 3 users", "Core features"], cta: { label: "Get started", href: "/signup" } },
            { name: "Pro", price: "$29/mo", features: ["Unlimited users", "Advanced features", "Priority support"], cta: { label: "Start trial", href: "/signup" }, highlight: true },
            { name: "Enterprise", price: "Custom", features: ["SSO & SLA", "Dedicated support"], cta: { label: "Contact sales", href: "/contact" } },
          ] }, layout: { columns: 3 } },
          { type: "faq", props: { heading: "Questions", items: [
            { q: "Is there a free plan?", a: "Yes — start free, upgrade anytime." },
            { q: "Can I cancel?", a: "Anytime, no questions asked." },
          ] } },
          { type: "cta-banner", props: { heading: "Start building today", cta: { label: "Create free account", href: "/signup" } }, layout: { background: "primary" } },
          footer(N),
        ],
      },
    ],
  },

  // 9) E-COMMERCE / RETAIL
  {
    key: "ecommerce",
    label: "E-commerce / Retail",
    industry: "Retail",
    tagline: "Showcase products and drive sales",
    description: "Product-forward storefront landing with featured collection, social proof, and shop CTA.",
    brandHint: { primary: "#111827", accent: "#ec4899", mood: "fresh, vibrant, shoppable", fontHeading: "Poppins", fontBody: "Inter, system-ui, sans-serif" },
    pages: [
      {
        slug: "home",
        title: "Home",
        seo: { title: `${N} | Shop the Collection`, description: `Discover ${N}. Shop our latest collection with fast shipping and easy returns.` },
        components: [
          { type: "hero", props: { heading: "The new collection is here", subheading: `${N} — quality you can feel, prices you'll love.`, primaryCta: { label: "Shop now", href: "/shop" }, secondaryCta: { label: "New arrivals", href: "/new" } } },
          { type: "gallery", props: { heading: "Featured products", images: [
            { src: "/placeholder/product-1.jpg", alt: "Product 1" },
            { src: "/placeholder/product-2.jpg", alt: "Product 2" },
            { src: "/placeholder/product-3.jpg", alt: "Product 3" },
            { src: "/placeholder/product-4.jpg", alt: "Product 4" },
          ] }, layout: { columns: 4 } },
          { type: "feature-grid", props: { heading: "Why shop with us", features: [
            { title: "Free shipping", description: "On all orders over $50." },
            { title: "Easy returns", description: "30-day no-hassle returns." },
            { title: "Secure checkout", description: "Your data, always protected." },
          ] }, layout: { columns: 3 } },
          { type: "testimonial", props: { quote: "Great quality and fast delivery. My new favorite shop.", author: "Verified buyer", role: "5-star review" } },
          { type: "cta-banner", props: { heading: "Free shipping on your first order", cta: { label: "Start shopping", href: "/shop" } }, layout: { background: "primary" } },
          footer(N),
        ],
      },
    ],
  },

  // 10) CONSULTING / AGENCY
  {
    key: "consulting",
    label: "Consulting / Agency",
    industry: "Professional Services",
    tagline: "Services, results, and discovery calls",
    description: "Credibility-first agency site with services, case-study proof, and discovery-call capture.",
    brandHint: { primary: "#0f172a", accent: "#38bdf8", mood: "premium, strategic, polished", fontHeading: "Sora", fontBody: "Inter, system-ui, sans-serif" },
    pages: [
      {
        slug: "home",
        title: "Home",
        seo: { title: `${N} | Strategy & Results`, description: `${N} helps businesses grow with proven strategy and execution. Book a discovery call.` },
        components: [
          { type: "hero", props: { heading: "Growth, engineered", subheading: `${N} partners with you to turn strategy into measurable results.`, primaryCta: { label: "Book a call", href: "/contact" }, secondaryCta: { label: "Our work", href: "/work" } } },
          { type: "feature-grid", props: { heading: "What we do", features: [
            { title: "Strategy", description: "Clear plans grounded in your goals and data." },
            { title: "Execution", description: "Hands-on delivery, not just slide decks." },
            { title: "Growth", description: "Measurable outcomes you can take to the board." },
          ] }, layout: { columns: 3 } },
          { type: "stats", props: { stats: [{ value: "3x", label: "Avg. ROI" }, { value: "120+", label: "Clients served" }, { value: "15", label: "Industries" }] }, layout: { columns: 3 } },
          { type: "testimonial", props: { quote: "They became a true extension of our team and delivered real growth.", author: "VP Marketing", role: "B2B client" } },
          { type: "cta-banner", props: { heading: "Let's talk about your goals", cta: { label: "Book discovery call", href: "/contact" } }, layout: { background: "primary" } },
          footer(N),
        ],
      },
    ],
  },

  // 11) NONPROFIT
  {
    key: "nonprofit",
    label: "Nonprofit / Charity",
    industry: "Nonprofit",
    tagline: "Mission, impact, and donations",
    description: "Mission-driven site with impact stats, story, and a donate/volunteer CTA.",
    brandHint: { primary: "#15803d", accent: "#f59e0b", mood: "hopeful, warm, human", fontHeading: "Poppins", fontBody: "Inter, system-ui, sans-serif" },
    pages: [
      {
        slug: "home",
        title: "Home",
        seo: { title: `${N} | Together We Make a Difference`, description: `${N} is on a mission to create change. Donate, volunteer, and join us.` },
        components: [
          { type: "hero", props: { heading: "Change starts with you", subheading: `${N} — join us in making a lasting difference.`, primaryCta: { label: "Donate", href: "/donate" }, secondaryCta: { label: "Volunteer", href: "/volunteer" } } },
          { type: "stats", props: { heading: "Our impact", stats: [{ value: "50k+", label: "Lives touched" }, { value: "200+", label: "Volunteers" }, { value: "$2M", label: "Raised" }] }, layout: { columns: 3 } },
          { type: "rich-text", props: { heading: "Our mission", body: `${N} exists to create real, measurable change in our community. Every contribution — time or money — goes directly toward the people who need it most.` } },
          { type: "cta-banner", props: { heading: "Your gift changes lives", subheading: "Every dollar makes a difference.", cta: { label: "Donate now", href: "/donate" } }, layout: { background: "primary" } },
          footer(N),
        ],
      },
    ],
  },

  // 12) PHOTOGRAPHY / CREATIVE
  {
    key: "photography",
    label: "Photographer / Creative",
    industry: "Creative",
    tagline: "Portfolio, packages, and bookings",
    description: "Visual-first portfolio site with gallery, packages, and booking enquiry.",
    brandHint: { primary: "#18181b", accent: "#a3a3a3", mood: "minimal, elegant, gallery-like", fontHeading: "Cormorant Garamond", fontBody: "Inter, system-ui, sans-serif" },
    pages: [
      {
        slug: "home",
        title: "Home",
        seo: { title: `${N} | Photography`, description: `${N} — timeless photography for weddings, portraits, and brands. View the portfolio and enquire.` },
        components: [
          { type: "hero", props: { heading: "Moments, beautifully kept", subheading: `${N} — photography that tells your story.`, primaryCta: { label: "View portfolio", href: "/portfolio" }, secondaryCta: { label: "Enquire", href: "/contact" } } },
          { type: "gallery", props: { heading: "Selected work", images: [
            { src: "/placeholder/photo-1.jpg", alt: "Portfolio 1" },
            { src: "/placeholder/photo-2.jpg", alt: "Portfolio 2" },
            { src: "/placeholder/photo-3.jpg", alt: "Portfolio 3" },
            { src: "/placeholder/photo-4.jpg", alt: "Portfolio 4" },
            { src: "/placeholder/photo-5.jpg", alt: "Portfolio 5" },
            { src: "/placeholder/photo-6.jpg", alt: "Portfolio 6" },
          ] }, layout: { columns: 3 } },
          { type: "pricing-table", props: { heading: "Packages", tiers: [
            { name: "Portrait", price: "$350", features: ["1-hour session", "20 edited photos"], cta: { label: "Enquire", href: "/contact" } },
            { name: "Wedding", price: "$2,400", features: ["Full day", "400+ photos", "Online gallery"], cta: { label: "Enquire", href: "/contact" }, highlight: true },
            { name: "Brand", price: "Custom", features: ["Tailored shoot", "Commercial license"], cta: { label: "Enquire", href: "/contact" } },
          ] }, layout: { columns: 3 } },
          { type: "cta-banner", props: { heading: "Let's create something timeless", cta: { label: "Get in touch", href: "/contact" } }, layout: { background: "primary" } },
          footer(N),
        ],
      },
    ],
  },
];

// ------------------------------ API ------------------------------

export function listIndustryTemplates() {
  return TEMPLATES.map((t) => ({
    key: t.key, label: t.label, industry: t.industry, tagline: t.tagline,
    description: t.description, brandHint: t.brandHint, pageCount: t.pages.length,
  }));
}

export function getIndustryTemplate(key: string): IndustryTemplate | null {
  return TEMPLATES.find((t) => t.key === key) ?? null;
}

/** Deep-fill the {{name}} placeholder with the tenant's business name. */
export function instantiateTemplate(key: string, vars: { businessName: string }): IndustryTemplate | null {
  const t = getIndustryTemplate(key);
  if (!t) return null;
  const fill = (s: string) => s.split(NAME_TOKEN).join(vars.businessName);
  const deep = (v: any): any =>
    typeof v === "string" ? fill(v)
    : Array.isArray(v) ? v.map(deep)
    : v && typeof v === "object" ? Object.fromEntries(Object.entries(v).map(([k, val]) => [k, deep(val)]))
    : v;
  return deep(t) as IndustryTemplate;
}

/**
 * Validate every component in a template against the design-system component contract,
 * so the catalog is guaranteed to pass the same gate the O-3 critic uses. Names are
 * instantiated first so required-string props (e.g. hero.heading) are non-placeholder.
 */
export function validateTemplate(key: string): { ok: boolean; problems: Array<{ page: string; type: string; violations: string[] }> } {
  const t = instantiateTemplate(key, { businessName: "Acme Co" });
  if (!t) return { ok: false, problems: [{ page: "-", type: "-", violations: [`unknown template "${key}"`] }] };
  const problems: Array<{ page: string; type: string; violations: string[] }> = [];
  for (const page of t.pages) {
    for (const c of page.components) {
      const r = validateComponent(c.type, c.props);
      if (!r.ok) problems.push({ page: page.slug, type: c.type, violations: r.violations });
    }
  }
  return { ok: problems.length === 0, problems };
}

export function validateAllTemplates() {
  return TEMPLATES.map((t) => ({ key: t.key, ...validateTemplate(t.key) }));
}

/**
 * Serialize a template page's components to the flat section-content shape the platform
 * stores/renders: `{ type: <componentType>, ...props, layout? }`. This is the form the
 * O-3 critic reads (flat `type`/`heading`/`fields`/`primaryCta`…) AND that adaptSection
 * passes through natively to the ComponentRenderer. Lossless round-trip.
 */
export function pageToSectionContents(page: TemplatePage): Array<Record<string, any>> {
  return page.components.map((c) => ({ type: c.type, ...c.props, ...(c.layout ? { layout: c.layout } : {}) }));
}
