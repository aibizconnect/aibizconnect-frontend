# LeadLoop — GHL Launch Playbook & Message Library

**Goal:** get a paying, working LeadLoop live for real-estate agents using GoHighLevel as the engine — in ~1–2 weeks, mostly with clicks, not code.
**Who does what:** everything in `paste-ready` blocks and step lists below is written for you. You supply the GHL + WordPress accounts and follow the click-path. Menu labels in GHL shift over time; I describe *what to look for*, which stays stable.

---

## 0. The honest reality check (read first)

| Thing | Truth |
|---|---|
| **Can this make money fast?** | Yes — you're configuring proven tools + selling done-for-you setup, not building software. First customer realistically in 1–2 weeks. |
| **What it costs you** | GHL **Starter $97/mo** (run one or a few clients manually) or **Agency/SaaS $497/mo** (resell unlimited sub-accounts at your price). Plus ~$10–20/mo Twilio usage per client. |
| **The SMS gate** | **A2P 10DLC registration is mandatory** before sending SMS in the US/Canada. It's a form in GHL; approval takes **~1–5 business days**. Start it Day 1. Email + the landing page work immediately while you wait. |
| **Your real moat** | Not GHL (anyone can resell it). It's the **real-estate niche packaging, the done-for-you setup, this message library, and the LeadLoop brand.** That's the part competitors don't have. |
| **What I can't do** | Log into your GHL/WordPress or send messages for you. I write and spec everything; you click and publish. |

---

## 1. The architecture — how the pieces connect

```
  LEAD SOURCES                    ENGINE (GHL, white-labeled "LeadLoop")           YOU
  ─────────────                   ─────────────────────────────────────           ───
  Website / WP form  ─┐
  Zillow / Realtor.com ├─►  GHL inbound  ─►  Pipeline + Workflows  ─►  SMS + Email ─► booked
  Facebook/IG lead    │     (webhook or        • instant auto-reply      to lead      appt on
  Missed phone call  ─┘      native integ.)     • missed-call text-back               your
                                                • 5–7 touch follow-up                 calendar
  WordPress landing page  ──►  GHL form/webhook  ──►  "New setup request" pipeline  ──►  you call them
```

Two flows:
1. **Client acquisition (you selling LeadLoop):** WP landing page → GHL → you get notified → you close the realtor.
2. **The product itself (what the realtor buys):** their leads → GHL → instant reply + follow-up → their calendar.

Same engine powers both. You'll literally use LeadLoop to sell LeadLoop — which is also your best demo.

---

## 2. GHL build — the click-path

> Do these in order. ⏱ = rough time. 🔴 = start-and-wait (do early).

### 2.1 Account & sub-account ⏱15 min
1. Sign up at gohighlevel.com — **Starter** to test with one client, **Agency Unlimited/SaaS** if you'll resell. (14-day trial exists; start there.)
2. In the agency view, **create a Sub-Account (Location)** named for your first realtor (or "LeadLoop Demo" to build the template).
3. Set the business name, timezone, and address on the sub-account (needed for phone + A2P).

### 2.2 Phone number + A2P 🔴 ⏱20 min + 1–5 day wait
1. In the sub-account: **Settings → Phone Numbers → Add Number** (this provisions a Twilio/LC number). Pick a local area-code number.
2. **Settings → Phone Numbers → Trust Center / A2P Registration** → complete **Brand** + **Campaign** registration. Use the realtor's real business info. Sample campaign use-case: *"Real estate lead follow-up and appointment booking. Customers opt in by submitting an inquiry form or contacting the business."*
3. Add **Email** sending: verify a sending domain or use the default LC email to start.
4. **While A2P is pending, keep building** — nothing else is blocked.

### 2.3 Pipeline ⏱10 min
Create a pipeline called **"Buyer/Seller Leads"** with stages:
`New Lead → Auto-Contacted → Replied → Appointment Booked → Showing/Meeting → Offer/Active → Won → Lost`

### 2.4 Calendar ⏱10 min
1. **Calendars → Create Calendar** → "Showings & Consults."
2. Connect the realtor's Google/Outlook calendar so real availability shows.
3. Set slot length (e.g., 30 min), buffer, and a booking-confirmation SMS/email (copy in §3.6). Grab the **calendar booking link** — you'll drop it into messages.

### 2.5 Workflows (the automation — this IS the product) ⏱60 min
Build these under **Automation → Workflows**. Each is a trigger + steps. Paste the message copy from §3.

**Workflow A — Speed-to-Lead Auto-Reply**
- **Trigger:** Form Submitted / Inbound Webhook / new Contact created from any lead source.
- Step 1: **Send SMS** → §3.1 (instant).
- Step 2: **Send Email** → §3.2.
- Step 3: **Wait 5 min** → If no reply → **Send SMS** §3.3 (the "still there?" bump).
- Step 4: Move opportunity to **Auto-Contacted**. Notify the agent (internal SMS/email).

**Workflow B — Missed-Call Text-Back**
- **Trigger:** Call Status = *no-answer / voicemail* to the business number.
- Step 1: **Send SMS** immediately → §3.4.
- (This one feature alone sells trades and realtors — it recovers the call you couldn't take.)

**Workflow C — The Follow-Up Loop (the "LeadLoop")**
- **Trigger:** Contact in **Auto-Contacted** with no reply.
- Day 1 → SMS §3.5a · Day 3 → SMS §3.5b · Day 7 → Email §3.5c · Day 14 → SMS §3.5d · Day 30 → SMS §3.5e.
- **Exit the loop** the instant they reply, book, or text STOP. (Use "reply received" as a workflow removal/goal condition — critical, or you'll nag booked clients.)

**Workflow D — Appointment Reminders**
- **Trigger:** Appointment booked on the calendar.
- Confirmation now (§3.6a) · reminder 24h before (§3.6b) · reminder 2h before (§3.6c).

**Workflow E — Database Reactivation** (the instant-cash campaign)
- **Trigger:** Manual / bulk-add old leads to a "Reactivation" tag.
- Step 1: SMS §3.7a · Day 2 if no reply: SMS §3.7b.
- Run this on a realtor's dead lead list in week one → books appointments from contacts they'd written off. Great for a paid "reactivation sprint" upsell.

**Optional Workflow F — Conversation AI**
- GHL's **Conversation AI bot** can auto-handle back-and-forth (answer "is it still available?", qualify budget, push to booking) instead of static steps. Turn it on once the static flows work — walk before you run.

### 2.6 Turn it into a reusable Snapshot ⏱5 min
Once the demo sub-account works: **Agency Settings → Snapshots → Create Snapshot** from it. Now every new realtor client is a **one-click load** of the entire LeadLoop system. This is your actual product asset — build it once, sell it many times.

---

## 3. The message library — paste-ready (real estate)

Tone: warm, human, texting-not-marketing. `{{merge fields}}` are GHL contact tokens. Every SMS auto-appends opt-out per compliance ("Reply STOP to opt out") — add it on the first message of each sequence.

### 3.1 Instant auto-reply (SMS, fires in seconds)
```
Hi {{contact.first_name}}, it's {{user.first_name}} with {{location.name}} 🙂
Thanks for reaching out about {{custom_values.property_or_inquiry}}!
I want to help you get this sorted fast. Are you looking to buy, sell, or just exploring?
(Reply STOP to opt out.)
```

### 3.2 Instant auto-reply (Email backup)
```
Subject: Got your message about {{custom_values.property_or_inquiry}} — quick question

Hi {{contact.first_name}},

Thanks for reaching out! I'd love to help. So I can point you the right way —
are you looking to buy, sell, or exploring your options?

If it's easier, grab a time that works for you here: {{custom_values.calendar_link}}

Talk soon,
{{user.first_name}} · {{location.name}}
{{user.phone}}
```

### 3.3 5-minute bump (SMS, only if no reply)
```
Just making sure this reached you, {{contact.first_name}}! Even a quick "buying" or
"selling" helps me get you the right info. Or book a 15-min chat here: {{custom_values.calendar_link}}
```

### 3.4 Missed-call text-back (SMS)
```
Hi {{contact.first_name}}, sorry I missed your call — I'm with a client right now.
This is {{user.first_name}} with {{location.name}}. What can I help you with? I'll get
right back to you, or grab a time here: {{custom_values.calendar_link}}
```

### 3.5 The follow-up loop
**a · Day 1 (SMS)**
```
Hey {{contact.first_name}}, still happy to help with your {{custom_values.property_or_inquiry}}
search. What's the best next step for you — a quick call or some listings by email?
```
**b · Day 3 (SMS)**
```
{{contact.first_name}}, the market's moving quick right now and I don't want you to miss
the right one. Want me to set up alerts for places that fit what you're after?
```
**c · Day 7 (Email)**
```
Subject: Still thinking it over, {{contact.first_name}}?

No rush at all — buying or selling a home is a big decision. Whenever you're ready,
I'm here to make it simple and stress-free. A few things I can do anytime:

 • Send you a no-obligation home value estimate
 • Set up instant alerts for new listings that match you
 • Answer any question over a quick 15-min call: {{custom_values.calendar_link}}

Just reply and tell me what's most useful.

{{user.first_name}} · {{location.name}}
```
**d · Day 14 (SMS)**
```
Hi {{contact.first_name}}! Circling back — has anything changed on your end with the
{{custom_values.property_or_inquiry}} plans? Happy to help whenever the timing's right.
```
**e · Day 30 (SMS)**
```
{{contact.first_name}}, I'll stop filling up your phone 🙂 — but I'm one text away whenever
you want to talk real estate. Save my number and reach out anytime. — {{user.first_name}}
```

### 3.6 Appointment messages
**a · Confirmation (SMS)**
```
You're booked, {{contact.first_name}}! 🎉 {{appointment.start_time}} with {{user.first_name}}.
I'll send a reminder. Need to reschedule? Just reply here.
```
**b · 24-hour reminder (SMS)**
```
Reminder: we're on for tomorrow at {{appointment.start_time}}, {{contact.first_name}}.
Looking forward to it! Reply if anything changes.
```
**c · 2-hour reminder (SMS)**
```
See you soon, {{contact.first_name}} — {{appointment.start_time}} today. Text me here if
you're running behind, no problem at all.
```

### 3.7 Database reactivation
**a · Touch 1 (SMS)**
```
Hi {{contact.first_name}}, it's {{user.first_name}} with {{location.name}}. We connected a
while back about real estate. Quick question — are you still thinking about making a move
in the next few months? (Reply STOP to opt out.)
```
**b · Touch 2, Day 2 (SMS)**
```
No worries if the timing's off, {{contact.first_name}}! If it helps, I can send a quick
value estimate on your place or a few listings — just say the word.
```

---

## 4. Wire the WordPress landing page → GHL

1. Publish `leadloop-landing.html`: WP → new Page → **Custom HTML block** → paste the file contents (or use a full-width/blank template).
2. Fill the `TODO` markers in the file: pricing, calendar link, contact.
3. Connect the form (pick one):
   - **Easiest:** replace the page's `<form>` with a **GHL Form/Survey embed** or a **GHL Calendar embed** (copy the embed code from GHL → paste into an HTML block). Leads/bookings land straight in GHL.
   - **Keep the custom form:** in GHL create an **Inbound Webhook** trigger, copy its URL, and set the landing page form's `action` to it (map `name`, `phone`). Add a workflow that texts you on each new setup request.
4. Test: submit the form → confirm a contact appears in GHL and you get the notification.

---

## 5. The offer, pricing & guarantee

**Package (done-for-you):**
- Setup fee **$497** (one-time) — you build their sub-account from the snapshot, connect leads + calendar, tune messages to their voice.
- **$197/mo** — ongoing (covers your GHL seat cost + margin + light management).
- **Reactivation sprint** upsell: **$300–500 one-time** to run Workflow E on their dead lead list. Fast, visible ROI — often your best foot in the door.

**Guarantee:** "If LeadLoop doesn't book you at least one appointment in the first 14 days, you don't pay the monthly." Cheap to offer (it works), and it demolishes the risk objection.

**Why the price holds:** one closed deal = thousands in commission. $197/mo is a rounding error against a single recovered lead. Sell the math, not the software.

---

## 6. Week-one go-to-market (get the first customer)

**Target:** solo agents and small teams drowning in leads — especially anyone buying Zillow/portal leads (they *know* speed matters and already spend money on leads).

**Where:** your own sphere first, then local real-estate Facebook groups, then cold DM/call agents with active listings.

**The demo that closes:** point them at the landing page, then say *"text this number right now"* and let them watch LeadLoop reply in seconds. Seeing it beats explaining it.

**DM / call script (paste-ready):**
```
Hi {name} — I build a lead-response system for agents called LeadLoop. It texts every new
lead back in under 60 seconds and follows up automatically until they book, even while
you're at a showing. Most agents lose deals just from replying slow. Want me to text you a
30-second demo so you can see it in action? No pitch, just show you.
```

**Reactivation opener (even easier yes):**
```
Quick one, {name}: I can text your old/dead leads and book you appointments from contacts
you've already given up on — done for you, one flat fee. If it books nothing, it's free.
Want me to run it on your list this week?
```

**Ad angle (if you run paid):** headline *"Realtors: stop losing leads to whoever replies first"* → the landing page → the calculator does the convincing.

---

## 7. Realistic timeline

| Day | What happens | Who |
|---|---|---|
| 0 | Landing page live on WP; GHL trial + sub-account created; **A2P submitted** | You (my guides) |
| 1–2 | Build pipeline, calendar, all workflows from §2–3; save Snapshot | You (my guides) |
| 2–5 | A2P approval lands; SMS goes live; full end-to-end test | You + carrier |
| 3–7 | Start outreach (§6); run a free reactivation demo on a friendly agent | You |
| 7–14 | First paying client loaded from the Snapshot in one click | You |

---

## 8. What I'll build next (just say which)

1. **A one-click GHL setup checklist** (printable, tick-box version of §2) so you don't miss a step.
2. **Ad creatives + 3 more DM scripts** for the outreach push.
3. **The AIBizConnect-native v2 spec** — when GHL revenue justifies owning the engine, I'll design the Supabase schema + auto-responder + cadence engine to migrate customers off GHL.
4. **A client onboarding form** (what to ask each new realtor so setup from the Snapshot takes 30 minutes).

That's the whole path, start to money. The assets above are real and paste-ready — that's me delivering the goods. You bring the accounts and the clicks; I've written everything that goes in them.
