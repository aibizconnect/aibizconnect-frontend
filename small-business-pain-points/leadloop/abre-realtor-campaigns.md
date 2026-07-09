# ABRE Team — Al's Own LeadLoop Campaigns (3 Segments)

**Purpose:** Owner's own real-estate LeadLoop campaigns — ABRE Team sub-account; 3 segments mapped to the 3 sites.

Al runs three distinct real-estate practices under one GHL sub-account ("ABRE Team"). Each site attracts a different buyer/seller and needs a voice that matches — the affordable-housing lead who's nervous about qualifying should never get the same text as the industrial-investor lead who wants a cap rate. This doc gives all three full message packs, paste-ready, mirroring the structure of `leadloop-ghl-launch-playbook.md` §3 — but the voice is deliberately **not** interchangeable across segments.

This is different from the sellable insurance/legal vertical packs in this same folder (`verticals/`) — those are LeadLoop products sold to *other* professionals. This file is Al's own book of business.

---

## 1. Site → segment → tag map

| Site | Segment | Audience | GHL tag |
|---|---|---|---|
| **ali.realtor** | Entry-level / affordable housing | First-time & budget-conscious buyers, renters becoming buyers | `seg-affordable` |
| **the4sale.com** | Commercial, industrial, investment & business | Investors, business owners, commercial buyers/sellers | `seg-commercial` |
| **gtaluxuryhomes.ca** | Luxury housing | High-net-worth buyers/sellers | `seg-luxury` |

### How segmentation works in GHL
Each site's lead form / webhook fires into the **same ABRE Team sub-account**, but tags the contact by source site the moment it's captured (`seg-affordable`, `seg-commercial`, or `seg-luxury` — set as a form hidden field or workflow action on intake). Each workflow below (auto-reply, follow-up loop, reactivation) has **three branches keyed off that tag** — a lead tagged `seg-luxury` only ever sees the luxury copy, a lead tagged `seg-affordable` only ever sees the affordable copy. One engine, three voices, zero cross-contamination. If a contact's segment is ever unclear at capture (e.g. a general contact-page submission), route it into a short qualifying question before applying a segment tag rather than guessing.

---

## 2. Consent + A2P note — read before activating any of this

**Do not turn on any workflow below until:**
1. **A2P 10DLC Brand + Campaign is approved** for the ABRE Team sub-account (not just submitted — see `leadloop-ghl-launch-playbook.md` §2.2). SMS will silently fail to send otherwise.
2. **Every contact loaded into these workflows has actually consented to be texted** — i.e., they came in through one of the three sites' inquiry forms, a call, or another channel where they knowingly gave contact info to Al expecting a follow-up. This is Al's own book, not a purchased or scraped list — keep it that way. Old contacts pulled in for the reactivation sequences need the same bar: if there's no record of how/when they opted in, don't load them until that's confirmed.
3. The **STOP/opt-out mechanics** are live on the sub-account (built into GHL, but verify before first send).

This mirrors the operating posture in `leadloop-fulfillment-runbook.md` → **"Compliance & liability posture"**: consent is what keeps A2P/TCPA risk contained, and it's tracked at the sub-account level regardless of whose book it is — Al's own contacts get the same discipline he'd require of a paying customer. No guaranteed-outcome language appears anywhere below (no promised sale price, no promised savings, no promised approval) and no message describes an "ideal buyer" — only the property or the inquiry, per fair-housing-safe practice.

---

## 3. Segment A — ali.realtor — Entry-level / affordable housing
**Tag:** `seg-affordable` · **Voice:** warm, encouraging, educational, reassuring. Demystify the process. Reference affordability programs, down-payment help, "what you can actually afford." Low pressure, lots of hand-holding.

### 3.1 Instant auto-reply (SMS, fires in seconds)
```
Hi {{contact.first_name}}, it's {{user.first_name}} with {{location.name}} 🙂
Thanks for reaching out about {{custom_values.property_or_inquiry}}! Buying your
first place can feel like a lot — I'm here to make it simple, one step at a time.
What's most on your mind: what you can afford, or how to get started? Reply STOP to opt out.
```

### 3.2 Instant auto-reply (Email backup)
```
Subject: Got your message about {{custom_values.property_or_inquiry}} — happy to help

Hi {{contact.first_name}},

Thanks for reaching out! Getting started can feel overwhelming, so let's keep it
simple. There's no wrong question here — whether it's "what can I actually
afford," "how does the down payment work," or "where do I even begin," I've
walked plenty of first-time buyers through exactly this.

If it's easier to just talk it through, grab a time that works for you here:
{{custom_values.calendar_link}}

No pressure, no rush — just here to help.

{{user.first_name}} · {{location.name}}
{{user.phone}}
```

### 3.3 5-minute bump (SMS, only if no reply)
```
Just checking this reached you, {{contact.first_name}}! Even a quick note on
what you're hoping for helps me point you in the right direction. Or grab a
no-pressure 15 minutes here: {{custom_values.calendar_link}}
```

### 3.4 Missed-call text-back (SMS)
```
Hi {{contact.first_name}}, sorry I missed your call — with a client right now.
This is {{user.first_name}} with {{location.name}}. Whatever's on your mind about
{{custom_values.property_or_inquiry}}, I've got you — I'll call back shortly, or
grab a time here: {{custom_values.calendar_link}} Reply STOP to opt out.
```

### 3.5 The follow-up loop

**a · Day 1 (SMS)**
```
Hey {{contact.first_name}}, still happy to help you figure out
{{custom_values.property_or_inquiry}} — no pressure at all. Want me to put
together a quick, honest read on what's realistic for your budget?
```

**b · Day 3 (SMS)**
```
{{contact.first_name}}, a lot of first-time buyers don't realize how many
down-payment and first-time-buyer programs exist — some cover more than
people expect. Want me to send a quick rundown of what you might qualify for?
```

**c · Day 7 (Email)**
```
Subject: No rush, {{contact.first_name}} — here when you're ready

Buying your first place is a big step, and it's completely normal to take
your time with it. Whenever you're ready, here's a few things I can help
with, zero pressure:

 • A plain-English walkthrough of what you can realistically afford
 • First-time-buyer and down-payment assistance programs you may qualify for
 • Answers to any question, big or small, over a quick 15-min call:
   {{custom_values.calendar_link}}

Just reply and let me know what's most useful — even "not sure yet" is a
totally fine answer.

{{user.first_name}} · {{location.name}}
```

**d · Day 14 (SMS)**
```
Hi {{contact.first_name}}! Just checking in — has anything shifted with your
plans around {{custom_values.property_or_inquiry}}? Happy to help whenever
feels right, even if that's a while from now.
```

**e · Day 30 (SMS)**
```
{{contact.first_name}}, I'll stop filling up your phone 🙂 — but whenever
you're ready to talk about getting into your first place, I'm one text away.
Save my number. — {{user.first_name}}
```

### 3.6 Appointment messages

**a · Confirmation (SMS)**
```
You're booked, {{contact.first_name}}! 🎉 {{appointment.start_time}} with
{{user.first_name}}. We'll go at your pace — bring any question, no matter how
basic it feels. Need to reschedule? Just reply here.
```

**b · 24-hour reminder (SMS)**
```
Reminder: we're on for tomorrow at {{appointment.start_time}}, {{contact.first_name}}.
Looking forward to walking through this together. Reply if anything changes.
```

**c · 2-hour reminder (SMS)**
```
See you soon, {{contact.first_name}} — {{appointment.start_time}} today. Text me
here if you're running behind, no problem at all.
```

### 3.7 Database reactivation

**a · Touch 1 (SMS)**
```
Hi {{contact.first_name}}, it's {{user.first_name}} with {{location.name}}. We
talked a while back about getting you into your first place. Quick, no-pressure
question — is that still something you're working toward? Reply STOP to opt out.
```

**b · Touch 2, Day 2 (SMS)**
```
No worries either way, {{contact.first_name}}! If it helps, I can send a quick,
honest look at what's realistic for your budget right now — just say the word.
```

---

## 4. Segment B — the4sale.com — Commercial, industrial, investment & business
**Tag:** `seg-commercial` · **Voice:** professional, efficient, numbers-driven — ROI, cap rate, cash flow, NOI, off-market opportunities, portfolio thinking (Canadian context: capital gains, cash flow). Less emotional, more "let's talk deals/returns." Respect their time — shorter messages, minimal emoji.

### 4.1 Instant auto-reply (SMS, fires in seconds)
```
Hi {{contact.first_name}}, {{user.first_name}} with {{location.name}}. Thanks for
the inquiry on {{custom_values.property_or_inquiry}}. I can pull numbers —
cap rate, NOI, cash flow — same day. Buying, selling, or just evaluating the
deal? Reply STOP to opt out.
```

### 4.2 Instant auto-reply (Email backup)
```
Subject: {{custom_values.property_or_inquiry}} — numbers ready when you are

Hi {{contact.first_name}},

Thanks for reaching out on {{custom_values.property_or_inquiry}}. To point you
to the right numbers fast: are you evaluating this as an acquisition, a
disposition, or benchmarking against your current portfolio?

I can have a preliminary read — NOI, cap rate, cash-flow position — ready
before we even talk. If it's easier to jump straight to a call, grab a slot
here: {{custom_values.calendar_link}}

{{user.first_name}} · {{location.name}}
{{user.phone}}
```

### 4.3 5-minute bump (SMS, only if no reply)
```
Following up on {{custom_values.property_or_inquiry}}, {{contact.first_name}} —
happy to send the numbers first if that's faster for you. Or book 15 minutes
here: {{custom_values.calendar_link}}
```

### 4.4 Missed-call text-back (SMS)
```
Hi {{contact.first_name}}, missed your call — on with another deal right now.
{{user.first_name}} with {{location.name}}. On {{custom_values.property_or_inquiry}}:
I'll call back shortly, or grab a slot directly here:
{{custom_values.calendar_link}} Reply STOP to opt out.
```

### 4.5 The follow-up loop

**a · Day 1 (SMS)**
```
{{contact.first_name}}, following up on {{custom_values.property_or_inquiry}}.
Want me to run the cash-flow and cap-rate numbers so you've got something
concrete to evaluate against?
```

**b · Day 3 (SMS)**
```
{{contact.first_name}}, a couple of off-market opportunities have come up that
fit this profile. Worth a look, or should I keep it strictly to
{{custom_values.property_or_inquiry}} for now?
```

**c · Day 7 (Email)**
```
Subject: {{custom_values.property_or_inquiry}} — still on the table

Hi {{contact.first_name}},

No pressure on timeline — good deals are worth waiting for the right entry
point. A few things I can put together whenever useful:

 • A cash-flow and cap-rate breakdown on {{custom_values.property_or_inquiry}}
 • A short list of comparable off-market opportunities
 • A capital-gains-aware read on timing, if this is a disposition

Reply with what's most useful, or grab time directly: {{custom_values.calendar_link}}

{{user.first_name}} · {{location.name}}
```

**d · Day 14 (SMS)**
```
{{contact.first_name}}, checking in on {{custom_values.property_or_inquiry}} —
has the timeline or the target profile shifted? Happy to re-run numbers if so.
```

**e · Day 30 (SMS)**
```
{{contact.first_name}}, last check-in from me on this one — but I track
off-market commercial/industrial deal flow continuously. Save my number;
reach out whenever the timing's right. — {{user.first_name}}
```

### 4.6 Appointment messages

**a · Confirmation (SMS)**
```
Confirmed, {{contact.first_name}} — {{appointment.start_time}} with
{{user.first_name}} on {{custom_values.property_or_inquiry}}. I'll bring the
numbers. Reschedule needed? Just reply.
```

**b · 24-hour reminder (SMS)**
```
Reminder: {{appointment.start_time}} tomorrow, {{contact.first_name}}, on
{{custom_values.property_or_inquiry}}. Numbers will be ready. Reply if
anything changes.
```

**c · 2-hour reminder (SMS)**
```
{{contact.first_name}} — {{appointment.start_time}} today on
{{custom_values.property_or_inquiry}}. Text here if you're running behind.
```

### 4.7 Database reactivation

**a · Touch 1 (SMS)**
```
Hi {{contact.first_name}}, {{user.first_name}} with {{location.name}}. We looked
at commercial/investment opportunities together previously. Still active in
the market, or has the strategy shifted? Reply STOP to opt out.
```

**b · Touch 2, Day 2 (SMS)**
```
No problem if the timing's off, {{contact.first_name}}. If useful, I can send
current cap-rate benchmarks for the asset class you were looking at — just
say the word.
```

---

## 5. Segment C — gtaluxuryhomes.ca — Luxury housing
**Tag:** `seg-luxury` · **Voice:** discreet, white-glove, concierge, exclusive. Privacy and prestige; no hard sell. "Private showing," "off-market listings," "at your convenience." Understated confidence — no emoji, no exclamation points, unhurried pacing.

### 5.1 Instant auto-reply (SMS, fires in seconds)
```
Hello {{contact.first_name}}, this is {{user.first_name}} with {{location.name}}.
Thank you for your interest in {{custom_values.property_or_inquiry}}. I would be
glad to arrange a private showing at your convenience, or share further
details discreetly. Reply STOP to opt out.
```

### 5.2 Instant auto-reply (Email backup)
```
Subject: {{custom_values.property_or_inquiry}} — at your convenience

Dear {{contact.first_name}},

Thank you for your interest in {{custom_values.property_or_inquiry}}. I would
be pleased to arrange a private viewing, share additional details, or discuss
a selection of off-market properties that may suit your criteria — entirely
at your discretion and on your schedule.

Should you prefer to speak directly, a time may be reserved here:
{{custom_values.calendar_link}}

With regards,
{{user.first_name}} · {{location.name}}
{{user.phone}}
```

### 5.3 5-minute bump (SMS, only if no reply)
```
Following up briefly, {{contact.first_name}}, regarding
{{custom_values.property_or_inquiry}}. Happy to proceed whenever convenient
for you: {{custom_values.calendar_link}}
```

### 5.4 Missed-call text-back (SMS)
```
Hello {{contact.first_name}}, my apologies for missing your call — I was with
another client. This is {{user.first_name}} with {{location.name}}, regarding
{{custom_values.property_or_inquiry}}. I will return your call shortly, or you
may reserve a time directly: {{custom_values.calendar_link}} Reply STOP to opt out.
```

### 5.5 The follow-up loop

**a · Day 1 (SMS)**
```
{{contact.first_name}}, following up regarding
{{custom_values.property_or_inquiry}}. I would be glad to arrange a private
showing whenever it suits you.
```

**b · Day 3 (SMS)**
```
{{contact.first_name}}, a small number of off-market properties matching your
criteria have become available. I would be glad to share details privately,
if of interest.
```

**c · Day 7 (Email)**
```
Subject: At your convenience, {{contact.first_name}}

Dear {{contact.first_name}},

There is no need to hurry a decision of this kind. Whenever the time is
right, I remain glad to assist with:

 • A private showing of {{custom_values.property_or_inquiry}}, arranged
   around your schedule
 • A discreet introduction to off-market properties matching your criteria
 • A conversation, at your convenience: {{custom_values.calendar_link}}

Please let me know how I may be of service.

{{user.first_name}} · {{location.name}}
```

**d · Day 14 (SMS)**
```
{{contact.first_name}}, checking in regarding
{{custom_values.property_or_inquiry}}. I remain at your disposal whenever
timing allows.
```

**e · Day 30 (SMS)**
```
{{contact.first_name}}, I will step back for now, though I remain available
whenever it is convenient to continue the conversation. Please keep my
number to hand. — {{user.first_name}}
```

### 5.6 Appointment messages

**a · Confirmation (SMS)**
```
Confirmed, {{contact.first_name}} — {{appointment.start_time}} with
{{user.first_name}}, privately arranged. Should your schedule change, please
reply here directly.
```

**b · 24-hour reminder (SMS)**
```
A reminder of our appointment tomorrow at {{appointment.start_time}},
{{contact.first_name}}. I look forward to it. Please reply should anything change.
```

**c · 2-hour reminder (SMS)**
```
{{contact.first_name}}, {{appointment.start_time}} today. I look forward to
seeing you. Please text here should you be delayed.
```

### 5.7 Database reactivation

**a · Touch 1 (SMS)**
```
Hello {{contact.first_name}}, this is {{user.first_name}} with {{location.name}}.
We were in touch previously regarding luxury properties in the area. I
wondered whether this remains of interest to you. Reply STOP to opt out.
```

**b · Touch 2, Day 2 (SMS)**
```
No concern at all if the timing has changed, {{contact.first_name}}. Should
you wish, I would be glad to share a discreet, current selection of
off-market properties — entirely at your convenience.
```

---

## 6. Activation checklist (per segment)

Before turning any workflow live for a segment:
- [ ] `{{custom_values.property_or_inquiry}}`, `{{custom_values.calendar_link}}` populated correctly for that site's lead source in the ABRE Team sub-account.
- [ ] Lead capture on the site tags new contacts with the correct segment tag (`seg-affordable` / `seg-commercial` / `seg-luxury`) at intake.
- [ ] A2P Brand + Campaign **approved** (not submitted) for ABRE Team.
- [ ] Reactivation lists for that segment reviewed for actual prior consent before loading.
- [ ] "Reply received" set as the exit condition on the follow-up loop workflow so replied/booked contacts stop receiving further touches.
