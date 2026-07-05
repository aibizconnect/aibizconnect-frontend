# Five App Ideas + Feasibility Studies

**Companion to:** `2026-07-small-biz-pain-points.md` (the research) and `idea-scorecard-framework.md` (the scoring method).
**Constraint from the brief:** fast to build, easy to implement, very little cost to us, standalone or web-based.
**Strategic lens:** each idea is scoped to reuse AIBizConnect's existing assets — Next.js 16 / React 19 / Supabase, the multi-tenant model, the website builder (Puck), the CRM/funnels, and the AI assistant — so build cost stays near-zero and each product doubles as an acquisition wedge into the core platform.

Each idea maps to a top-ranked pain from the research and is scored in `idea-comparison.html`.

---

## Idea 1 — **RedTape Radar** (compliance & deadline autopilot)

**Pain solved (#1, ✅ strongest evidence):** the admin/compliance time-tax — micro-firms burn **735 hrs/yr, 256 on red tape**, and pay **5× more per employee** than big firms (CFIB 2025).

**What it is:** a dead-simple web app that asks 5 questions (province, business type, incorporation status, employees, HST-registered?) and returns a **personalized compliance calendar** — HST/GST filing dates, payroll remittances, WSIB, annual returns, T4/T5 deadlines — with email/SMS reminders and a one-line "what to do" per item. No accounting, no ledger — just *"here's what's due, when, and what happens if you miss it."*

**Who the clients are:** Canadian micro-businesses (1–4 employees) and the newly self-employed who don't have a bookkeeper. **91.1% of Canadian employer businesses are 1–19 employees** (StatCan). Beachhead: Toronto sole proprietors and incorporated consultants.

**How we serve them:** rules-as-data (a JSON table of deadlines per province/entity type), a cron job for reminders (Supabase + scheduled function), AI assistant to answer "what is a T4A?" in plain language. Ships as a standalone microsite that upsells the full AIBizConnect platform.

**Monetization:** freemium — calendar free, reminders + document checklist + "done-for-you filing links" at **$9–15/mo**. Compliance spend is already proven ($3,839/yr on red tape for <5-emp firms), so willingness to pay is high.

**Existing tools & why they fail:** accountants (expensive, not real-time), QuickBooks (backward-looking ledger, overkill), government sites (fragmented, jargon). Nobody hands a solo a single simple *forward* calendar.

**MVP scope (small):** rules table for Ontario first (5–6 deadline types), onboarding quiz, calendar view, email reminders. ~2–3 weeks.

**Risks:** compliance accuracy liability (mitigate: "informational, not advice" + link to official sources); rules must be maintained per province/year.

---

## Idea 2 — **CashRunway** (cash-flow foresight for solos)

**Pain solved (#2, ◑ strong):** cash-flow unpredictability — **unpredictable income is the #1 independent pain (49%)**; Toronto fixed costs are **volatile** (rent +68.5% in one year); 56% of US firms borrow just to cover operating expenses.

**What it is:** a lightweight forward cash-flow view. Connect (or manually enter) expected invoices + recurring fixed costs; it shows a **6–12 week runway line** — "you dip below $0 the week of Aug 18 unless the Northwind invoice lands." Alerts when a shortfall is forecast. Answers the one question accountants don't: *"will I make rent?"*

**Who the clients are:** solos and micro-firms with lumpy income — freelancers, trades, hospitality, seasonal retail. US: **72.9M independents, 5.6M earning >$100k**. Toronto hospitality (>50% unprofitable) is an acute local wedge.

**How we serve them:** manual/CSV entry first (no bank integration needed for MVP = fast + cheap + no compliance headache), Chart.js runway chart (already a dependency), Supabase for storage. AI assistant suggests "invoice these 3 clients early to avoid the dip."

**Monetization:** free single-scenario; **$12–19/mo** for alerts, multiple scenarios, and "what-if" (what if I raise prices 8%?). High-earners proven able to pay.

**Existing tools & why they fail:** QuickBooks/Wave are backward-looking ledgers; Float/Pulse are priced/scoped for bookkept SMBs with bank feeds, not manual solos. The *simple forward* view for a non-bookkept solo is whitespace.

**MVP scope (small-medium):** manual income/expense entry, recurring costs, runway chart, one alert rule. ~3–4 weeks.

**Risks:** manual entry friction (mitigate with templates + AI parsing of a pasted invoice list); accuracy expectations.

---

## Idea 3 — **LeadLoop** (client-acquisition follow-up autopilot)

**Pain solved (#3, ◑ strong):** client acquisition is the **#1 operational pain** for US employer firms *and* freelancers (**58%** named it their biggest challenge).

**What it is:** the "stop leads falling through the cracks" app. A simple pipeline (New → Contacted → Quoted → Won/Lost) with **automated, AI-drafted follow-up nudges** — "you quoted Maria 5 days ago, send this follow-up?" One-click send. Built for people who don't want a CRM but keep losing business to slow follow-up.

**Who the clients are:** service micro-businesses and freelancers who win work by relationship, not ads — trades, consultants, designers, cleaners, coaches.

**How we serve them:** this is the **thinnest slice of AIBizConnect's existing CRM/funnels + AI assistant** — repackaged as a focused standalone. Reuses tenant model, CRM tables, AI drafting. Lowest marginal build cost of the five because the engine already exists.

**Monetization:** free up to 25 contacts; **$15–25/mo** for automated sequences + AI drafting. Natural upsell to full AIBizConnect (website + funnels).

**Existing tools & why they fail:** HoneyBook/Dubsado (too much, too pricey for a solo), full CRMs (setup burden). The micro-user wants *follow-up reminders*, not a CRM to configure.

**MVP scope (small — mostly reuse):** strip existing CRM to a 4-stage board, add AI follow-up drafts + a nudge rule. ~2 weeks given existing code.

**Risks:** crowded category (differentiate on *simplicity* + AI drafting + AIBizConnect funnel tie-in); email deliverability.

---

## Idea 4 — **PriceGuard** (margin & repricing calculator)

**Pain solved (#4, ◑ strong):** margin erosion under cost inflation — **Cost of Supplies jumped 12th→2nd** in NFIB; 77% of US firms hit by rising/tariff costs; input costs a top-5 Canadian obstacle.

**What it is:** a focused calculator + monitor. Enter your products/services and their input costs; it shows real margin per item and flags when a cost increase has quietly killed your margin — *"your combo plate now nets 4%, was 22%; raise to $18.50 to restore."* Optional monthly "cost check-in" prompt.

**Who the clients are:** product/food/retail micro-businesses that set prices by gut — Toronto restaurants and shops (the most cost-squeezed segment), makers, e-commerce solos.

**How we serve them:** pure calculation + storage — no integrations, cheapest possible build. Chart.js margin bars, Supabase for saved products, AI assistant for "suggest a new price" and "write the menu update."

**Monetization:** free calculator (acquisition); **$9–15/mo** for saved catalogs, cost-change alerts, and repricing suggestions.

**Existing tools & why they fail:** spreadsheets (manual, no alerts), POS analytics (locked to the POS, backward-looking, enterprise-priced). A standalone *repricing advisor* for a 1-person shop barely exists.

**MVP scope (smallest):** product+cost entry, margin calc, one repricing suggestion. ~1–2 weeks.

**Risks:** perceived as "just a spreadsheet" — differentiate with alerts + AI repricing copy + industry benchmarks; lower willingness to pay than 1–3.

---

## Idea 5 — **HireQuick** (micro-hiring & screening helper)

**Pain solved (#5, ◑ medium):** finding qualified people — **#5 US pain (28% critical)**; **23.5% of Canadian small firms** cite recruiting.

**What it is:** an app that turns "I need to hire but have no time" into a shipped job post + a screening funnel: AI writes the posting from a 3-question brief, generates 5 screening questions, and ranks applicant responses so the owner talks to the top 3 only.

**Who the clients are:** micro-firms making their first few hires — trades, retail, food, clinics — without an HR person.

**How we serve them:** AI generation (assistant already in stack) + a simple application form (reuse website builder form blocks) + a ranking view. No ATS complexity.

**Monetization:** **$29–49 per job post** (one-off, matches how micro-firms hire — episodically) or $19/mo for always-on.

**Existing tools & why they fail:** Indeed/LinkedIn (distribution, not screening; expensive), ATSs (built for teams). The *screening + shortlisting* help for a 1–4 person shop is thin.

**MVP scope (medium):** brief→post generator, hosted application form, AI ranking. ~3–4 weeks.

**Risks:** hiring is episodic (churny subscriptions → favor per-post pricing); bias/fairness concerns in AI ranking (keep human-in-loop, no auto-reject); doesn't solve distribution (the harder half).

---

## Recommendation

Raw weighted scores (default weights): **LeadLoop 4.05 · PriceGuard 3.95 · RedTape Radar 3.85 · CashRunway 3.80 · HireQuick 3.20.** The recommendation applies one layer of judgment on top of the raw score (see the framework doc for why), and lands on **two revenue products in sequence plus one free lead magnet:**

1. **Ship first — LeadLoop (Idea 3).** Clear #1 on score *and* strategy. Lowest marginal build cost (a thin repackaging of the CRM + AI assistant already in the codebase), targets the #1 operational pain on both sides of the border, and is the most natural funnel into full AIBizConnect. Fastest path to a live, monetizable product and to learning.

2. **Ship second — RedTape Radar (Idea 1).** Raw score puts it #3, but on the criteria that predict *revenue* it's the strongest of all five: **willingness-to-pay 5** (proven $3,839/yr red-tape spend) and **evidence 5** (the only ✅ 3–0-verified, multi-source pain). It's only held off #2 by "cost to us" (per-province rules upkeep). It's Toronto/Ontario-first (our beachhead) and highly differentiated — almost nobody offers a simple forward compliance calendar for solos. A defensible, sticky, locally-aware wedge worth the data maintenance.

3. **Bundle as a free lead magnet — PriceGuard (Idea 4).** It scores #2 on raw weight *only because it's the cheapest and fastest to build* — but its willingness-to-pay is a 2 (people expect margin math to be free). So don't sell it standalone: ship it as a **free calculator** that captures leads into LeadLoop/AIBizConnect. Near-zero build, high top-of-funnel value, no revenue expectation to disappoint.

**Why not the rest first:** *CashRunway* is strong (biggest market) but manual-entry friction and accuracy expectations make it a fast-follow. *HireQuick* solves screening but not distribution (the harder half), and hiring's episodic nature fights subscription revenue.

**Reusable takeaway:** all five were scored with the same rubric in `idea-scorecard-framework.md`. Drop any future idea into `idea-comparison.html`, score it 1–5 on each criterion, and it slots into the same ranking automatically — so this becomes the standing way we triage product bets, not a one-off.
