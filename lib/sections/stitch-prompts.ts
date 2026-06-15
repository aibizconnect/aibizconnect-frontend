/**
 * Stitch prompt library for the Section Template Factory (D-360/D-365, Gemini-authored, Copilot-
 * ratified). Each prompt is engineered so Stitch's output translates cleanly into OUR native
 * elements: ONE section (not a page), neutral palette (re-themes to any brand), ≤40px spacing,
 * simple responsive grid, real placeholder copy. Paste a prompt into Stitch (generate_screen_from_text),
 * then import the result through the factory.
 */

export interface StitchPrompt { key: string; label: string; category: string; variant: string; prompt: string }

/** Shared constraints prepended to every section prompt. */
export const STITCH_CONSTRAINTS = `Design constraints (for clean import into our website builder):
- Output ONE single full-width section only — NOT a full page. No global site header/footer unless that IS the requested section.
- Neutral palette only: white or light-gray background, dark-gray text, subtle 1px borders, soft shadows, 4–8px corner radius. Do NOT use strong brand colors — our system re-themes it.
- Font: Inter for both headings and body. Spacing in multiples of 8px; never exceed 40px for any single padding or margin.
- Layout: simple, responsive grid/flex with 1–4 equal columns. No overlapping elements, no absolute positioning. Must be mobile-safe.
- Use real, specific placeholder copy (no lorem ipsum, no [bracketed tokens]).`;

const p = (body: string) => `${STITCH_CONSTRAINTS}\n\nSection to design:\n${body}`;

export const STITCH_PROMPTS: StitchPrompt[] = [
  { key: "header-classic", label: "Header — Logo · Menu · CTA", category: "Headers", variant: "light",
    prompt: p(`A website HEADER bar. Left: a text wordmark logo "Northbridge". Center: a horizontal nav menu with links Home, Services, About, Contact. Right: one primary button "Get Started". A thin hairline border along the bottom edge. Compact height, vertically centered.`) },
  { key: "hero-centered", label: "Hero — Centered + dual CTA", category: "Hero", variant: "light",
    prompt: p(`A HERO section, content centered. A short eyebrow line "Welcome", a large headline "Your business, beautifully online", a one-sentence subheading, then two buttons side by side: a solid "Get Started" and an outline "See how it works". Generous vertical padding.`) },
  { key: "hero-split", label: "Hero — Split copy + photo", category: "Hero", variant: "light",
    prompt: p(`A HERO section in two equal columns. Left column: headline "Grow with confidence", a supporting paragraph, and a primary button "Book a call". Right column: a single rounded photo placeholder. Stacks to one column on mobile (copy first).`) },
  { key: "about-split", label: "About — Photo + story", category: "About & Services", variant: "light",
    prompt: p(`An ABOUT section, two equal columns. Left: a rounded photo placeholder. Right: a heading "About us", two short paragraphs of company story, and a text link "Read our story →". Vertically centered.`) },
  { key: "team-3", label: "Meet the Team — 3 cards", category: "Team", variant: "light",
    prompt: p(`A MEET THE TEAM section. A centered heading "Meet the team" and a one-line subheading, then a 3-column grid of member cards. Each card: a round avatar photo placeholder, a name ("Jordan Avery"), a role ("Founder & CEO"), and a one-line bio. Cards have a subtle border.`) },
  { key: "cta-band", label: "CTA — Centered band", category: "Conversion", variant: "light",
    prompt: p(`A call-to-action SECTION, centered. A heading "Ready to get started?", a one-line subheading, and one primary button "Book a free consultation". Light surface background, generous padding.`) },
  { key: "form-contact", label: "Contact Form — name/email/phone/message", category: "Conversion", variant: "light",
    prompt: p(`A CONTACT section, two equal columns. Left: a heading "Get in touch" and a short invitation paragraph plus a phone and email line. Right: a contact form with fields Name, Email, Phone, and a multi-line Message, and a submit button "Send message".`) },
  { key: "features-3", label: "Features — 3-up icons", category: "Features", variant: "light",
    prompt: p(`A FEATURES section. Centered heading "Why choose us" and a one-line subheading, then a 3-column grid of feature cards. Each card: a simple line icon, a bold short title, and a one-sentence description. Equal-height cards with a subtle border.`) },
  { key: "testimonials-3", label: "Testimonials — 3 quotes", category: "Social Proof", variant: "light",
    prompt: p(`A TESTIMONIALS section. Centered heading "What clients say", then a 3-column grid of quote cards. Each card: a short customer quote in quotation marks, then a small round avatar with a name and role beneath. Cards have a soft shadow.`) },
  { key: "footer-columns", label: "Footer — brand + link columns", category: "Footers", variant: "dark",
    prompt: p(`A website FOOTER, dark-gray background with light text. Left: a wordmark "Northbridge" and a one-line tagline. Then three columns of link lists titled Company, Services, and Legal (4 links each). A thin divider, then a centered copyright line below.`) },
  // Dark / bold variants
  { key: "hero-dark", label: "Hero — Dark, bold", category: "Hero", variant: "dark",
    prompt: p(`A HERO section on a dark-gray background with light text, content centered. A bold headline "Build something people remember", a one-line subheading, and one primary button "Start free". Generous padding.`) },
  { key: "features-dark", label: "Features — Dark 3-up", category: "Features", variant: "dark",
    prompt: p(`A FEATURES section on a dark-gray background with light text. Centered heading "Everything you need" and a subheading, then a 3-column grid of cards, each with a line icon, a bold title, and a one-line description.`) },
];

export const STITCH_PROMPT_CATEGORIES = Array.from(new Set(STITCH_PROMPTS.map((s) => s.category)));
