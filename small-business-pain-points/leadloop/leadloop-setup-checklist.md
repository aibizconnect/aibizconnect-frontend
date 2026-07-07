# LeadLoop — One-Page GHL Setup Checklist

**Print this and tick as you go.** It's the execution version of `leadloop-ghl-launch-playbook.md` (§2–4). Message copy lives in the playbook §3; this is just the do-list so you don't miss a step. ⏱ = rough time · 🔴 = start-and-wait, do first.

Business line for this build: **+1 365-363-7111** (from `docs/INVENTORY.md`).

---

## Day 0 — stand it up (and start the slow clock)

- [ ] 🔴 **Sign up / open GHL** — Starter to test one client, Agency/SaaS to resell. Start the 14-day trial. ⏱15m
- [ ] Create a **Sub-Account (Location)** — name it `LeadLoop Demo` (build the template here). ⏱5m
- [ ] Set sub-account **business name, timezone, address** (required for phone + A2P). ⏱5m
- [ ] **Add a phone number** (Settings → Phone Numbers → Add Number), local area code. ⏱5m
- [ ] 🔴 **Start A2P 10DLC** (Trust Center → Brand + Campaign registration). Use real business info. Use-case: *"Real estate lead follow-up and appointment booking. Customers opt in by submitting an inquiry form or contacting the business."* → **this is the gate; nothing sends SMS until it approves (~1–5 biz days).** ⏱20m
- [ ] Enable **Email sending** (verify a domain, or use default LC email to start). ⏱10m
- [ ] Publish `leadloop-landing.html` to WordPress (Custom HTML block / blank template). ⏱10m

## Day 1–2 — build the engine (A2P still pending is fine)

- [ ] **Pipeline** "Buyer/Seller Leads": `New Lead → Auto-Contacted → Replied → Appointment Booked → Showing/Meeting → Offer/Active → Won → Lost`. ⏱10m
- [ ] **Calendar** "Showings & Consults" — connect the agent's Google/Outlook, set slot length + buffer, **copy the booking link**. ⏱10m
- [ ] **Workflow A — Speed-to-Lead**: trigger = form/webhook/new contact → SMS §3.1 → Email §3.2 → wait 5m → SMS §3.3 → move to Auto-Contacted + notify agent. ⏱15m
- [ ] **Workflow B — Missed-Call Text-Back**: trigger = call no-answer/voicemail → SMS §3.4. ⏱10m
- [ ] **Workflow C — Follow-Up Loop**: Day1 §3.5a · Day3 §3.5b · Day7 §3.5c(email) · Day14 §3.5d · Day30 §3.5e. ⚠️ **Add exit-on-reply/booked/STOP as a goal condition** or you'll nag booked clients. ⏱15m
- [ ] **Workflow D — Appointment Reminders**: confirm §3.6a · 24h §3.6b · 2h §3.6c. ⏱10m
- [ ] **Workflow E — Reactivation**: tag-triggered → SMS §3.7a → Day2 §3.7b. ⏱10m
- [ ] Drop the **calendar link** into the message merge field (`{{custom_values.calendar_link}}`) everywhere it's referenced. ⏱5m
- [ ] **Wire the landing form → GHL**: either replace the `<form>` with a GHL form/calendar embed, **or** create an Inbound Webhook and set the landing form's `action` to it (map `name`, `phone`). ⏱10m
- [ ] **Save a Snapshot** of the demo sub-account (Agency → Snapshots). This is the reusable product asset. ⏱5m

## Day 2–5 — go live

- [ ] A2P **approved** → send yourself a test from each workflow. ⏱—
- [ ] **End-to-end test**: submit the landing form → contact appears in GHL → auto-reply fires → book a slot → reminders queue. ⏱15m
- [ ] Confirm **STOP** removes a contact from all sequences. ⏱5m

## Day 3–14 — first customer

- [ ] Outreach: sphere → local RE Facebook groups → cold DM/call agents with active listings (script: playbook §6). 
- [ ] Offer a **free reactivation demo** on a friendly agent's dead list (fastest visible ROI).
- [ ] Load first paying client from the **Snapshot** (one click) → tune messages to their voice.

---

### Pre-publish gate for the landing page (do before it goes public)
- [ ] Lead form actually posts to GHL (not the demo toast handler).
- [ ] **SMS consent line** visible near the form (required — the A2P use-case claims form = opt-in).
- [ ] **Privacy policy + contact** links in the footer.
- [ ] Real pricing, calendar link, and one guarantee wording (align landing ↔ playbook §5).

_See `leadloop-landing.html` review notes; these are the ship-blockers._
