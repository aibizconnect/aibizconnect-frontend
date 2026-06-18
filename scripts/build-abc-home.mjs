// Replace the platform tenant's Home with the Claude Design "Home" (translated to native sections).
// Mirrors design-handoffs/home/Home.dc.html structure + copy. Run: node --env-file=.env.local scripts/build-abc-home.mjs
const base = process.env.NEXT_PUBLIC_SUPABASE_URL, svc = process.env.SUPABASE_SERVICE_ROLE_KEY;
const TENANT = "d723a086-eac0-4b61-8742-25313370d0b7";
const HOME = "16c49d07-fc81-42dc-b717-e3f7f019970c";
const H = { apikey: svc, Authorization: `Bearer ${svc}`, "Content-Type": "application/json", Prefer: "return=representation" };
const feat = (icon, title, description) => ({ icon, title, description });

const sections = [
  { type: "hero", heading: "One platform to run your entire business — with AI",
    subheading: "AIBizConnect OS builds your site, fills your CRM, books your calendar, and markets for you — so you can spend your time selling, not juggling software.",
    primaryCta: { href: "/start", label: "Start free" },
    secondaryCta: { href: "/sites/d723a086-eac0-4b61-8742-25313370d0b7/platform", label: "See the platform" } },
  { type: "text", text: "14-day free trial · no credit card · plans from $39/mo", align: "center" },
  { type: "features", heading: "Your 24/7 AI assistant, always on the clock", features: [
    feat("💬", "Answers visitors", "Replies to website and social questions instantly — in your voice, day or night."),
    feat("🎯", "Qualifies leads", "Asks the right questions and scores every enquiry, so you focus on the ready-to-buy."),
    feat("📅", "Books & follows up", "Sets appointments and nurtures quietly — you wake up to a fuller calendar and a warmer pipeline."),
  ] },
  { type: "features", heading: "One OS, tuned to your industry", features: [
    feat("🏡", "Real Estate", "IDX listings, buyer portals, and showing bookings."),
    feat("💰", "Mortgage & Finance", "Pre-qualification flows and document intake."),
    feat("🛡️", "Insurance", "Quote intake and renewal follow-up."),
    feat("⚖️", "Legal", "Client intake and conflict checks."),
    feat("🎓", "Coaching & Consulting", "Programs, bookings, and nurture."),
    feat("🏢", "Agencies", "Multi-client, multi-brand management."),
  ] },
  { type: "features", heading: "Five tools' worth of work, one login", features: [
    feat("🌐", "AI Website Builder", "Describe your business; AI builds an on-brand site and edits it in plain language."),
    feat("👥", "CRM & Pipelines", "Every lead captured, tagged, scored, and moved forward — with AI surfacing who to call next."),
    feat("📅", "Booking & Calendars", "Clients book you 24/7 with sync, availability rules, and reminders."),
    feat("📣", "Email & SMS Marketing", "AI-written campaigns and follow-up sequences that nurture on autopilot."),
    feat("🔍", "SEO & GEO", "Structured data and answer-engine optimization so customers — and AI assistants — find you."),
  ] },
  { type: "features", heading: "Everything your business runs on", features: [
    feat("🌐", "Website & Shop", "Pages, funnels, and checkout."),
    feat("👥", "CRM & Pipelines", "Contacts, deals, and tasks."),
    feat("🧩", "Websites & Funnels", "Landing pages that convert."),
    feat("🪄", "AI Builder", "No-code, plain-language building."),
    feat("⚙️", "Automations", "Workflows and sequences."),
    feat("🚪", "Consumer Portal", "A branded client experience."),
  ] },
  { type: "testimonials", heading: "Owners who got their time back", items: [
    { name: "Sarah M.", role: "Real Estate Broker", quote: "My site, my listings, and my leads finally live in one place. I launched in an afternoon." },
    { name: "David K.", role: "Service Business Owner", quote: "It replaced four tools and does more than any of them did — the AI actually edits my site for me." },
    { name: "Priya A.", role: "Coach", quote: "The assistant follows up with every lead overnight. My calendar fills itself now." },
  ] },
  { type: "features", heading: "Plans that grow with you", features: [
    feat("🚀", "Starter — from $39/mo", "Get online fast: AI website, CRM, and your 24/7 assistant. 14-day free trial."),
    feat("⭐", "Pro", "Add funnels, email + SMS marketing, automations, and bookings."),
    feat("🏢", "Agency", "Multi-client, multi-brand, white-label, and per-seat roles."),
  ] },
  { type: "features", heading: "Live in minutes, not months", features: [
    feat("1️⃣", "Sign up", "Tell us about your business — or paste your site and let AI read it."),
    feat("2️⃣", "AI builds your OS", "Site, CRM, funnels, and assistant — provisioned the moment you sign up."),
    feat("3️⃣", "Publish & grow", "Review, publish when it's perfect, and let the AI work your pipeline."),
  ] },
  { type: "cta", heading: "Ready to run your business on AIBizConnect OS?",
    subheading: "Start free in minutes. Your AI gets to work immediately.",
    cta: { href: "/start", label: "Start free" } },
];

(async () => {
  const title = "AIBizConnect OS — run your entire business with AI";
  // 1) draft + page meta
  const p = await fetch(`${base}/rest/v1/website_pages?id=eq.${HOME}`, { method: "PATCH", headers: H, body: JSON.stringify({ draft_sections: sections, title, is_public: true, published_at: new Date().toISOString() }) });
  console.log("page patch:", p.status);
  // 2) rebuild published sections
  const d = await fetch(`${base}/rest/v1/website_page_sections?page_id=eq.${HOME}`, { method: "DELETE", headers: H });
  console.log("delete old sections:", d.status);
  const rows = sections.map((s, i) => ({ tenant_id: TENANT, page_id: HOME, type: s.type, content: s, order_index: i }));
  const ins = await fetch(`${base}/rest/v1/website_page_sections`, { method: "POST", headers: H, body: JSON.stringify(rows) });
  console.log("insert new sections:", ins.status, "count:", sections.length);
  if (ins.status >= 300) console.log("ERR:", (await ins.text()).slice(0, 400));
})().catch((e) => { console.error("ERR", e.message); process.exit(1); });
