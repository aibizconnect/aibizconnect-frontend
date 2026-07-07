# LeadLoop — Customer Fulfillment & Onboarding Runbook

**What this is:** the operational SOP for what *you* do from the moment someone
becomes a customer — whether they **self-enroll** or **book a strategy session**
first — until their LeadLoop is live and handed off. It's the
**per-customer repeatable process** — the [`leadloop-ghl-launch-playbook.md`](./leadloop-ghl-launch-playbook.md)
tells you how to *build* the engine once (architecture §1, GHL workflows §2,
message library §3, offer/pricing §5); this runbook tells you how to *stamp out
a paying customer* from the saved Snapshot, fast and the same way every time.

**Written for you.** You bring the accounts and the clicks. Every step has an
**owner**, a **rough time**, and a **done-check** so nothing slips. GHL menu
labels drift over time — I describe *what to look for*, which stays stable.

**The one thing that decides your timeline:** A2P 10DLC (~1–5 business days).
SMS can't fire until it clears, so it gets submitted the *moment* intake is
complete. Everything else can happen while that clock runs. This is the long
pole in every onboarding — treat it that way.

**Support & business identity (use these, never anything personal):**
- Support email: **support@aibizconnect.ca**
- Shared build line: **+1 365-363-7111** (for your own testing/demo only — each
  customer gets *their own* local number provisioned in their sub-account).
- Self-serve enroll page: **`/enroll`** (the "Enroll Now" CTA — Path A).
- Strategy-session booking: **https://aibizconnect.ca/initial-strategy-session** (the secondary CTA — Path B).
- Payments: **Stripe** (setup fee + subscription). ID/KYC via **Stripe Identity** only if a customer needs verification.

**The single external dependency — the Stripe Payment Link.** One reusable
Stripe Payment Link covers **$497 setup + $197/mo subscription**. You create it
**once** and reuse it for every customer, both paths — the self-serve `/enroll`
page points at it, and you paste the same link into the enroll-follow-up copy for
session prospects. Referenced throughout as the **enroll link**
(`{{custom_values.enroll_link}}` in GHL).

**Legend:** ⏱ = rough time · 🔴 = start-and-wait, do as early as possible ·
Owner "You" = the operator · "Auto" = fires automatically · "Customer" = they do it.

---

## The two entry paths (how someone becomes a customer)

The live site (**lead-loop.co**) offers **two calls to action**:
- **Primary — "Enroll Now"** → the self-serve `/enroll` page (pay and go).
- **Secondary — "Complimentary Strategy Session"** → book a call first.

That gives you two ways an order arrives. **The whole runbook branches on one
question at the top — did they self-enroll, or book a session? — and then
converges: once money is in, Stages 4–10 (intake → provision → A2P → customize →
QA → handoff → month 1) are *identical* for both paths.**

### Path A — "Enroll Now" (self-serve, ready-to-buy)
Visitor clicks **Enroll Now** → pays via the Stripe Payment Link (**$497 setup +
$197/mo**) → is immediately sent the intake form → you provision + submit A2P.
**No sales call required** (you offer an *optional* 15-min welcome call).

> **For Path A, "an order" = the Stripe payment succeeds.** Payment happens
> **before** intake, so **Stage 1 (the close call) is skipped** — it collapses
> into a short welcome touch (Stage 1A).

### Path B — "Complimentary Strategy Session" (talk-first)
Session booked → you qualify + close on/after the call → then you send the
**enroll link** (the same Stripe Payment Link) to pay.

> **For Path B, "an order" = they pay via the enroll link** (on the call or
> shortly after). If they **don't** enroll on the call, they drop into the
> **nurture-to-enroll campaign** (Workflow G, below) that keeps sending the
> enroll link until they buy or opt out.

**Which is which at a glance:**

| | **Path A — Enroll Now** | **Path B — Strategy Session** |
|---|---|---|
| Trigger | Stripe payment succeeds | Session booked/attended |
| Sales call | Optional 15-min welcome | Full qualify + close call |
| Money timing | **Before** intake | At/after the call (enroll link) |
| If they don't buy | n/a (already paid) | → Workflow G nurture-to-enroll |
| Stages 4–10 | **Identical** | **Identical** |

---

## Stage 0 — Order lands *(Auto + You)* — **branch here**

**First question: did they self-enroll (Path A) or book a session (Path B)?**
The notification tells you which. Then follow the matching branch below. After
Stage 1/1A, both paths run the same.

### Path A — Stripe payment succeeded *(Auto + You · ⏱5 min)*
**What auto-happens the instant they pay** (wire this in GHL/Stripe):
- Stripe receipt to the customer; payment event lands in GHL as a new contact/
  opportunity tagged **`enrolled — self-serve`**.
- The **intake form is sent automatically** (email/SMS) — Path A skips the call,
  so intake is the customer's first real step.
- You get an internal "new self-serve enrollment" notification.

**Your bit (⏱5 min):** confirm the payment cleared in Stripe, note name/business/
vertical, and (optional) send a one-line welcome offering the 15-min call. Then
go straight to **Stage 1A**.

### Path B — Strategy session booked *(Auto + You · ⏱10 min prep)*
**What auto-happens the instant they book** (already wired in your own GHL — this
is LeadLoop selling LeadLoop):
- Booking confirmation SMS + email to the prospect with the session time.
- 24h and ~2h reminders queued (Workflow D shape, playbook §2.5) → this is what
  keeps your strategy-session show-rate high.
- Contact lands in your **"New setup request / Strategy Session" pipeline** at
  the *New Lead* stage; you get an internal notification.

**Your prep before the call (⏱10 min):**
1. Open the booking notification — note **name, business, phone, and any note**
   they left (vertical is often obvious from the business name).
2. Have these tabs open: **GHL agency dashboard** (ready to create a sub-account),
   **Stripe dashboard** (the enroll link ready), the **playbook §5 offer wording**,
   and this runbook.
3. Do a 60-second look at their business (website / Google listing) so you can
   name their exact situation on the call.

✅ **Done when:** you know which path this is, who the customer is, roughly what vertical, and (Path B) you have GHL + Stripe + the offer open.

---

## Stage 1A — Welcome touch *(Path A only · You · ⏱5–15 min, optional call)*

Path A already paid, so there's no selling to do — just a warm start.
1. **Optional 15-min welcome call** — offer it, don't require it. Use it to
   confirm their vertical, answer questions, and set the A2P-wait expectation.
   If they skip it, everything proceeds by email/form.
2. **Confirm the vertical** from the intake form (or the call) — it drives the
   message pack, A2P use-case, and compliance path just like Path B.
3. Set the expectation (in the welcome email or call): *"Texting goes live after
   carrier approval, 1–5 business days — I submit that as soon as your intake is
   in. Email and your booking calendar work immediately."*

Then continue at **Stage 2** (agreement/consent — payment is already done) and on
through the shared stages.

✅ **Done when:** vertical confirmed, welcome sent (call optional), A2P-wait expectation set. → Stage 2.

---

## Stage 1 — The strategy / close call *(Path B only · You · ⏱20–40 min)*

This is the sale. Keep it consultative — you're diagnosing a leak (slow lead
response), not pitching software.

### 1a. Qualify — the five questions (⏱10 min)
Capture the answers; they become your intake data and pre-fill the build.

| Ask | Why it matters downstream |
|---|---|
| **Which vertical / what do you do?** | Picks the message pack + A2P use-case wording + compliance path (real estate / insurance / legal). |
| **Where do your leads come from today?** | Tells you which lead sources to wire in Stage 7 (portal, website form, Facebook/IG, missed calls). |
| **Roughly how many leads a month?** | Sizes the value, sets the guarantee expectation, flags SMS volume for A2P. |
| **What are you using now?** (CRM, calendar, phone) | Which calendar to connect (Google/Outlook), whether there's data to migrate, what you're replacing. |
| **What calendar do you book into?** | You'll connect it in Stage 7 so real availability shows. |

### 1b. Present the offer + guarantee (⏱5–10 min) — from playbook §5
- **$497 one-time setup** — you build their sub-account from the Snapshot,
  connect their leads + calendar, tune the messages to their voice.
- **$197/mo ongoing** — covers your seat cost, margin, and light management.
- **Guarantee:** *"If LeadLoop doesn't book you at least one appointment in the
  first 14 days, you don't pay the monthly."* Demolishes the risk objection.
- **Optional upsell — Reactivation Sprint $300–500 one-time** — run Workflow E
  on their dead lead list. Fastest visible ROI; often the best foot in the door.
  You can offer it now or hold it for the Day-14 check-in (Stage 10).

Sell the math, not the software: one closed deal = thousands in commission/
premium/fees; $197/mo is a rounding error against a single recovered lead.

### 1c. Close — what a "yes" triggers (⏱5 min)
The moment they say yes, tell them the next two things that happen *today*:
1. You'll send the **enroll link** (the same Stripe Payment Link — $497 setup +
   $197/mo) **plus a short service agreement / SMS-consent acknowledgement** to
   sign (Stage 2). They can pay right on the call or from the link after.
2. You'll send a **short intake form** (Stage 4 → [`leadloop-client-intake-form.md`](./leadloop-client-intake-form.md))
   — 5 minutes of their time so you can build everything from one place.

Set the expectation out loud: *"Texting goes live after carrier approval, which
is 1–5 business days — I submit that as soon as you're enrolled and your intake
is in. Email and your booking calendar work immediately."*

**If they DON'T enroll on the call:** don't chase manually. Tag them
**`session — not yet enrolled`** and they drop into **Workflow G — Prospect
Nurture (session → enroll)** (spec'd below), which keeps sending the enroll link
on a warm cadence until they buy or opt out. Your close call isn't the only shot.

✅ **Done when:** they've said yes (or entered nurture), you know their vertical, and they know the enroll link + intake + the A2P wait are coming today.

---

## Stage 2 — Payment + agreement *(You + Customer · ⏱10 min)*

1. **Payment (⏱5 min) — timing differs by path:**
   - **Path A:** *already paid* at `/enroll` before intake. Just confirm the
     Stripe payment cleared and the subscription is active — nothing to charge.
   - **Path B:** send/charge via the **enroll link** (the reusable Stripe Payment
     Link — **$497 setup + $197/mo**). No new tool; Stripe is already in the stack.
2. **Service agreement + SMS-consent terms (⏱5 min):** send the short agreement
   covering **scope + boundaries** (see the "Scope & boundaries" section — put
   these terms *in the agreement* so they're contractual, not verbal), the 14-day
   guarantee wording, and the **customer's acknowledgement that they will only
   load LeadLoop with contacts who have consented to be texted** (this is what
   makes the A2P use-case true — "customers opt in by submitting an inquiry form
   or contacting the business"). For legal/insurance, the agreement also notes
   that **the customer is responsible for compliance sign-off on message copy**
   (see per-vertical table).
3. **ID/KYC (only if needed):** if a customer or their payment needs
   verification, run **Stripe Identity** — skip otherwise.

**Collect before you build (minimum):** payment confirmed (Path A: already done;
Path B: setup fee paid or agreed deposit), signed agreement, and confirmation
they'll return the intake form.

✅ **Done when:** payment confirmed + subscription active, agreement signed (scope + SMS-consent), SMS-consent acknowledged.

---

## Stage 3 — (Bridge) confirm you can start building

Do not provision until you have the **intake minimum** (Stage 4). If the
customer is slow to return the form, get the *four blocking fields* on the phone
right now so the A2P clock can start today: **legal business name, business
address, timezone, and vertical**. Everything else can follow.

---

## Stage 4 — Intake *(Customer + You · ⏱5 min their time)*

Send **[`leadloop-client-intake-form.md`](./leadloop-client-intake-form.md)** —
the onboarding questionnaire. It's copy-pasteable (email it, or turn it into a
GHL form later). It's structured so that a completed form lets you build from the
Snapshot in ~30 minutes.

> **Payment timing note (path-dependent):** for **Path A** the intake form is
> sent automatically the instant they pay, and the form's Section 9 "Payment"
> is **already satisfied** (they paid at `/enroll` before intake) — pre-check it.
> For **Path B** the customer pays at/after the call via the enroll link, so
> Section 9 is completed when they enroll (Stage 2), which may be the same time
> as intake or shortly after.

**The minimum data you MUST have before you can provision + submit A2P:**
- **Legal business name** (exactly as registered — A2P Brand needs this)
- **Business address** (registered business address — A2P Brand needs this)
- **Timezone** (drives calendar + message send times)
- **Vertical + specialty** (message pack + A2P use-case wording + compliance)
- **EIN/BN or business registration number** (A2P Brand registration)
- **Website URL** (A2P Campaign + email domain)

Everything else in the intake form (brand voice, lead sources, calendar login,
compliance wording, assets) is needed for Stages 7–8 but does **not** block
provisioning or the A2P submit — so don't wait on it to start the clock.

✅ **Done when:** you have the six blocking fields above (rest can trickle in).

---

## Stage 5 — Provision from Snapshot *(You · ⏱15 min)*

This is the "one click plus a little typing" step — you are **not** rebuilding
workflows (that's the playbook's job); you're loading the finished system.

1. In the **agency view → create a new Sub-Account (Location)** named for the
   customer (e.g. `Jane Smith — Acme Realty`). ⏱3 min
2. **Load the LeadLoop Snapshot** into it (Agency → Snapshots → push the saved
   LeadLoop snapshot to this sub-account). This brings in the pipeline, all five
   workflows, the calendar shell, and the message templates in one shot. ⏱2 min
   - *If you maintain per-vertical snapshots, load the matching one (real
     estate / insurance / legal). If you keep one snapshot, load it and swap the
     message pack in Stage 7.*
3. Set the sub-account **business name, timezone, and address** from intake
   (required for phone + A2P). ⏱3 min
4. **Add a phone number** (Settings → Phone Numbers → Add Number) — pick a
   **local area-code** number for the customer's market. This is *their* number,
   not the shared build line. ⏱3 min

✅ **Done when:** sub-account exists, Snapshot loaded, business identity set, a local number is provisioned.

---

## Stage 6 — 🔴 A2P submit — *the clock, do this the moment intake is complete* *(You · ⏱20 min + 1–5 day wait)*

**Do not batch this for later.** The instant Stage 5 is done and you have the
business/EIN details, submit A2P — every day you wait is a day the customer's SMS
can't go live.

1. In the sub-account: **Settings → Phone Numbers → Trust Center / A2P
   Registration** → complete **Brand** registration (real business name, address,
   EIN/BN, website — from intake) then **Campaign** registration.
2. **Use the correct per-vertical use-case wording** (see table below). Get this
   right the first time — a vague or mismatched use-case is the most common
   rejection reason.
3. **Tell the customer what to expect:** *"Carrier review is 1–5 business days.
   I've submitted it — I'll message you the moment it clears and we go live. In
   the meantime your booking calendar and email automations already work, and
   I'm customizing everything to your business."*

**What to do while it's pending:** everything in Stage 7. A2P blocks *SMS
sending only* — not building, not calendar, not email.

✅ **Done when:** Brand + Campaign submitted with the right use-case, submission date logged, customer told about the wait.

---

## Stage 7 — Customize to the customer *(You · ⏱30 min, while A2P pends)*

Turn the generic Snapshot into *their* LeadLoop.

1. **Pick / confirm the vertical message pack** and load its copy into the five
   workflows (see the per-vertical table for which file):
   - Real estate → playbook §3
   - Insurance → [`verticals/leadloop-insurance-messages.md`](./verticals/leadloop-insurance-messages.md)
   - Legal → [`verticals/leadloop-legal-messages.md`](./verticals/leadloop-legal-messages.md)
2. **Connect their calendar** (Calendars → connect the customer's Google/Outlook
   from intake) so real availability shows. Set slot length + buffer. **Copy the
   booking link.** ⏱10 min
3. **Set the calendar-link merge field** — drop the booking link into
   `{{custom_values.calendar_link}}` everywhere it's referenced across the
   workflows. ⏱3 min
4. **Tune sender name + business name** — set `{{user.first_name}}` /
   `{{location.name}}` and the sender voice to the customer's brand (from intake
   brand-voice section). Remove any words they asked to avoid. ⏱5 min
5. **Set vertical merge fields** — e.g. `{{custom_values.policy_type}}` (insurance),
   `{{custom_values.matter_type}}` (legal), `{{custom_values.property_or_inquiry}}`
   (real estate). ⏱3 min
6. **Apply branding** — logo/headshot from intake where the platform uses them
   (calendar page, email header). ⏱3 min
7. **Compliance disclaimers — vertical-critical:**
   - **Legal:** add the **"Attorney Advertising"** label + **"Prior results do
     not guarantee a similar outcome"** + the no-attorney-client-relationship
     disclaimer to email templates and the intake/booking touchpoints, per the
     legal message pack's COMPLIANCE FLAGS. **Do not go live for a firm until
     their bar-compliance counsel has signed off on the exact copy.**
   - **Insurance:** set the **licensing disclosure**
     (`{{custom_values.license_jurisdiction}}`) and confirm no message quotes a
     rate or promises savings, per the insurance pack's compliance flags. **Have
     the customer's compliance officer / licensed principal sign off before go-live.**
   - **Real estate:** standard STOP/opt-out on first message of each sequence
     (already in the copy); no special advertising disclaimer required beyond that.
8. **Connect their lead sources** (from intake) — whichever apply:
   - **Website / WP form** → GHL Inbound Webhook or embedded GHL form.
   - **Portal (Zillow/Realtor.com etc.)** → native integration or email-parser → GHL.
   - **Facebook/IG lead ads** → GHL's Facebook integration.
   - **Missed calls** → confirm Workflow B (missed-call text-back) is pointed at
     their new number.

✅ **Done when:** right message pack loaded, calendar connected + link merged, sender/branding set, vertical compliance disclaimer in place, lead sources wired.

---

## Stage 8 — QA / go-live gate *(You · ⏱20 min, after A2P clears)*

**Do not flip a customer live until every box below passes.** SMS steps can only
be fully tested once A2P is approved — so this stage straddles the wait: run the
non-SMS checks during Stage 7, finish the SMS checks the moment A2P clears.

**End-to-end test (run it as if you were a real lead):**
1. **Submit a test lead** through one of their connected sources (or add a test
   contact) → contact appears in the pipeline at *New Lead*. ✅
2. **Auto-reply fires** — instant SMS (§/pack 3.1) + email (§/pack 3.2) arrive. ✅
3. **Book a slot** on their calendar → confirmation message fires, opportunity
   moves stage. ✅
4. **Reminders queue** — 24h + 2h reminders scheduled on the booked appointment. ✅
5. **STOP works** — reply STOP to a sequence message → contact is removed from
   all sequences (the critical safety check; verify it actually exits the loop). ✅
6. **Missed-call text-back** — call their number, don't answer → text-back fires. ✅

**Pre-go-live checklist:**
- [ ] A2P Brand + Campaign **approved** (not just submitted).
- [ ] The right **vertical message pack** is loaded (not the demo/real-estate default on a legal or insurance account).
- [ ] Vertical **compliance disclaimer** present and (legal/insurance) **customer-signed-off**.
- [ ] Calendar shows the customer's **real availability**; booking link works from a message.
- [ ] Every **merge field** resolves (no raw `{{custom_values.…}}` visible in a test send).
- [ ] **Lead sources** confirmed delivering into GHL.
- [ ] **Flip out of demo/test mode** — remove test contacts, turn workflows on/publish, ensure the number is no longer in trial/pending state.

✅ **Done when:** the full end-to-end test passes on live SMS and every checklist box is ticked.

---

## Stage 9 — Handoff & training *(You + Customer · ⏱30 min)*

Short, confidence-building. The customer doesn't need to know GHL — they need to
know *where their bookings show up* and *how to reply*.

**Send / show them:**
1. **The "text your number to see it work" demo** — have them text their own new
   LeadLoop number and watch the auto-reply land in seconds. Seeing it beats
   explaining it, and it's the same demo that closes deals (playbook §6).
2. **How to read the pipeline** — a 5-minute screen-share: New Lead →
   Auto-Contacted → Replied → Appointment Booked. "Green means the machine did
   its job; you jump in when they reply."
3. **Where bookings show up** — their connected calendar + the GHL calendar view.
4. **How to reply** — the GHL mobile app / conversations inbox so they can take
   over any thread. Stress: *the moment you reply, the follow-up loop stops
   nagging them automatically.*
5. **Who to contact** — **support@aibizconnect.ca** for anything.

**Set week-1 expectations:** "Leads get a reply in under 60 seconds and a
follow-up sequence until they book or opt out. You should see the first
auto-replies within days of your first new lead. If a real conversation starts,
jump in — that's your job, the machine hands it to you warm."

✅ **Done when:** customer has done the live text demo, knows where bookings land, can reply from the inbox, and has the support email.

---

## Stage 10 — Ongoing / month 1 *(You · light-touch)*

1. **Light management** — spot-check that leads are flowing and auto-replies are
   firing; nudge the customer if a lead source drops. This is what the $197/mo covers.
2. **Day-14 guarantee check-in (the important one):** confirm LeadLoop booked at
   least one appointment. If yes → reinforce the win, that's your retention. If
   no → look at whether real leads actually came in (guarantee is about *booked
   appointments from leads received*), fix any source/wiring gap, and honor the
   guarantee terms if it genuinely produced nothing.
3. **Reactivation-sprint upsell timing:** the check-in is the natural moment —
   *"Want me to run your old/dead lead list through this and book you
   appointments from contacts you'd written off? Flat $300–500, and if it books
   nothing it's free."* (Workflow E; insurance/legal have consent caveats — see
   their packs before running on old contacts.)
4. **Renewal / retention:** the subscription auto-renews via Stripe. Your
   retention lever is the visible pipeline of booked appointments — surface it.
   A monthly one-line "here's what LeadLoop booked you this month" note keeps the
   $197/mo obviously worth it.

✅ **Done when:** month-1 check-in done, guarantee resolved, upsell offered, subscription healthy.

---

## Per-order timeline (Day 0 → live)

Mirrors the playbook §7, but per *customer* (not per initial build). The Snapshot
means the build itself is fast — **A2P is what sets the calendar.** Day 0 differs
by path; everything from Day 0–1 on is identical.

| Day | Path A — Enroll Now (self-serve) | Path B — Strategy Session | Owner |
|---|---|---|---|
| **0** | **Pay at `/enroll`** → intake auto-sent → agreement/consent signed → **provision from Snapshot → A2P submitted** (optional welcome call) | Strategy call → close → **enroll link paid** + agreement signed → intake sent → **provision from Snapshot → A2P submitted** | You |
| **0–1** | Customize while A2P pends: message pack, calendar connect, merge fields, branding, compliance disclaimer, lead sources | *(same)* | You |
| **0–1** | Customer returns full intake (assets, calendar login, compliance wording) | *(same)* | Customer |
| **1–5** | **A2P approval lands** → SMS goes live → full end-to-end QA test | *(same)* | You + carrier |
| **After approval** | Go-live gate passes → flip out of demo mode → **handoff + training** | *(same)* | You + Customer |
| **Day 14** | Guarantee check-in → reactivation-sprint upsell | *(same)* | You |

> **Path A collapses Day 0:** payment → intake → provision → A2P with no sales
> call in the critical path. If the customer fills intake quickly, you can
> provision + submit A2P the same hour they enroll.
>
> **Fast path (both):** clean business details in hand → provision + submit A2P
> same day and the *only* thing you're waiting on is the carrier. Best case live
> in ~2 business days; plan for up to 5 (see the SLA in Scope & boundaries).
>
> **Path B, no-buy-on-call:** they enter Workflow G nurture; their "Day 0" starts
> whenever they enroll off the nurture link.

---

## Per-vertical differences (real estate vs insurance vs legal)

The process is identical; three things change by vertical. **Handle "which
vertical is this?" as a branch at Stage 1 and carry it through.**

| | **Real estate** (beachhead) | **Insurance brokers** (vertical 2) | **Legal / law offices** (vertical 3) |
|---|---|---|---|
| **Message pack** | playbook §3 | [`verticals/leadloop-insurance-messages.md`](./verticals/leadloop-insurance-messages.md) | [`verticals/leadloop-legal-messages.md`](./verticals/leadloop-legal-messages.md) |
| **A2P Campaign use-case wording** | *"Real estate lead follow-up and appointment booking. Customers opt in by submitting an inquiry form or contacting the business."* | *"Insurance quote follow-up and appointment booking. Customers opt in by submitting a quote request or contacting the brokerage."* (broker-neutral; never implies rate quoting) | *"Law firm client-intake follow-up and consultation booking. Prospective clients opt in by submitting an intake inquiry or contacting the firm."* |
| **Key merge field(s)** | `{{custom_values.property_or_inquiry}}` | `{{custom_values.policy_type}}`, `{{custom_values.license_jurisdiction}}` | `{{custom_values.matter_type}}` |
| **Compliance layer (must do before go-live)** | STOP/opt-out on first message (built in). No special disclaimer. | Licensing disclosure set; **no rate/savings promise, no auto-quoting**; **compliance officer / licensed principal sign-off**. | **"Attorney Advertising" label + "Prior results do not guarantee a similar outcome" + no-attorney-client-relationship disclaimer**; **no outcome/specialist language**; **bar-compliance counsel sign-off**. |
| **Extra caution on Reactivation (Workflow E)** | Standard consent. | Renewal-anchored copy OK; confirm prior consent. | **Highest scrutiny** — confirm prior consent + state solicitation rules with bar counsel *before* first send. |

> For insurance and legal, the vertical message packs carry a full COMPLIANCE
> FLAGS checklist at the bottom — **hand that list to the customer's compliance
> officer / bar counsel and get sign-off before flipping SMS live.** That
> sign-off is a hard gate in Stage 8, not a nice-to-have.

---

## Scope & boundaries (how we keep done-for-you profitable)

Done-for-you is the promise — **but LeadLoop is a proven system we configure to
you, not a from-scratch custom build.** That distinction is what keeps it fast
*and* affordable. Say it out loud, warmly, on the call and in the agreement:

> *"LeadLoop is a proven system we configure to your business — that's exactly
> why it goes live in days and costs a fraction of custom software. We tune it to
> you beautifully; we don't rebuild it from scratch for each client."*

Set these boundaries kindly and up front, so nobody's surprised and setup doesn't
turn into an open-ended project.

### ✅ Included in setup ($497) + monthly ($197/mo)
- **One business sub-account** stood up from the LeadLoop Snapshot.
- **Connect up to 3 lead sources** (e.g. website form, a portal, Facebook/IG, missed-call).
- **1 calendar** connected for booking.
- **The vertical message pack tuned to your voice** — sender name, business name,
  tone, words to avoid — with **one round of copy revisions**.
- **A2P submission** and the go-live QA test.
- **30-minute training / handoff.**
- **Ongoing light management** + a **monthly booked-appointments report**.

### 🚫 Not included → quoted separately as a change order
- Building or redesigning **their website**.
- **Custom software or new features.**
- **Unlimited copy rewrites** beyond the one included revision round.
- **Paid-ad management** (running/optimizing Meta/Google ad spend).
- **Non-standard / bespoke integrations** (anything beyond the standard connectors).
- **Migrating unrelated data** (old CRMs, spreadsheets not tied to lead flow).

### ⏱ Turnaround SLA (both directions)
- **We go live ~2–5 business days after intake + A2P** (A2P is the long pole).
- **The customer responds within ~2 business days** when we need something from
  them (calendar connect, an asset, a sign-off). **If they don't, the clock
  pauses** — their timeline extends by whatever they owe us. Say this gently but
  keep it: it protects your throughput.

### 🔧 Change requests after go-live
- **Minor copy tweaks within reason are fine** — part of taking care of the customer.
- **Structural changes** (new workflows, extra lead sources beyond 3, new
  verticals, bespoke integrations) = **a change order at an hourly or flat quote**,
  agreed before work starts.

> **Put it in writing.** These boundaries belong in the **service agreement
> (Stage 2)** — included scope, the "not included → change order" list, the
> two-direction SLA, and the change-request principle — so they're **contractual,
> not just a verbal understanding.** That one page is what keeps "done-for-you"
> from becoming "do-everything-forever."

---

## Workflow G — Prospect Nurture (session → enroll)

**Purpose:** Path B prospects who attended (or booked) a strategy session but
**haven't enrolled yet**. Keeps the enroll link in front of them on a warm,
human cadence until they buy or opt out — so a "not right now" on the call isn't
a lost sale. Build this in GHL alongside the playbook's Workflows A–F; reference
it from the message-library structure (§3) as the client-acquisition counterpart
to the product's follow-up loop.

- **Trigger:** contact tagged **`session — not yet enrolled`** (session attended
  or booked, no enrollment on file).
- **Exit the instant they enroll or opt out** — set "enrolled" (payment received)
  and STOP as goal/removal conditions, exactly like Workflow C. Never nurture a
  paying customer.
- **Merge field:** every message carries the enroll link — `{{custom_values.enroll_link}}`
  (the reusable Stripe Payment Link).

**Cadence & paste-ready copy** (same warm/human tone as playbook §3; first
message of the sequence carries the opt-out line):

**a · Day 0 — recap + enroll link (SMS)**
```
Great talking today, {{contact.first_name}}! Quick recap: LeadLoop texts every
new lead back in under 60 seconds and follows up till they book — done for you.
Ready when you are, here's the enroll link: {{custom_values.enroll_link}}
(Reply STOP to opt out.)
```

**b · Day 2 — proof / value point + enroll link (SMS)**
```
{{contact.first_name}}, the reason speed matters: most leads go with whoever
replies first, and it's usually not the agent who's busy at a showing. LeadLoop
is that instant reply, every time. Want me to get you set up? {{custom_values.enroll_link}}
```

**c · Day 5 — the 14-day-guarantee reminder (SMS)**
```
No-risk reminder, {{contact.first_name}}: if LeadLoop doesn't book you at least
one appointment in the first 14 days, you don't pay the monthly. Setup's flat and
you're live in days. Here whenever you're ready: {{custom_values.enroll_link}}
```

**d · Day 10 — soft last-nudge (SMS)**
```
{{contact.first_name}}, I'll ease off so I'm not filling your phone 🙂 — but the
enroll link's right here whenever the timing's right, and I can have you live in a
few days: {{custom_values.enroll_link}}. Just reply if you have any questions.
```

**e · Monthly — low-frequency "still here" loop (SMS, recurring)**
```
Hi {{contact.first_name}}, still happy to get LeadLoop working for you whenever
you're ready — instant lead reply + follow-up, done for you. Enroll anytime:
{{custom_values.enroll_link}}. Or just reply and I'll answer any questions.
```

> **Email variant (optional):** mirror b/c/e as email touches on the off-days if
> you want more surface area — same value point, same enroll link, same exit
> conditions. Keep SMS as the primary channel; it's the one that converts.

---

## Quick failure stories (what to do when a hop breaks)

Same discipline as the rest of the suite — every integration gets a failure story.

- **A2P rejected** → read the rejection reason (usually vague/mismatched
  use-case or business-detail mismatch). Fix the use-case wording (table above)
  or correct the business name/EIN to match registration exactly, and resubmit.
  Tell the customer it's a formatting re-file, not a problem with them.
- **Auto-reply didn't fire** → walk the path: source → did the contact land in
  the pipeline? → is the workflow published/on? → did the trigger match? → is
  A2P approved (SMS won't send if not)? Most "it didn't work" is one hop
  misconfigured, and the lead is still safe in the pipeline.
- **Lead source went quiet** → the lead isn't lost if the source is down; check
  the webhook/integration and re-test with a synthetic lead. Confirm with a test
  submission before telling the customer it's fixed.
- **Customer replies aren't stopping the loop** → verify the "reply/booked/STOP"
  goal condition on Workflow C. This is the one that nags booked clients if it's
  wrong — fix it before it embarrasses the customer.
- **A paid customer is still getting nurture texts** → Workflow G's "enrolled"
  exit condition didn't fire. Confirm the Stripe payment event tags the contact
  as enrolled and removes them from Workflow G. Nurturing someone who already
  paid is the embarrassing failure here — check it whenever you touch Workflow G.
- **Path A customer paid but nothing happened** → confirm the Stripe payment
  event is wired to (a) create/tag the GHL contact and (b) auto-send the intake
  form. If intake never went out, the whole self-serve flow stalls silently —
  the money's in but you don't know to build.

---

_Next-step ideas live in the playbook §8. This runbook + the intake form are
items 4 on that list ("client onboarding form / 30-minute setup") — now done._
