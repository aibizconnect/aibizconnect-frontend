# LeadLoop — Client Intake Form

**What this is:** the onboarding questionnaire every new customer fills out. A
completed form lets you build their LeadLoop from the saved Snapshot in ~30
minutes and submit A2P the same day.

**When it's sent — depends on the entry path** (see the runbook's two-path model):
- **Path A — "Enroll Now" (self-serve):** the customer **already paid** at
  `/enroll`, and this form is **sent to them automatically the moment payment
  clears** — it's their first real step. Section 9 "Payment" is **already
  satisfied** (pre-check it).
- **Path B — "Complimentary Strategy Session":** you send this after they say yes
  on the call. They pay at/after the call via the enroll link, so Section 9 is
  completed when they enroll.

**How to use it:** paste it into an email, a shared doc, or (later) turn it into a
GHL form. It's grouped so the customer can fill it in one pass. The six 🔴 fields
are **blocking** — you can't provision or start the A2P clock without them, so if
the form is slow to come back, get those on the phone (Path B) or in a quick
welcome email (Path A).

> Sender line (yours): from **support@aibizconnect.ca**. Every question is about
> *their* business — nothing here references anyone's personal business.

---

## Suggested email intro (copy-paste)

```
Subject: Quick setup form for your LeadLoop 🎯

Hi {First Name},

Excited to get your LeadLoop live. This short form is everything I need to build
it and get your texting approved by the carrier (that approval takes 1–5 business
days, so the sooner this comes back, the sooner you're live).

Takes about 5 minutes. The starred (🔴) items are the ones I need first to get
the clock started — if you only have a minute, send me those and follow up with
the rest.

Any questions, just reply here or reach me at support@aibizconnect.ca.

— The LeadLoop team
```

---

## Section 1 — Business identity  *(needed to provision + register A2P)*

| # | Question | Notes |
|---|---|---|
| 1.1 🔴 | **Legal business name** (exactly as registered) | A2P Brand needs this to match your registration exactly. |
| 1.2 🔴 | **Business mailing address** | Registered business address (street, city, state/province, ZIP/postal, country). |
| 1.3 🔴 | **Timezone** | Drives your calendar and message send times. |
| 1.4 🔴 | **EIN / Business Number (BN) / registration #** | Required for carrier (A2P) Brand registration. |
| 1.5 🔴 | **Website URL** | Used for A2P Campaign + your email sending domain. |
| 1.6 | **Main business phone** (your current public number) | So we can set up missed-call text-back on the right line. |
| 1.7 | **Best contact email for you** | For your logins, notifications, and our updates. |

---

## Section 2 — Vertical + specialty  *(picks your message pack + compliance path)*

| # | Question | Notes |
|---|---|---|
| 2.1 🔴 | **Which best describes you?** ☐ Real estate ☐ Insurance broker ☐ Law firm / legal ☐ Other: ____ | Sets the message library, A2P use-case wording, and compliance requirements. |
| 2.2 | **Your specialty / focus** | e.g. residential resale · commercial · auto & home insurance · family law · personal injury. Helps us set your merge fields (property type / policy type / matter type). |
| 2.3 | **The service areas / markets you cover** | City/region — helps pick your local phone number area code. |

---

## Section 3 — Brand voice  *(so the messages sound like you)*

| # | Question | Notes |
|---|---|---|
| 3.1 | **Sender name to use in texts** (e.g. "Jane" or "Jane at Acme") | This is the `{{user.first_name}}` / signature your leads see. |
| 3.2 | **Business name as you want it shown** | The `{{location.name}}` in messages. |
| 3.3 | **Tone** ☐ Warm & casual ☐ Warm but professional ☐ Formal/restrained | Legal defaults to restrained; insurance to warm-professional; real estate can be casual. |
| 3.4 | **Any words, emojis, or phrases to AVOID?** | e.g. no emojis, don't say "deal," avoid "cheapest/best rate." We'll strip these from the copy. |
| 3.5 | **Anything you always say / your signature sign-off?** | Optional flavor we can weave in. |

---

## Section 4 — Lead sources to connect  *(where your leads come from now)*

Check all that apply and give the detail we'll need to wire each one.

| # | Source | Detail we need |
|---|---|---|
| 4.1 | ☐ **Your website / landing page form** | URL of the page + who manages the site (you / a webmaster). |
| 4.2 | ☐ **Real-estate / insurance portal** (Zillow, Realtor.com, etc.) | Which portal(s); how leads reach you today (email? dashboard?). |
| 4.3 | ☐ **Facebook / Instagram lead ads** | Do you run lead-ad forms? Which page/account. |
| 4.4 | ☐ **Missed phone calls** | The number that should trigger text-back (usually 1.6 above). |
| 4.5 | ☐ **Other** (referral form, QR code, etc.) | Describe it. |
| 4.6 | **Roughly how many new leads per month?** | Sizes the setup and A2P campaign. |

---

## Section 5 — Calendar / scheduling  *(so bookings hit your real availability)*

| # | Question | Notes |
|---|---|---|
| 5.1 | **Which calendar do you book into?** ☐ Google ☐ Outlook/Microsoft ☐ Other: ____ | We connect this so only your free times show. |
| 5.2 | **Appointment length** (e.g. 30 min) + **buffer between** | Sets your booking slots. |
| 5.3 | **Your bookable hours / days** | e.g. Mon–Fri 9–5, no weekends. |
| 5.4 | **What should the appointment be called?** | e.g. "Buyer Consult," "Coverage Review," "Free Case Consultation." |
| 5.5 | **Who gets the booking notifications?** | You, an assistant, a team — list names/emails. |

> When you're ready, we'll ask you to click one "connect calendar" link so your
> live availability flows in — nothing to configure on your end beyond the click.

---

## Section 6 — Phone / number preferences

| # | Question | Notes |
|---|---|---|
| 6.1 | **Preferred area code** for your new LeadLoop texting number | We provision a local number in your market (this is separate from your main line). |
| 6.2 | **Should missed calls to your main line trigger a text-back?** ☐ Yes ☐ No | If yes, confirm which number (1.6). |
| 6.3 | **Any existing number you want forwarded / kept?** | Optional — describe your current setup. |

---

## Section 7 — Compliance specifics  *(vertical-dependent — do not skip)*

**Everyone:**
- 7.1 — **Confirm:** the contacts you'll add to LeadLoop have consented to be
  texted (submitted an inquiry, or you have prior express consent). ☐ Confirmed
  *(This is what keeps the whole system compliant — required.)*

**If Real estate:** nothing extra beyond 7.1 (STOP/opt-out is built into every message).

**If Insurance broker:**
- 7.2 — **License disclosure wording** to appear on messages/email
  (e.g. "Licensed insurance broker, [Province/State], License #____"). We set
  this as `{{custom_values.license_jurisdiction}}`.
- 7.3 — **Confirm:** you understand LeadLoop **never quotes rates or gives
  coverage advice** — it books conversations only. ☐ Confirmed
- 7.4 — **Who is your compliance officer / licensed principal** who will sign off
  on the message copy before go-live? (name + email)

**If Law firm / legal:**
- 7.5 — **Exact "Attorney Advertising" wording** your state/bar requires (if you
  have a preferred form). We add it to email + booking touchpoints.
- 7.6 — **Confirm** you want the standard disclaimers on your templates:
  "Prior results do not guarantee a similar outcome" + "this message does not
  create an attorney-client relationship and is not legal advice." ☐ Confirmed
- 7.7 — **Matter types** you take (for the neutral `{{custom_values.matter_type}}`
  label — e.g. "car accident," "family law"). No merit/characterization language.
- 7.8 — **Missed-call safety line:** do you want the "if this is urgent, call
  911…" line on the missed-call text? ☐ Yes ☐ No + any hotline to include.
- 7.9 — **Who is your bar-compliance counsel** signing off on the copy before
  go-live? (name + email) *— required before SMS goes live.*

---

## Section 8 — Assets  *(so it looks like you)*

| # | Item | Notes |
|---|---|---|
| 8.1 | **Logo** (PNG/SVG, transparent if possible) | Used on your booking page + email header. |
| 8.2 | **Headshot** (if you want it on the booking page) | Optional but boosts trust. |
| 8.3 | **Brand colors** (hex codes if you know them) | Optional; we'll match your booking page. |
| 8.4 | **A privacy policy / terms URL**, if you have one | We link it where consent is captured. |

---

## Section 9 — Sign-offs  *(the two gates before we build/go-live)*

- 9.1 — **Payment:** setup fee ($497) paid and $197/mo subscription started via
  the enroll link (Stripe Payment Link). ☐ Done
  *(Enrolled via `/enroll`? This is already done — pre-checked. Booked a strategy
  session? You'll complete this when you enroll at/after the call.)*
- 9.2 — **SMS consent language approved:** you've reviewed and approve the opt-out
  ("Reply STOP to opt out") and consent handling described in the service
  agreement, and (insurance/legal) your compliance officer / bar counsel will
  sign off on message copy before we flip SMS live. ☐ Approved

---

_That's everything. Once this is back with the 🔴 items filled, we provision your
sub-account from the LeadLoop Snapshot and submit your carrier (A2P) registration
the same day — the 1–5 day approval is the only thing standing between you and
live. Questions any time: **support@aibizconnect.ca**._
