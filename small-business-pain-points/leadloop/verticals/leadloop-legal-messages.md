# LeadLoop for Law Firms — Message Library (GHL)

> ⚠️ **REVIEW WITH THE FIRM'S BAR-COMPLIANCE COUNSEL BEFORE LAUNCH.** Attorney
> advertising and client-solicitation rules are set state-by-state (and
> sometimes practice-area-by-practice-area) — they cover required disclaimers,
> "Attorney Advertising" labeling, filing/review requirements, restrictions on
> in-person/live/real-time solicitation (some states extend this to SMS),
> and TCPA/consent rules for text messaging. **Nothing in this file is legal
> advice, and none of it should go live for a real firm until that firm's own
> bar-compliance counsel has reviewed it against the rules of every
> jurisdiction where the firm solicits clients.** See the "COMPLIANCE FLAGS"
> section at the bottom for the specific lines to check line-by-line.

Mirrors the structure of `../leadloop-ghl-launch-playbook.md` §3 (the real-estate
message library), adapted for law-firm intake. Same GHL workflow shapes (A–E),
legal-appropriate merge fields, warm-but-professional tone — never casual,
never promising an outcome.

**Tone rule for this vertical:** warm and responsive, but restrained. Real
estate copy can say "so excited to help you find your dream home." Legal copy
should sound like a competent intake coordinator: calm, clear, next-step
focused. No enthusiasm about someone's injury, arrest, or divorce. No language
that could be read as legal advice, a case evaluation, or a promise of
result — every message routes the person to a *conversation*, not an answer.

Every SMS in this library must retain the opt-out line ("Reply STOP to opt
out") on the first message of each sequence per TCPA/A2P requirements. `{{merge
fields}}` are GHL contact tokens.

---

## 1. Instant intake reply (SMS, fires in seconds)

```
Hi {{contact.first_name}}, thanks for reaching out to {{location.name}} about
your {{custom_values.matter_type}} matter. We take intake seriously and want
to get you the right information quickly. Can you tell me briefly what
happened, or would you prefer to book a free consult call? Book here:
{{custom_values.calendar_link}}
(Reply STOP to opt out.)
```

**Compliance notes on this message:**
- `{{custom_values.matter_type}}` should be a neutral factual label (e.g. "car
  accident," "family law," "immigration") — never a characterization implying
  merit ("your strong case," "your claim").
- No promise of a callback from "an attorney" unless a licensed attorney (not
  staff/bot) will in fact be the one responding — check firm staffing before
  using the word "attorney" in any auto-reply.

## 2. Instant intake reply (Email backup)

```
Subject: We received your message — {{location.name}}

Hi {{contact.first_name}},

Thank you for contacting {{location.name}} about your
{{custom_values.matter_type}} matter. We'd like to learn more about your
situation and go over your options — there's no cost or obligation for an
initial conversation.

If it's easier, grab a time that works for you here:
{{custom_values.calendar_link}}

We look forward to speaking with you.

{{location.name}} Intake Team
{{user.phone}}

---
Attorney Advertising. Prior results do not guarantee a similar outcome. This
message does not create an attorney-client relationship and is not legal
advice.
```

## 3. 5-minute bump (SMS, only if no reply)

```
Just confirming this reached you, {{contact.first_name}}. If now isn't a good
time, no problem — you can book a free 15-min call whenever works:
{{custom_values.calendar_link}}
```

## 4. Missed-call text-back (SMS)

```
Hi {{contact.first_name}}, sorry we missed your call — our team is currently
with a client or in court. This is {{location.name}} intake. If this is
urgent, please call 911 or go to the nearest hospital. Otherwise, let us know
what you need help with, or grab a time here: {{custom_values.calendar_link}}
```

**Compliance note:** the urgent-safety line ("if this is urgent, call 911...")
is a recommended addition for personal-injury/criminal intake — verify firm
wants this exact language, and swap in state-specific crisis resources for
family law/DV-adjacent matters if applicable (e.g. domestic violence hotline).

## 5. The follow-up loop

**a · Day 1 (SMS)**
```
Hi {{contact.first_name}}, following up on your {{custom_values.matter_type}}
inquiry with {{location.name}}. We're still glad to go over your situation
whenever you're ready — would a quick call work, or would you rather we send
some information by email first?
```

**b · Day 3 (SMS)**
```
{{contact.first_name}}, some legal matters are time-sensitive because of
filing deadlines. We don't want you to miss a window that matters. Want to
grab 15 minutes this week? {{custom_values.calendar_link}}
```

**Compliance note:** "time-sensitive because of filing deadlines" is factual
and appropriate for most practice areas (statutes of limitation are real), but
must not be paired with case-specific deadline claims Q's before an attorney
has reviewed the facts. Keep it general, not a specific countdown.

**c · Day 7 (Email)**
```
Subject: Still have questions, {{contact.first_name}}?

No rush — decisions about legal matters are personal and often difficult.
Whenever you're ready, we're here to make the process as clear as possible.
A few things we can do anytime:

 • Walk you through what the process typically looks like
 • Answer general questions about your situation
 • Set up a free 15-minute call: {{custom_values.calendar_link}}

Just reply and let us know what's most useful.

{{location.name}} Intake Team

---
Attorney Advertising. Prior results do not guarantee a similar outcome.
```

**d · Day 14 (SMS)**
```
Hi {{contact.first_name}}, checking back in — has anything changed with your
{{custom_values.matter_type}} situation? We're glad to help whenever the
timing works for you.
```

**e · Day 30 (SMS)**
```
{{contact.first_name}}, we won't keep filling up your phone — but we're one
text away if you'd like to talk. Save this number and reach out anytime.
— {{location.name}}
```

## 6. Consultation reminders

**a · Confirmation (SMS)**
```
You're confirmed, {{contact.first_name}} — {{appointment.start_time}} with
{{location.name}}. We'll send a reminder before then. Need to reschedule?
Just reply here.
```

**b · 24-hour reminder (SMS)**
```
Reminder: your consultation is tomorrow at {{appointment.start_time}},
{{contact.first_name}}. If you have documents related to your matter (e.g.
police report, correspondence, court notices), it helps to have them handy.
Reply if anything changes.
```

**c · 2-hour reminder (SMS)**
```
See you soon, {{contact.first_name}} — {{appointment.start_time}} today. Text
us here if you're running behind, no problem at all.
```

## 7. Database reactivation

**a · Touch 1 (SMS)**
```
Hi {{contact.first_name}}, this is {{location.name}}. We connected a while
back about a {{custom_values.matter_type}} matter. Just checking in — is this
still something you'd like to discuss? (Reply STOP to opt out.)
```

**b · Touch 2, Day 2 (SMS)**
```
No worries if the timing wasn't right before, {{contact.first_name}}. If it's
helpful, we're glad to answer general questions or set up a free call — just
say the word.
```

**Compliance note on reactivation:** re-contacting old leads/former
prospective clients by SMS carries extra scrutiny — confirm (1) the contact
gave consent to be texted when they first inquired and that consent hasn't
expired/been revoked, and (2) the firm's state doesn't restrict "solicitation"
of prior inquiries after a defined period. This is exactly the kind of
campaign that should be run past bar counsel before the first send, not after.

---

## 8. GHL workflow shapes (mirrors real-estate playbook §2.5)

Same five workflows, same triggers — only the copy source changes to this file:

- **Workflow A — Speed-to-Intake Auto-Reply:** trigger = new contact/form
  submit → SMS §1 → Email §2 → wait 5 min → SMS §3 if no reply → move to
  Auto-Contacted, notify staff.
- **Workflow B — Missed-Call Text-Back:** trigger = no-answer call to firm
  line → SMS §4 immediately.
- **Workflow C — The Follow-Up Loop:** trigger = Auto-Contacted, no reply →
  Day 1 SMS §5a · Day 3 SMS §5b · Day 7 Email §5c · Day 14 SMS §5d · Day 30
  SMS §5e. Exit instantly on reply, booking, or STOP.
- **Workflow D — Consultation Reminders:** trigger = appointment booked →
  confirmation §6a · 24h reminder §6b · 2h reminder §6c.
- **Workflow E — Database Reactivation:** trigger = manual tag add to old
  contacts → SMS §7a → Day 2 if no reply: SMS §7b. **Do not run this workflow
  without confirming consent/compliance per the note above.**

---

## COMPLIANCE FLAGS — REVIEW BEFORE LAUNCH (give this list to bar counsel)

1. **"Attorney Advertising" labeling** — present on the landing page banner
   and footer, and in the email signature block (§2, §5c). Confirm placement,
   font size, and required wording match the specific state(s) the firm
   practices in (some states mandate exact phrasing or placement rules).
2. **"Prior results do not guarantee a similar outcome"** — present in the
   landing page banner/footer and in email templates §2 and §5c. Confirm it
   also needs to appear on every SMS, or whether SMS character limits and
   context exempt it (varies by state — some require it only where results
   are referenced, which this copy avoids by design).
3. **No outcome/result language anywhere** — audited: no message promises,
   implies, or estimates a case outcome, settlement amount, or win likelihood.
   Re-check any custom `{{custom_values}}` a specific firm adds later (e.g. if
   staff insert their own free-text into a template).
4. **No specialization/certification claims** — none of these templates use
   words like "specialist," "expert," or "best" — many states restrict these
   terms to attorneys formally certified by a state bar board. Do not let a
   firm add them without confirming certification status.
5. **SMS solicitation rules vary by state bar** — a few states treat
   text-message outreach to prospective clients as subject to the same rules
   as live/real-time solicitation (which is more restricted than static
   advertising in most states). Confirm state-by-state before enabling
   text-based intake, especially for the reactivation workflow (§7) and any
   outbound-initiated (not inbound-triggered) texting.
6. **TCPA / A2P consent** — every SMS sequence must be triggered by the
   contact's own inbound inquiry (opt-in) or by prior express consent on
   file; the opt-out line ("Reply STOP to opt out") must appear on first
   contact of each sequence — present in §1 and §7a here. Confirm consent
   capture on the landing page form matches what compliance counsel requires
   for text-message intake specifically (not just email).
7. **No attorney-client relationship disclaimer** — present in the email
   footer (§2) and the landing-page footer disclaimer. Confirm it should also
   appear in the SMS flow (character-limit permitting) or whether a link to a
   full disclaimer page suffices under the firm's state rules.
8. **"Free consultation" language** — used throughout (§1, §2, §4–6). Confirm
   this is accurate for the specific firm (not all practice areas or firms
   offer free consults) before using it — false "free" claims are a common
   bar-complaint trigger.
9. **Urgent-safety line in missed-call text-back (§4)** — recommended but not
   mandatory; confirm firm wants it and that the crisis-resource language
   (911, hospital) is appropriate for their practice mix, and add
   jurisdiction-specific hotline numbers for family law/DV-adjacent intake if
   used.
10. **Practice-area-specific rules** — some practice areas carry extra
    restrictions beyond general attorney-advertising rules (e.g. many states
    have specific, stricter rules for personal-injury solicitation timing —
    "cooling off" periods before contacting accident victims in certain
    jurisdictions). Confirm the firm's practice area(s) and jurisdiction(s)
    against these before the first message ever sends, especially for any
    inquiry tied to a recent accident or arrest.
11. **This is not legal advice** — this disclaimer is present on the landing
    page footer; confirm whether it also needs to appear in this message
    library document itself when handed to a given firm (it does, and does
    here, but re-confirm placement/wording per firm).

