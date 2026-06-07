/**
 * Tools suite registry — AIBizConnect's "better than Revven" AI utility suite.
 *
 * Studied Revven (revven.com/tools, 26 tools) hands-on with Ali; deliberated the build
 * with Copilot (Supervisor protocol). Their two fatal weaknesses we beat:
 *   1) 3-5 minute, non-streamed generations  -> we stream + run fast
 *   2) every tool siloed, re-enter business info each time -> we are BRAND-AWARE by
 *      default (auto-inject tenant brand tokens + Brand Voice) and share ONE profile.
 *
 * Each tool is a guided form (fields) -> brand-aware AI generation -> DRAFT output
 * (behind O-3 critic / G-approval; nothing auto-publishes, sends, or charges).
 * Every tool is ENTITLEMENT-GATED via canUseFeature() (tiers below).
 *
 * Wave 1 (text-only, ships now, no external paid keys): persona, email, social,
 * newsletter, hooks, brand-voice, business-plan.
 * Wave 2 (media; needs third-party paid API keys = Ali's financial/keys boundary):
 * stub + G-gate (logo, vector, avatar-video, music). Marked comingSoon=true.
 */

export type ToolFieldType = "text" | "textarea" | "select";

export interface ToolField {
  key: string;
  label: string;
  type: ToolFieldType;
  required?: boolean;
  placeholder?: string;
  options?: string[];       // for select
  fromProfile?: keyof ToolProfile; // prefill from the shared saved profile
}

export type ToolTier = "tools_basic" | "tools_pro" | "tools_media";

export interface ToolDef {
  key: string;
  name: string;
  category: "Strategy" | "Copy" | "Social" | "Media";
  tier: ToolTier;            // entitlement feature key
  wave: 1 | 2;
  comingSoon?: boolean;      // Wave 2 media: stubbed + key-gated
  blurb: string;
  fields: ToolField[];
  /** System prompt persona for the tool (brand context is appended by the runner). */
  system: string;
  /** Build the user prompt from collected inputs. */
  buildUser: (inputs: Record<string, string>) => string;
}

/** The single shared business profile reused across every tool (Revven makes you re-type
 * this every time — our second killer feature). */
export interface ToolProfile {
  businessName: string;
  industry: string;
  product: string;
  audience: string;
  pricePoint: string;
  geo: string;
}

export const EMPTY_PROFILE: ToolProfile = {
  businessName: "", industry: "", product: "", audience: "", pricePoint: "Mid-Market", geo: "",
};

export const TIER_LABEL: Record<ToolTier, string> = {
  tools_basic: "Basic",
  tools_pro: "Pro",
  tools_media: "Media",
};

const b = (s: string) => s.trim();

export const TOOLS: ToolDef[] = [
  {
    key: "persona",
    name: "Customer Persona Generator",
    category: "Strategy",
    tier: "tools_basic",
    wave: 1,
    blurb: "Generate 3 distinct, actionable buyer personas — demographics, psychographics, pain points and buying behavior.",
    fields: [
      { key: "industry", label: "Industry", type: "text", required: true, placeholder: "e.g. Real Estate", fromProfile: "industry" },
      { key: "product", label: "Product / Service", type: "textarea", required: true, placeholder: "What you sell and its key benefits", fromProfile: "product" },
      { key: "pricePoint", label: "Price Point", type: "select", options: ["Budget", "Mid-Market", "Premium"], fromProfile: "pricePoint" },
      { key: "audience", label: "Target Market (optional)", type: "text", placeholder: "e.g. First-time home buyers", fromProfile: "audience" },
      { key: "geo", label: "Geographic Focus (optional)", type: "text", placeholder: "e.g. Richmond Hill, Ontario", fromProfile: "geo" },
    ],
    system: "You are a senior market researcher. Produce 3 distinct, vivid, actionable buyer personas. For each: a name + one-line identity, demographics, psychographics, top 3 pain points, buying triggers, objections, and the single best message to reach them. Be specific, not generic. Output clean Markdown with a heading per persona.",
    buildUser: (i) => b(`Industry: ${i.industry}\nProduct/Service: ${i.product}\nPrice point: ${i.pricePoint || "Mid-Market"}\nTarget market: ${i.audience || "(infer the most valuable segments)"}\nGeographic focus: ${i.geo || "(not specified)"}`),
  },
  {
    key: "email",
    name: "Email Generator",
    category: "Copy",
    tier: "tools_basic",
    wave: 1,
    blurb: "High-converting marketing email copy tuned to your audience and offer — subject lines included.",
    fields: [
      { key: "goal", label: "Email goal", type: "text", required: true, placeholder: "e.g. Promote a free home valuation" },
      { key: "audience", label: "Audience", type: "text", required: true, placeholder: "Who is this for?", fromProfile: "audience" },
      { key: "product", label: "Offer / Product", type: "textarea", placeholder: "What are you promoting?", fromProfile: "product" },
      { key: "cta", label: "Call to action", type: "text", placeholder: "e.g. Book a call" },
    ],
    system: "You are a world-class email copywriter. Write one high-converting marketing email. Provide 3 subject-line options, a preview line, then the body (short, scannable, persuasive) and a clear CTA. Match the brand voice. Output Markdown.",
    buildUser: (i) => b(`Goal: ${i.goal}\nAudience: ${i.audience}\nOffer/Product: ${i.product || "(use the business profile)"}\nDesired CTA: ${i.cta || "(choose the best)"}`),
  },
  {
    key: "social",
    name: "Social Media Calendar",
    category: "Social",
    tier: "tools_basic",
    wave: 1,
    blurb: "A strategic 7-day social content calendar with a distinct angle and ready-to-post caption for each day.",
    fields: [
      { key: "platform", label: "Platform", type: "select", options: ["Instagram", "Facebook", "LinkedIn", "TikTok", "X"], required: true },
      { key: "product", label: "What you're promoting", type: "textarea", required: true, placeholder: "Product, service, or theme", fromProfile: "product" },
      { key: "audience", label: "Audience", type: "text", placeholder: "Who you want to reach", fromProfile: "audience" },
    ],
    system: "You are a social media strategist. Produce a 7-day content calendar. For each day give: the strategic angle (e.g. education, social proof, behind-the-scenes, offer), a ready-to-post caption in the brand voice, and 3-5 relevant hashtags. Output a Markdown table or day-by-day list.",
    buildUser: (i) => b(`Platform: ${i.platform}\nPromoting: ${i.product}\nAudience: ${i.audience || "(infer)"}`),
  },
  {
    key: "newsletter",
    name: "Newsletter Generator",
    category: "Copy",
    tier: "tools_basic",
    wave: 1,
    blurb: "Turn a topic or a few updates into a polished, on-brand newsletter ready to send as a draft.",
    fields: [
      { key: "topic", label: "Topic / theme", type: "text", required: true, placeholder: "e.g. May market update + new listings" },
      { key: "points", label: "Key points to include", type: "textarea", placeholder: "One per line; optional" },
      { key: "audience", label: "Audience", type: "text", placeholder: "Who receives this", fromProfile: "audience" },
    ],
    system: "You are an expert newsletter editor. Write one engaging newsletter: a compelling subject line, a short intro, 2-4 clearly-titled sections, and a closing CTA. Keep it skimmable and on-brand. Output Markdown.",
    buildUser: (i) => b(`Topic/theme: ${i.topic}\nKey points:\n${i.points || "(infer the most useful)"}\nAudience: ${i.audience || "(general subscribers)"}`),
  },
  {
    key: "hooks",
    name: "Hooks On Tap",
    category: "Copy",
    tier: "tools_basic",
    wave: 1,
    blurb: "10 diverse, psychologically-tested marketing hooks that drive clicks for your specific offer.",
    fields: [
      { key: "product", label: "Product / offer", type: "textarea", required: true, placeholder: "What you're hooking attention for", fromProfile: "product" },
      { key: "audience", label: "Audience", type: "text", placeholder: "Who you're targeting", fromProfile: "audience" },
    ],
    system: "You are a direct-response copy chief. Generate 10 diverse, high-converting hooks for the offer, each using a different psychological angle (curiosity, fear-of-missing-out, contrarian, social proof, transformation, question, stat, story, urgency, bold claim). Label each with its angle. Output a numbered Markdown list.",
    buildUser: (i) => b(`Product/offer: ${i.product}\nAudience: ${i.audience || "(infer)"}`),
  },
  {
    key: "brand-voice",
    name: "Brand Voice Creator",
    category: "Strategy",
    tier: "tools_basic",
    wave: 1,
    blurb: "Define your brand's personality, tone and messaging rules — then reuse it across every tool.",
    fields: [
      { key: "personality", label: "Brand personality", type: "text", required: true, placeholder: "e.g. confident, warm, expert" },
      { key: "audience", label: "Who you serve", type: "text", placeholder: "Your ideal customer", fromProfile: "audience" },
      { key: "avoid", label: "Words/tone to avoid", type: "text", placeholder: "Optional" },
    ],
    system: "You are a brand strategist. Produce a concise Brand Voice guide: 3-5 tone attributes (with a one-line definition each), do's and don'ts, 3 example sentences in-voice, and 2 sample taglines. Output Markdown.",
    buildUser: (i) => b(`Desired personality: ${i.personality}\nAudience: ${i.audience || "(infer)"}\nAvoid: ${i.avoid || "(none specified)"}`),
  },
  {
    key: "business-plan",
    name: "Business Plan Generator",
    category: "Strategy",
    tier: "tools_pro",
    wave: 1,
    blurb: "A practical, honest business plan tailored to your situation — reality check, strategy, realistic financials.",
    fields: [
      { key: "idea", label: "Business / idea", type: "textarea", required: true, placeholder: "Describe the business and where it's at", fromProfile: "product" },
      { key: "stage", label: "Stage", type: "select", options: ["Early idea", "Pre-revenue", "Making revenue", "Scaling"], required: true },
      { key: "geo", label: "Market / location", type: "text", placeholder: "Optional", fromProfile: "geo" },
    ],
    system: "You are a no-fluff business advisor. Produce a practical plan (not a generic template): 1) Reality check (green/yellow/red light + top reasons it could succeed AND fail), 2) Target customer + positioning, 3) Pricing & go-to-market, 4) First-90-days actions, 5) Three-scenario financial sketch (conservative/base/optimistic) with break-even logic, 6) The hard questions answered. Be honest and specific. Output Markdown.",
    buildUser: (i) => b(`Business/idea: ${i.idea}\nStage: ${i.stage}\nMarket/location: ${i.geo || "(not specified)"}`),
  },

  {
    key: "vsl",
    name: "VSL Script Generator",
    category: "Copy",
    tier: "tools_pro",
    wave: 1,
    blurb: "High-converting video sales letter scripts built on proven psychological frameworks (PAS, hook-story-offer).",
    fields: [
      { key: "product", label: "Product / offer", type: "textarea", required: true, placeholder: "What you're selling", fromProfile: "product" },
      { key: "audience", label: "Audience", type: "text", required: true, placeholder: "Who it's for", fromProfile: "audience" },
      { key: "length", label: "Length", type: "select", options: ["Short (1-2 min)", "Standard (3-5 min)", "Long (8-12 min)"] },
      { key: "offer", label: "The offer + price framing", type: "text", placeholder: "e.g. 3 payments, bonuses, guarantee" },
    ],
    system: "You are a master direct-response VSL copywriter. Write a complete video sales letter script using a proven framework (hook -> problem -> agitation -> solution -> proof -> offer -> urgency -> CTA). Mark each section. Conversational, spoken-word style. Output Markdown.",
    buildUser: (i) => b(`Product/offer: ${i.product}\nAudience: ${i.audience}\nLength: ${i.length || "Standard"}\nOffer/price framing: ${i.offer || "(choose a compelling structure)"}`),
  },
  {
    key: "ebook",
    name: "Non-Fiction Ebook Generator",
    category: "Copy",
    tier: "tools_pro",
    wave: 1,
    blurb: "A complete non-fiction ebook — title, table of contents, and full chapters that read authentically human.",
    fields: [
      { key: "topic", label: "Ebook topic", type: "text", required: true, placeholder: "e.g. The first-time home buyer's playbook" },
      { key: "audience", label: "Reader / audience", type: "text", required: true, placeholder: "Who it's for", fromProfile: "audience" },
      { key: "chapters", label: "Number of chapters", type: "select", options: ["5", "7", "10"] },
      { key: "angle", label: "Angle / key takeaway", type: "textarea", placeholder: "What should readers walk away with? (optional)" },
    ],
    system: "You are a professional non-fiction author and ghostwriter. Produce: a strong title + subtitle, a table of contents, and then write each chapter (a few substantial paragraphs each — not just outlines). Authentic, human, value-dense. Output Markdown with clear chapter headings.",
    buildUser: (i) => b(`Topic: ${i.topic}\nAudience: ${i.audience}\nChapters: ${i.chapters || "7"}\nAngle/takeaway: ${i.angle || "(make it genuinely useful and specific)"}`),
  },
  {
    key: "perfect-hire",
    name: "Perfect Hire Generator",
    category: "Strategy",
    tier: "tools_pro",
    wave: 1,
    blurb: "Laser-focused job posts (Upwork/OnlineJobs.ph) plus interview scripts, screening checklists and sourcing strategy.",
    fields: [
      { key: "role", label: "Role / problem to solve", type: "textarea", required: true, placeholder: "What you need done (even if unsure of the title)" },
      { key: "platform", label: "Hiring platform", type: "select", options: ["Upwork", "OnlineJobs.ph", "LinkedIn", "General"] },
      { key: "budget", label: "Budget / rate (optional)", type: "text", placeholder: "e.g. $8-12/hr or $1500/mo" },
    ],
    system: "You are an expert technical recruiter. Produce: 1) a focused job posting, 2) a screening checklist, 3) 6-8 interview questions with what a great answer looks like, 4) a sourcing strategy. Help even if the role is vaguely defined. Output Markdown.",
    buildUser: (i) => b(`Role/problem: ${i.role}\nPlatform: ${i.platform || "General"}\nBudget/rate: ${i.budget || "(suggest a market-rate range)"}`),
  },
  {
    key: "deck",
    name: "Presentation Outline",
    category: "Strategy",
    tier: "tools_pro",
    wave: 1,
    blurb: "A polished slide-by-slide deck outline (Gamma-style) — titles, bullet content and speaker notes, ready to design.",
    fields: [
      { key: "topic", label: "Presentation topic", type: "text", required: true, placeholder: "e.g. Q3 listing strategy" },
      { key: "audience", label: "Audience", type: "text", placeholder: "Who you're presenting to", fromProfile: "audience" },
      { key: "slides", label: "Number of slides", type: "select", options: ["8", "12", "16"] },
    ],
    system: "You are a presentation designer. Produce a slide-by-slide outline: for each slide give a title, 2-4 concise bullets, and a one-line speaker note. Open with a hook slide and close with a CTA slide. Output Markdown, one section per slide.",
    buildUser: (i) => b(`Topic: ${i.topic}\nAudience: ${i.audience || "(infer)"}\nSlides: ${i.slides || "12"}`),
  },
  {
    key: "app-designer",
    name: "App Designer Brief",
    category: "Strategy",
    tier: "tools_pro",
    wave: 1,
    blurb: "A complete build-ready app brief (Lovable/Bolt-style prompt) from your business idea — screens, data, flows.",
    fields: [
      { key: "idea", label: "App idea / business", type: "textarea", required: true, placeholder: "What the app should do", fromProfile: "product" },
      { key: "users", label: "Primary users", type: "text", placeholder: "Who uses it", fromProfile: "audience" },
      { key: "platform", label: "Platform", type: "select", options: ["Web app", "Mobile app", "Both"] },
    ],
    system: "You are a senior product designer. Produce a build-ready app brief: app summary, core user stories, screen-by-screen breakdown, data model sketch, and a single copy-paste prompt an AI app-builder (Lovable/Bolt) could run. Output Markdown.",
    buildUser: (i) => b(`App idea: ${i.idea}\nPrimary users: ${i.users || "(infer)"}\nPlatform: ${i.platform || "Web app"}`),
  },
  {
    key: "sora-prompt",
    name: "Sora 2 Prompt Creator",
    category: "Copy",
    tier: "tools_pro",
    wave: 1,
    blurb: "Professional, cinematic Sora 2 video prompts — shot, motion, lighting and style fully specified.",
    fields: [
      { key: "vision", label: "Video idea / vision", type: "textarea", required: true, placeholder: "Describe the video you imagine" },
      { key: "mood", label: "Mood / style", type: "text", placeholder: "e.g. warm, cinematic, documentary" },
      { key: "duration", label: "Duration", type: "select", options: ["5s", "10s", "20s"] },
    ],
    system: "You are a cinematic AI-video creative director. Turn the idea into 2-3 polished Sora 2 prompts, each specifying subject, action/motion, camera shot & movement, lighting, color/mood, and style. Output Markdown.",
    buildUser: (i) => b(`Vision: ${i.vision}\nMood/style: ${i.mood || "(choose the most fitting)"}\nDuration: ${i.duration || "10s"}`),
  },
  {
    key: "prompt-coach",
    name: "Prompt Engineering Coach",
    category: "Strategy",
    tier: "tools_basic",
    wave: 1,
    blurb: "Paste a prompt and get expert feedback plus an upgraded version — learn to communicate with AI effectively.",
    fields: [
      { key: "prompt", label: "Your prompt", type: "textarea", required: true, placeholder: "Paste the prompt you want to improve" },
      { key: "goal", label: "What you're trying to get", type: "text", placeholder: "Desired outcome (optional)" },
    ],
    system: "You are a prompt-engineering coach. Score the prompt (clarity, context, specificity, constraints), explain what's weak and why, then provide a rewritten, upgraded prompt. Teach the principle behind each fix. Output Markdown.",
    buildUser: (i) => b(`Prompt:\n${i.prompt}\nDesired outcome: ${i.goal || "(infer)"}`),
  },
  {
    key: "business-coach",
    name: "Interactive Business Coach",
    category: "Strategy",
    tier: "tools_pro",
    wave: 1,
    blurb: "Diagnose your core challenge and get targeted, actionable growth strategies tailored to your situation.",
    fields: [
      { key: "challenge", label: "Your biggest challenge right now", type: "textarea", required: true, placeholder: "What's holding the business back?" },
      { key: "stage", label: "Stage", type: "select", options: ["Just starting", "Some traction", "Growing", "Plateaued"] },
      { key: "goal", label: "Goal for next 90 days", type: "text", placeholder: "Optional" },
    ],
    system: "You are a sharp, practical business coach. Diagnose the likely ROOT challenge behind what they describe, surface 2-3 growth opportunities they may be missing, and give a focused, prioritized 90-day action plan. Ask 2-3 clarifying questions at the end to go deeper. Honest and specific. Output Markdown.",
    buildUser: (i) => b(`Challenge: ${i.challenge}\nStage: ${i.stage}\n90-day goal: ${i.goal || "(help them choose)"}`),
  },

  // ---- Wave 2: media tools. Stubbed + key/G-gated (need third-party paid API keys =
  // Ali's financial/keys boundary). Shown as "Bring keys" until Ali provides keys. ----
  { key: "logo", name: "Logo Generator", category: "Media", tier: "tools_media", wave: 2, comingSoon: true, blurb: "Generate professional logos with AI (FLUX.1-class). Needs an image-model key.", fields: [], system: "", buildUser: () => "" },
  { key: "vector", name: "Vector Generator", category: "Media", tier: "tools_media", wave: 2, comingSoon: true, blurb: "Scalable SVG icons & illustrations from a prompt. Needs an image-model key.", fields: [], system: "", buildUser: () => "" },
  { key: "avatar-video", name: "AI Avatar Video", category: "Media", tier: "tools_media", wave: 2, comingSoon: true, blurb: "Talking-avatar videos from a photo + script (HeyGen-class). Needs a video-model key.", fields: [], system: "", buildUser: () => "" },
  { key: "music", name: "Music Studio", category: "Media", tier: "tools_media", wave: 2, comingSoon: true, blurb: "AI-generated music & songs with custom lyrics. Needs an audio-model key.", fields: [], system: "", buildUser: () => "" },
  { key: "book-cover", name: "Book Cover Generator", category: "Media", tier: "tools_media", wave: 2, comingSoon: true, blurb: "Professional ebook & book covers with AI. Needs an image-model key.", fields: [], system: "", buildUser: () => "" },
  { key: "coloring-book", name: "Coloring Book Creator", category: "Media", tier: "tools_media", wave: 2, comingSoon: true, blurb: "AI-generated coloring book pages, KDP-ready. Needs an image-model key.", fields: [], system: "", buildUser: () => "" },
  { key: "morph-me", name: "Morph Me", category: "Media", tier: "tools_media", wave: 2, comingSoon: true, blurb: "Transform selfies into artistic styles with AI image morphing. Needs an image-model key.", fields: [], system: "", buildUser: () => "" },
  { key: "transcription", name: "Audio Transcription", category: "Media", tier: "tools_media", wave: 2, comingSoon: true, blurb: "Transcribe audio from files, URLs or recordings. Needs a speech-to-text key.", fields: [], system: "", buildUser: () => "" },
  { key: "web-scraper", name: "Web Scraper", category: "Media", tier: "tools_media", wave: 2, comingSoon: true, blurb: "Extract clean content from any webpage (Firecrawl). Needs a scraper key.", fields: [], system: "", buildUser: () => "" },
];

export function getTool(key: string): ToolDef | undefined {
  return TOOLS.find((t) => t.key === key);
}

export function listTools(): ToolDef[] {
  return TOOLS;
}
