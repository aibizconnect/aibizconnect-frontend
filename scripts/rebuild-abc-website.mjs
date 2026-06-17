// Rebuild the AI Biz Connect flagship site as an "AI Business OS" showcase (D-383, architect-ratified).
// Positioning: "One Platform to Run Your Entire Business with AI." Every capability is surfaced with a
// "powered-by-AI" framing + a CTA that funnels to /start -> /onboarding -> Genesis -> Launchpad.
// Purges the platform-tenant pages + global blocks, rebuilds Home/Platform/Services/Pricing/About/Contact,
// publishes them, with a global Header + Footer wired to every page. Backup: backups/abc-website-backup-*.json
// Run: node --env-file=.env.local scripts/rebuild-abc-website.mjs
import { createClient } from "@supabase/supabase-js";
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const ABC = "d723a086-eac0-4b61-8742-25313370d0b7";
const NAVY = "#001e40", GOLD = "#feae2c", WHITE = "#ffffff";
const url = (slug) => `/sites/${ABC}/${slug}`;
const SIGNUP = "/start"; // the public funnel → /onboarding → Genesis → Launchpad

// ---------- chrome ----------
const NAV = [
  { label: "Home", href: url("home") },
  { label: "The Platform", href: url("platform") },
  { label: "Services", href: url("services") },
  { label: "Pricing", href: url("pricing") },
  { label: "About", href: url("about") },
  { label: "Contact", href: url("contact") },
];
const headerBlock = {
  type: "row", columns: 3, widths: [0.28, 0.52, 0.2], contentWidth: "wide", valign: "center", gap: 16,
  _name: "Header", _kind: "header", _style: { background: WHITE, paddingTop: 14, paddingBottom: 14 },
  children: [
    [{ type: "heading", text: "AI Biz Connect", level: "h3", color: NAVY, fontFamily: "Montserrat", fontWeight: "800", href: url("home") }],
    [{ type: "menu", orientation: "horizontal", align: "center", items: NAV, color: NAVY, activeColor: GOLD, hoverColor: GOLD, fontFamily: "Montserrat", fontWeight: "600" }],
    [{ type: "button", label: "Start free", href: SIGNUP, variant: "solid", bgColor: GOLD, textColor: NAVY, align: "right", radius: 8, fontWeight: "700" }],
  ],
};
const footLink = (t, slug) => ({ type: "text", text: t, href: url(slug), color: "#cbd5e1", fontSize: 14 });
const footHead = (t) => ({ type: "heading", text: t, level: "h5", color: WHITE, fontFamily: "Montserrat", fontWeight: "700", fontSize: 15 });
const footerBlock = {
  type: "row", columns: 4, widths: [0.4, 0.2, 0.2, 0.2], contentWidth: "wide", gap: 24,
  _name: "Footer", _kind: "footer", _style: { background: NAVY, paddingTop: 48, paddingBottom: 40, paddingLeft: 24, paddingRight: 24 },
  children: [
    [
      { type: "heading", text: "AI Biz Connect", level: "h4", color: WHITE, fontFamily: "Montserrat", fontWeight: "800" },
      { type: "text", text: "The AI Business OS — one platform that builds your site, fills your CRM, books your calendar, and markets for you.", color: "#94a3b8", fontSize: 14 },
      { type: "social", links: [
        { platform: "facebook", url: "https://www.facebook.com/aibizconnect" },
        { platform: "instagram", url: "https://www.instagram.com/aibizconnect" },
        { platform: "linkedin", url: "https://www.linkedin.com/company/aibizconnect" },
        { platform: "youtube", url: "https://www.youtube.com/@aibizconnect" },
      ] },
    ],
    [footHead("Platform"), footLink("The Platform", "platform"), footLink("Services", "services"), footLink("Pricing", "pricing")],
    [footHead("Company"), footLink("About", "about"), footLink("Contact", "contact"), footLink("Home", "home")],
    [footHead("Get started"), { type: "button", label: "Build My AI Business OS", href: SIGNUP, variant: "solid", bgColor: GOLD, textColor: NAVY, radius: 8, fontWeight: "700" },
      { type: "text", text: "© 2026 AI Biz Connect. All rights reserved.", color: "#64748b", fontSize: 12 }],
  ],
};

// ---------- helpers ----------
const hero = (heading, subheading, primary, secondary) => ({ type: "hero", heading, subheading, ...(primary ? { primaryCta: primary } : {}), ...(secondary ? { secondaryCta: secondary } : {}) });
const feat = (heading, items) => ({ type: "features", heading, features: items });
const ctaSignup = (heading, subheading, label = "Build My AI Business OS") => ({ type: "cta", heading, subheading, cta: { label, href: SIGNUP } });
const buildCta = { label: "Build My AI Business OS", href: SIGNUP };
const platformCta = { label: "Explore the platform", href: url("platform") };

// The 10 capabilities (the "AI Business OS"), each powered-by-AI.
const CAPABILITIES = [
  { icon: "🌐", title: "AI Website Builder + Editor", description: "Describe your business and AI builds a complete, on-brand site — then edits it for you in plain language. No designer, no code." },
  { icon: "🏡", title: "Native MLS Listings (IDX/VOW)", description: "Real-estate listings rendered natively — search, map, and detail pages — with a buyer portal. No iframes." },
  { icon: "👥", title: "CRM & Pipelines", description: "Every lead captured, tagged, scored, and moved through your pipeline — with AI surfacing who to call next." },
  { icon: "📅", title: "Booking & Calendars", description: "Clients book you 24/7 with calendar sync, availability rules, and automatic reminders." },
  { icon: "📣", title: "Email & SMS Marketing", description: "AI-written campaigns, trigger links, and follow-up sequences that nurture leads on autopilot." },
  { icon: "🔍", title: "SEO & GEO", description: "Structured data, sitemaps, and answer-engine optimization so customers — and AI assistants — find you." },
  { icon: "🚀", title: "Genesis Onboarding", description: "Sign up and your whole workspace — site, CRM, tools — is set up for your industry in minutes." },
  { icon: "⚙️", title: "Automations", description: "Lead capture, confirmations, reminders, and nurture flows wired end-to-end, no integrations to babysit." },
  { icon: "🤖", title: "AI Agents", description: "A supervised AI team that answers chats, books appointments, and updates your CRM around the clock." },
  { icon: "💳", title: "Payments", description: "Invoices, estimates, and pay links when you need them — turn quotes into paid in a click." },
];

// ---------- pages ----------
const PAGES = [
  { slug: "home", title: "AI Biz Connect — The AI Business OS", isHome: true, order: 0,
    seo: { seo_title: "AI Biz Connect — One platform to run your entire business with AI", seo_description: "Website, CRM, booking, marketing, and more — built and run by AI. The AI Business OS for modern businesses." },
    sections: [
      hero("One platform to run your entire business — with AI", "AI Biz Connect is the AI Business OS: it builds your website, fills your CRM, books your calendar, and markets for you. You focus on growth.", buildCta, platformCta),
      feat("Your entire business, powered by AI", CAPABILITIES.slice(0, 6)),
      feat("Why teams run on AI Biz Connect", [
        { icon: "⚡", title: "Live in minutes", description: "Genesis sets up your whole workspace the moment you sign up — site, CRM, and tools, ready to go." },
        { icon: "🧩", title: "One login, everything", description: "Replace six disconnected tools with one platform where every part talks to the others." },
        { icon: "🪄", title: "AI does the work", description: "Ask in plain language and the AI builds pages, writes copy, and wires your funnels — you stay in control." },
      ]),
      { type: "testimonials", heading: "Trusted by growing businesses", items: [
        { name: "Sarah M.", role: "Real Estate Broker", quote: "My site, my listings, and my leads finally live in one place. I launched in an afternoon." },
        { name: "David K.", role: "Service Business Owner", quote: "It replaced four tools and does more than any of them did — and the AI actually edits my site for me." },
      ] },
      ctaSignup("Ready to run your business on AI?", "Build your AI Business OS in minutes — free to start."),
    ] },
  { slug: "platform", title: "The AI Biz Connect Platform", order: 1,
    seo: { seo_title: "The Platform — AI Biz Connect", seo_description: "The complete AI Business OS: AI website builder, native IDX/VOW, CRM, booking, marketing, SEO/GEO, automations, AI agents, and payments." },
    sections: [
      hero("The AI Business OS — every tool your business needs", "Ten capabilities, one platform, all powered by AI and wired together. Built for real estate, services, retail, and more.", buildCta, { label: "See pricing", href: url("pricing") }),
      feat("Everything in one platform", CAPABILITIES),
      feat("Built for your industry", [
        { icon: "🏠", title: "Real estate", description: "Native MLS listings, buyer portals, and lead nurture — launch on sample data, flip to your live feed on approval." },
        { icon: "🔧", title: "Home & contractor services", description: "Quote requests, booking, reminders, and review collection that keep your calendar full." },
        { icon: "🛍️", title: "Retail & local business", description: "Storefront, payments, and marketing that turn browsers into repeat customers." },
      ]),
      { type: "faq", items: [
        { q: "Do I need any technical skills?", a: "No. Describe what you want and the AI builds and edits it — site, funnels, and automations included." },
        { q: "Can the AI change my site after it's built?", a: "Yes — that's the difference. Every page stays AI-editable; just ask in plain language." },
        { q: "Can I bring my own domain?", a: "Yes. Connect a custom domain in a few clicks, or start free on a subdomain." },
      ] },
      ctaSignup("See the whole platform work for you", "Spin up your AI Business OS and explore every tool — free to start."),
    ] },
  { slug: "services", title: "Our AI-Powered Services", order: 2,
    seo: { seo_title: "Services — AI Biz Connect", seo_description: "Done-for-you AI website builds, automation, CRM setup, and growth — or do it yourself with AI." },
    sections: [
      hero("AI-powered services that do the heavy lifting", "From a brand-new website to fully automated follow-up, we set up the systems that run your business — then AI keeps them running."),
      feat("How we help you grow", [
        { icon: "🚀", title: "Website & Launch", description: "A complete, on-brand site built, wired, and published for you — ready for traffic." },
        { icon: "⚙️", title: "Automation Setup", description: "Lead capture, booking confirmations, reminders, and nurture sequences wired end-to-end." },
        { icon: "👥", title: "CRM & Pipeline", description: "Your sales process modeled in software so nothing slips through the cracks." },
        { icon: "📈", title: "SEO & Growth", description: "On-page SEO, structured data, and answer-engine readiness to win search and AI results." },
      ]),
      ctaSignup("Tell us what you need", "Start free and we'll help you map the right setup for your business.", "Get started"),
    ] },
  { slug: "pricing", title: "Pricing Plans", order: 3,
    seo: { seo_title: "Pricing — AI Biz Connect", seo_description: "Simple, transparent plans for the AI Business OS. Start free, scale as you grow." },
    sections: [
      hero("Simple, transparent pricing", "Start free, upgrade when you're ready. The whole AI Business OS, one subscription. Cancel anytime."),
      { type: "pricing", plans: [
        { name: "Pro", price: "$97", period: "/mo", features: [{ text: "AI website builder + editor" }, { text: "CRM & pipelines" }, { text: "Booking & calendars" }, { text: "Email marketing" }], ctaLabel: "Start free", ctaHref: SIGNUP },
        { name: "Premium", price: "$197", period: "/mo", features: [{ text: "Everything in Pro" }, { text: "SMS marketing & trigger links" }, { text: "Native IDX/VOW listings" }, { text: "AI agents & advanced automations" }], ctaLabel: "Start free", ctaHref: SIGNUP },
        { name: "Enterprise", price: "Let's talk", features: [{ text: "Everything in Premium" }, { text: "Multiple locations / team seats" }, { text: "Priority support" }, { text: "Custom integrations" }], ctaLabel: "Contact sales", ctaHref: url("contact") },
      ] },
      { type: "faq", items: [
        { q: "Is there a free trial?", a: "Yes — every plan starts free so you can build your AI Business OS before you pay." },
        { q: "Can I change plans later?", a: "Anytime. Upgrade or downgrade in a click; changes are prorated." },
        { q: "What payment methods do you accept?", a: "All major credit cards, billed securely through Stripe." },
      ] },
      ctaSignup("Not sure which plan fits?", "Start free — you can pick a plan once you've seen it work."),
    ] },
  { slug: "about", title: "About AI Biz Connect", order: 4,
    seo: { seo_title: "About — AI Biz Connect", seo_description: "We build the AI systems that run small businesses, so owners can focus on growth." },
    sections: [
      hero("We build the AI that runs your business", "AI Biz Connect was founded to give every small business the automation power that big companies pay fortunes for — in one AI Business OS."),
      { type: "text", text: "Founded by an active real-estate broker who lived the pain of juggling a website, a CRM, a calendar, and five marketing tools that never talked to each other, AI Biz Connect unifies it all into one AI-driven platform. Our mission is simple: let owners focus on their customers while the software — and the AI — runs the rest.", align: "center" },
      feat("What we stand for", [
        { icon: "🎯", title: "Outcomes, not features", description: "We measure success by your leads booked and deals closed — not dashboards." },
        { icon: "🤝", title: "Built with operators", description: "Every capability is shaped by real businesses using it every day." },
        { icon: "🔒", title: "Your data, yours", description: "Multi-tenant by design with strict isolation — your business stays your business." },
      ]),
      ctaSignup("Come build with us", "See what the AI Business OS can do for your business."),
    ] },
  { slug: "contact", title: "Contact Us", order: 5,
    seo: { seo_title: "Contact — AI Biz Connect", seo_description: "Book a demo or send us a message — we'll show you your AI Business OS built live." },
    sections: [
      hero("Let's talk", "Book a demo or send a message and we'll show you your AI Business OS, built live."),
      { type: "contact-form", heading: "Send us a message", subheading: "Tell us about your business and we'll show you how AI Biz Connect can run it.", submitLabel: "Send message", submitColor: GOLD, submitTextColor: NAVY, successMessage: "Thanks! We'll be in touch shortly.", fields: [
        { name: "name", label: "Your name", type: "text" },
        { name: "email", label: "Email", type: "email" },
        { name: "phone", label: "Phone", type: "tel" },
        { name: "message", label: "How can we help?", type: "textarea" },
      ] },
    ] },
];

// ---------- run ----------
async function main() {
  const { data: oldPages } = await sb.from("website_pages").select("id").eq("tenant_id", ABC);
  const oldIds = (oldPages ?? []).map((p) => p.id);
  if (oldIds.length) {
    await sb.from("website_page_sections").delete().in("page_id", oldIds);
    await sb.from("website_page_block_refs").delete().eq("tenant_id", ABC);
    await sb.from("website_pages").delete().in("id", oldIds);
  }
  await sb.from("website_global_blocks").delete().eq("tenant_id", ABC);
  console.log("purged old pages:", oldIds.length);

  const mkBlock = async (name, content) => {
    const { data, error } = await sb.from("website_global_blocks").insert({ tenant_id: ABC, name, type: "row", content, draft_content: content }).select("id").single();
    if (error) throw new Error(`block ${name}: ${error.message}`);
    return data.id;
  };
  const headerId = await mkBlock("Header", headerBlock);
  const footerId = await mkBlock("Footer", footerBlock);
  console.log("blocks:", { headerId, footerId });

  for (const p of PAGES) {
    const ins = await sb.from("website_pages").insert({
      tenant_id: ABC, title: p.title, slug: p.slug, order_index: p.order,
      is_home: !!p.isHome, is_public: true,
      draft_title: p.title, draft_slug: p.slug, draft_seo: p.seo,
      seo_title: p.seo.seo_title, seo_description: p.seo.seo_description,
      draft_sections: p.sections,
    }).select("id").single();
    if (ins.error) throw new Error(`page ${p.slug}: ${ins.error.message}`);
    const pageId = ins.data.id;
    const rows = p.sections.map((c, i) => ({ tenant_id: ABC, page_id: pageId, type: c.type, content: c, order_index: i }));
    const se = await sb.from("website_page_sections").insert(rows);
    if (se.error) throw new Error(`sections ${p.slug}: ${se.error.message}`);
    const re = await sb.from("website_page_block_refs").insert([
      { tenant_id: ABC, page_id: pageId, block_id: headerId, order_index: 0 },
      { tenant_id: ABC, page_id: pageId, block_id: footerId, order_index: 1 },
    ]);
    if (re.error) throw new Error(`refs ${p.slug}: ${re.error.message}`);
    console.log(`  built /${p.slug} (${p.sections.length} sections)${p.isHome ? " [home]" : ""}`);
  }
  console.log("\nDONE — AI Business OS showcase live at /sites/" + ABC + "/home");
}
main().catch((e) => { console.error("FAILED:", e.message); process.exitCode = 1; });
