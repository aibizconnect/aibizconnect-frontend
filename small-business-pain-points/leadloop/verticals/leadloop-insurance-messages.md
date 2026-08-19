# LeadLoop for Insurance Brokers — GHL Message Pack

> **⚠️ Review with a compliance officer / licensed principal before launch.**
> Insurance is a regulated line (P&C, life, health, commercial). This pack is
> written for speed-to-lead and follow-up automation only — it does not quote
> rates, discuss coverage terms, or give advice. Before turning any workflow
> live, have someone with compliance authority for your line(s) of business
> and jurisdiction(s) sign off on the exact copy, the licensing disclosure,
> and any state/provincial insurance-marketing rules that apply (e.g. NAIC
> model act analogues, provincial insurance-council advertising guidelines).
> Flag list is at the bottom of this file — check it item by item.

Adapted from `small-business-pain-points/leadloop/leadloop-ghl-launch-playbook.md` §3
(real-estate message library). Same LeadLoop engine — 60-second quote-back,
missed-call text-back, multi-touch follow-up — reframed for insurance quote
shoppers. Tone: warm, human, texting-not-marketing, never a rate quote.

`{{merge fields}}` are GHL contact tokens. Every SMS auto-appends opt-out per
compliance ("Reply STOP to opt out.") — include it on the first message of
each sequence, per A2P/TCPA (US) and CASL (Canada) requirements.

---

## 1. Instant quote-back (SMS, fires in seconds)
```
Hi {{contact.first_name}}, it's {{user.first_name}} with {{location.name}} 🙂
Thanks for reaching out about {{custom_values.policy_type}} insurance!
I'd love to go over your options — no obligation. Are you free for a quick
call today or tomorrow? (Reply STOP to opt out.)
```

## 2. Instant quote-back (Email backup)
```
Subject: Got your {{custom_values.policy_type}} insurance request — quick question

Hi {{contact.first_name}},

Thanks for reaching out! I'd love to help you compare your options for
{{custom_values.policy_type}} coverage — no obligation, no pressure.

So I can point you the right way — what's most important to you right now:
price, coverage, or just understanding what you actually need?

If it's easier, grab a time that works for you here: {{custom_values.calendar_link}}

Talk soon,
{{user.first_name}} · {{location.name}}
{{user.phone}}
Licensed insurance broker, {{custom_values.license_jurisdiction}}
```
*Compliance note: the licensing line (`{{custom_values.license_jurisdiction}}`) should reflect your actual license number/province-state per local disclosure rules — confirm the exact required wording with your compliance officer.*

## 3. 5-minute bump (SMS, only if no reply)
```
Just making sure this reached you, {{contact.first_name}}! Even a quick reply
telling me what you're insuring helps me get you the right options. Or book
a 15-min call here: {{custom_values.calendar_link}}
```

## 4. Missed-call text-back (SMS)
```
Hi {{contact.first_name}}, sorry I missed your call — I'm on the line with
another client. This is {{user.first_name}} with {{location.name}}. What can
I help you with? I'll call you back, or grab a time here:
{{custom_values.calendar_link}}
```

## 5. The follow-up loop

**a · Day 1 (SMS)**
```
Hey {{contact.first_name}}, still happy to help you compare options for your
{{custom_values.policy_type}} coverage. What's the best next step — a quick
call, or should I send a few options by email?
```

**b · Day 3 (SMS)**
```
{{contact.first_name}}, no rush at all — just don't want your current renewal
date to sneak up on you. Want me to hold a time to walk through your options?
```

**c · Day 7 (Email)**
```
Subject: Still thinking it over, {{contact.first_name}}?

No rush — choosing coverage is worth getting right. Whenever you're ready,
I'm here to walk you through your options and answer questions. A few
things I can do anytime:

 • Walk you through coverage options for {{custom_values.policy_type}}
 • Review what you currently have and flag any obvious gaps
 • Answer any question over a quick 15-min call: {{custom_values.calendar_link}}

Just reply and tell me what's most useful.

{{user.first_name}} · {{location.name}}
Licensed insurance broker, {{custom_values.license_jurisdiction}}
```

**d · Day 14 (SMS)**
```
Hi {{contact.first_name}}! Circling back — has anything changed with your
{{custom_values.policy_type}} coverage plans? Happy to help whenever the
timing's right.
```

**e · Day 30 (SMS)**
```
{{contact.first_name}}, I'll stop filling up your phone 🙂 — but I'm one text
away whenever you want to talk coverage or compare options. Save my number
and reach out anytime. — {{user.first_name}}
```

## 6. Appointment / quote-ready messages

**a · Confirmation (SMS)**
```
You're booked, {{contact.first_name}}! 🎉 {{appointment.start_time}} with
{{user.first_name}} to go over your {{custom_values.policy_type}} options.
I'll send a reminder. Need to reschedule? Just reply here.
```

**b · 24-hour reminder (SMS)**
```
Reminder: we're on for tomorrow at {{appointment.start_time}}, {{contact.first_name}}
— I'll have a few options ready to walk through together. Reply if anything changes.
```

**c · 2-hour reminder (SMS)**
```
See you soon, {{contact.first_name}} — {{appointment.start_time}} today. Text me
here if you're running behind, no problem at all.
```

**d · Quote-ready notification (SMS)** — *use only once options are actually prepared by a licensed person; never auto-send numbers*
```
Hi {{contact.first_name}}, I've put together a few coverage options for you
to look at together. Still good for {{appointment.start_time}}? If you want,
I can also send a summary right after we talk.
```

## 7. Database reactivation

**a · Touch 1 (SMS)**
```
Hi {{contact.first_name}}, it's {{user.first_name}} with {{location.name}}. We
connected a while back about your insurance. Quick question — is your current
{{custom_values.policy_type}} coverage still working for you, or would it be
worth a quick review? (Reply STOP to opt out.)
```

**b · Touch 2, Day 2 (SMS)**
```
No worries if the timing's off, {{contact.first_name}}! If it helps, I can do
a quick, no-obligation review of your current coverage — just say the word.
```

**c · Touch 3, Day 5 (SMS) — renewal-anchored**
```
{{contact.first_name}}, a lot can change year to year — new vehicle, moved,
added a driver, life changes. If your renewal is coming up, it's worth a
5-minute check-in so nothing's missed. Want me to take a look?
```

---

## Compliance flags — check every item before launch

A compliance officer / licensed principal should confirm each of these
against the applicable jurisdiction(s) and line(s) of business before any
workflow goes live:

1. **No rate/savings promises.** Nothing in this pack says "cheapest," "best
   rate," "guaranteed savings," or names a dollar figure a lead will save.
   The landing page ROI calculator (`leadloop-insurance.html`) is explicitly
   labeled as an *illustrative broker-revenue estimate*, not a consumer
   savings promise — confirm that framing holds up under your regulator's
   advertising rules.
2. **No coverage advice or quoting by automation.** Every message in this
   pack schedules a conversation or asks a qualifying question — none of
   them state a premium, bind coverage, or describe specific policy terms.
   Confirm this boundary is enforced in the actual GHL workflow (no
   AI-generated quote numbers ever auto-sent).
3. **Licensing disclosure.** `{{custom_values.license_jurisdiction}}` is a
   placeholder — confirm the required license-number/jurisdiction disclosure
   language for each state/province you operate in, and whether it must
   appear on every message or just first contact / email signature.
4. **"Compare your options" language, not steering language.** Messages
   invite a conversation about options; none imply a specific insurer or
   product is superior. Confirm this holds if/when message copy is
   personalized per carrier relationships.
5. **A2P/TCPA (US) and CASL (Canada) consent.** STOP/HELP opt-out language
   is included on first-touch messages; confirm double opt-in / consent
   capture on the landing page form matches your jurisdiction's requirements
   (the landing page already carries SMS consent + honeypot language — verify
   wording against current CASL/TCPA guidance before launch, since rules
   change).
6. **Data handling / PII.** Confirm quote-request data (vehicle info, DOB,
   health details if life/health lines) captured via the landing page or
   intake flows into GHL in a way that satisfies your E&O carrier and any
   applicable privacy law (PIPEDA in Canada, state privacy acts in the US).
7. **Multi-line applicability.** This pack is written broker-neutral (P&C,
   life, health, commercial). If deploying for life or health specifically,
   confirm no message implies medical/health advice, and that any
   health-related intake fields meet HIPAA (US) or PHIPA-equivalent
   (Canada) handling requirements.
8. **E&O / record-keeping.** Confirm automated follow-up messages are logged
   in a way that satisfies your errors & omissions carrier's documentation
   expectations (GHL conversation history should suffice, but have your E&O
   carrier confirm).

---

## Reference: landing page compliance framing already built in

`leadloop-insurance.html` (same folder) already avoids rate/savings
guarantees — the ROI calculator is framed as *"Estimated recoverable
commission / year"* for the broker's own book of business, with a disclaimer
("Illustrative estimate only, not a guarantee of results, savings, or
rates..."), and an FAQ entry explicitly states LeadLoop never quotes
premiums or gives insurance advice. Keep this framing intact in any future
edits — it is the load-bearing compliance guardrail for the whole funnel.
