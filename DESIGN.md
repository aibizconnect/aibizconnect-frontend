# AIBizConnect — Design System (source of truth)

This file is the canonical design system for **AIBizConnect**, an AI business platform for small
businesses (website builder + CRM + funnels + social + AI assistant). It is written for Claude Design's
GitHub integration: read this together with `app/abc-design-system.css` (the live tokens) and the example
components below. **Match this exactly** — generated UI should look like AIBizConnect, not a generic app.

## Brand, in one line
Confident, modern SaaS for non-technical small-business owners. Clean, trustworthy, "your whole business
online in minutes." Royal-blue + deep navy, lots of white space, soft cool shadows, friendly rounded
corners, a little springy motion. Never loud or gimmicky.

## Tech & conventions (important)
- **Stack:** Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 (`@theme`) · Supabase.
- **Tokens live in CSS variables**, defined in `app/abc-design-system.css`.
- **Scoping rule (do not skip):** the whole design system is scoped under a **`.abc-ds`** wrapper class,
  NOT `:root`. Its token names (`--text-*`, `--radius-*`, `--shadow-*`, `--font-sans`, `--space-*`) collide
  with Tailwind v4's `@theme` vars, so putting them in `:root` would restyle the entire existing app.
  **Every new screen/surface must opt in** by rendering inside an element with `className="abc-ds"`, then
  reference tokens via `var(--…)` (inline styles or CSS). Existing components do this.
- Reference components already built to this system: `components/onboarding/WelcomeScreen.tsx`,
  `components/onboarding/OnboardingWizard.tsx`, `app/tenants/[tenantId]/dashboard/page.tsx`,
  `components/dashboard/AskAibizDrawer.tsx`.

## Color
Brand blue scale (primary), navy ink, neutral grays, semantic hues. Hex values are authoritative.

```
Blue   900 #12164A · 800 #1B2173 · 700 #262E82 · 600 #2F399D · 500 #3D49C4 (PRIMARY)
       400 #555FC4 · 300 #7C84D6 · 200 #B4B9EC · 100 #E2E4FA · 50 #F1F2FE
Navy   900 #090966 (wordmark ink) · 700 #15173F
Gray   900 #181920 · 800 #2B2C34 · 700 #44454E · 600 #62636D · 500 #909094
       400 #B6B7BD · 300 #D6D7DE · 200 #E8E9EF · 100 #F2F3F7 · 50 #F8F9FC · white #FFFFFF
Green  600 #168A5E · 500 #1F9D6B · 100 #E0F4EC   (success)
Amber  600 #C8870B · 500 #E0A115 · 100 #FBF0D6   (warning)
Red    600 #C9303A · 500 #DC4040 · 100 #FBE3E4   (danger)
```

Semantic aliases (use these, not raw scale values, in components):
```
--color-primary #3D49C4  --color-primary-hover #2F399D  --color-primary-contrast #FFFFFF  --color-accent #555FC4
--text-strong #090966 (navy)  --text-heading #181920  --text-body #44454E  --text-muted #909094  --text-on-brand #FFF
--surface-page #F8F9FC  --surface-card #FFFFFF  --surface-sunken #F2F3F7  --surface-brand #2F399D  --surface-brand-strong #090966
--border-subtle #E8E9EF  --border-default #D6D7DE  --border-strong #B6B7BD  --border-brand #3D49C4
--success #1F9D6B  --warning #E0A115  --danger #DC4040
--gradient-brand: linear-gradient(135deg,#2F399D 0%,#555FC4 100%)   /* THE signature gradient */
```
Dark/brand sections use `linear-gradient(160deg, #090966, #262E82)` (navy→blue), white text, `--blue-200`
for muted text on dark.

## Typography
- **Display / headings:** `MontserratAlt1` (the brand wordmark face), falls back to `Montserrat`. Semibold (600).
- **Body / UI:** `Montserrat`.
- **Mono / numeric:** `Roboto Mono`.
- Headings: tight line-height (1.1), letter-spacing `-0.02em`. Eyebrows: 12px, bold, `0.08em`, UPPERCASE, primary color.

Scale: `xs 12 · sm 14 · base 16 · md 18 · lg 20 · xl 24 · 2xl 30 · 3xl 38 · 4xl 48 · 5xl 60 · 6xl 76` (px).
Weights: regular 400 · medium 500 · semibold 600 · bold 700 · extra 800.

## Spacing & layout
4px base scale: `1=4 2=8 3=12 4=16 5=20 6=24 8=32 10=40 12=48 16=64 20=80 24=96 32=128` (px).
Containers: sm 640 · md 860 · lg 1120 · xl 1320. Control heights: sm 34 · md 42 · lg 52.

## Radii, elevation, motion
- Radii: `xs 4 · sm 6 · md 10 · lg 14 · xl 20 · 2xl 28 · pill 999` (px). SaaS-friendly rounding; cards use lg/xl, buttons md, chips pill.
- Shadows: soft, cool-tinted (rgba(18,22,74,…)). `xs/sm/md/lg/xl` scale + `--shadow-brand: 0 8px 24px rgba(61,73,196,.30)` for primary CTAs.
- Motion: quick + springy. `--ease-out cubic-bezier(.22,1,.36,1)`, `--ease-spring cubic-bezier(.34,1.56,.64,1)`; durations 120/200/320ms. Keyframes available: `abc-spin`, `abc-fade`, `abc-pop`, `abc-float`.

## Components (the look)
- **Primary button:** bg `--color-primary`, white text, radius `--radius-md` (10px), `--shadow-brand`, height 46–48, semibold. On a colored band, invert (white bg, primary text).
- **Secondary/ghost button:** white bg, `1px --border-default`, `--text-strong`, `--shadow-xs`.
- **Card:** white, `1px --border-subtle`, radius lg/xl, `--shadow-xs/sm`, padding 18–24.
- **Input/select:** height 46, `1px --border-default`, radius md, focus ring `--ring-focus`.
- **Pill / chip:** `--radius-pill`, used for status ("Published" green), eyebrows, connect buttons, suggestion chips (`--blue-50` bg, primary text).
- **Eyebrow:** small uppercase label in primary, above headings.
- **AI / brand panel:** navy→blue gradient, white text, used for the "AIBiz suggested" panel and the generating screen.
- **Progress:** thin (6–8px) track `--gray-100`, fill `--gradient-brand`.
- **Logos:** `/abc/app-icon.png` (mark), `/abc/aibiz-blue.png`, `/abc/aibiz-white.png`. Wordmark = "AIBiz" navy + "Connect" in `--color-primary`, MontserratAlt1.

## Signature screens (reproduce these patterns)
- **Welcome / product entry:** radial blue-50 wash, centered status pill, big navy headline, an "Analyze your
  site" input card with primary CTA, social-connect pills, trust line.
- **Onboarding wizard:** "Step N of 4" progress, animated analyzing/generating screens (spinner + check rows),
  profile/offer/goals/style steps, success reveal with a green check.
- **Dashboard:** light page, KPI cards row, navy→blue "AIBiz suggested" panel, gradient bar chart, recent
  activity table, floating "✨ Ask AIBiz" launcher → right-side assistant drawer.

## Do / Don't
- ✅ Use the semantic tokens and the brand gradient; keep generous white space; soft cool shadows; rounded but not pill-everywhere.
- ✅ Wrap new surfaces in `.abc-ds`.
- ❌ No hardcoded hex when a token exists. ❌ No heavy/black drop shadows. ❌ No fonts other than Montserrat/MontserratAlt1/Roboto Mono. ❌ Don't put these tokens in `:root` (collides with Tailwind).
