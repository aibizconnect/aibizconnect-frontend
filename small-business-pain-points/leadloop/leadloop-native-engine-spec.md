# LeadLoop v2 — The "Own-the-Engine" Build (Architecture Decision Spec)

**Author:** Arthur (Architect, TreeBranches)
**Date:** 2026-07-07
**Status:** Decision-grade. Verdict is at the end (§11) — read that first if you only have two minutes.
**Repo grounded in:** `C:\Users\User\dev\aibizconnect-frontend` (Next.js app + Supabase + `lib/server/*`). This is NOT a greenfield design — a large slice of LeadLoop v2 **already exists** in this repo behind a `no-auto-send` safety rule.

---

## TL;DR (the build-vs-rent call)

- **Launch on GHL. Keep launching on GHL.** GHL at $97 (Starter) → $497 (Agency/SaaS) is the correct chassis for the first ~15–25 clients. It is not the bottleneck; A2P approval and your own selling time are.
- **You have already built ~60% of the native engine** without setting out to. The Next.js app has a working Twilio client, an inbound-SMS webhook with signature verification, a unified Conversations inbox (data + server layer), a cadence-style follow-up worker with idempotent claim / quiet-hours / STOP handling, appointment reminders, opportunities/pipelines, contacts, calendars, and a Stripe billing spine. The pieces are wired for exactly this. What's missing is **(a) missed-call text-back, (b) a general multi-cadence engine, (c) per-tenant A2P/number provisioning, and (d) a mobile inbox** — the last one is the long pole.
- **Crossover: owning beats renting at roughly 30–40 active clients (~$6k–$8k MRR).** Below that, GHL's flat fee is cheaper than the build + on-call + compliance cost you take on. The trigger is a client *count*, not a feeling.
- **Long-pole risk = the mobile two-way inbox** and, right behind it, **you personally becoming the carrier-compliance and telephony-uptime owner** the day you leave GHL. Renting GHL also rents their A2P relationship, their deliverability reputation, and their 24/7 telephony ops. Owning means owning those too.

---

## 1. Goal & non-goals

**Goal.** A multi-tenant, SMS-first lead-response engine that AI Biz Connect *owns* end-to-end (Twilio + our infra + Supabase + Next.js), able to replace GoHighLevel as the delivery engine for the LeadLoop product without changing what the customer experiences: instant lead reply, missed-call text-back, a follow-up cadence that exits on reply/booked/STOP, calendar booking, appointment reminders, and a conversations inbox the agent can work from their phone.

**Non-goals.**
- **Not** rebuilding GHL. We build only the slice LeadLoop sells (the 5 workflows + G + Conversation AI + booking). No funnels-builder, no membership sites, no affiliate manager, no GHL "SaaS mode" reselling of *our* platform to *their* clients.
- **Not** a from-scratch telephony stack. We ride Twilio's Messaging Services + Programmable Voice status callbacks. We are not building carrier interconnects.
- **Not** a big-bang cutover. GHL and the native engine coexist during migration; clients move one at a time.
- **Not** a new AI vendor. Conversation AI routes through the existing OpenAI→Gemini chain already in `lib/agent/*`, consistent with the metered-AI house rule.

---

## 2. Requirements (derived from the playbook workflows)

Each maps to a playbook/runbook source so we build the *actual* behavior, not a generic CRM.

| # | Requirement | Source | Hard part |
|---|---|---|---|
| R1 | Inbound SMS → thread + contact, signature-verified | Playbook §2.5 Conversations; runbook Stage 9 | Already built (see §7) |
| R2 | Outbound SMS via Twilio REST, sticky sender (Messaging Service) | Playbook §3 message library | Already built |
| R3 | **Missed-call text-back**: no-answer/voicemail on the tenant's number → SMS §3.4 | Workflow B | **Net-new** — needs a Voice number + status-callback webhook |
| R4 | Two-way **Conversations inbox with a real mobile experience** | Playbook §2.5 opt. F; runbook Stage 9 §4 | Inbox data/logic built; **mobile UI is the long pole** |
| R5 | **Cadence/scheduler engine**: Day 1/3/7/14/30 (Workflow C), Day 0/2 (E), Day 0/2/5/10/monthly (G) — with exit-on-reply / booked / STOP | Workflows C, E, G | Follow-up *worker pattern* exists; general multi-step cadence is **net-new** |
| R6 | Calendar booking (public page → appointment + contact) | Playbook §2.4; runbook Stage 7 | Already built (`/book/T/slug`) |
| R7 | Appointment reminders: confirmation, 24h, 2h | Workflow D | Already built (email + 1h SMS; needs 2h/24h SMS tuning) |
| R8 | **A2P 10DLC per tenant** — brand + campaign registration mapped to onboarding | Runbook Stage 6 | **Net-new** — currently a human does this in GHL |
| R9 | STOP/HELP/opt-out + consent logging + quiet hours | Playbook §3; runbook Stage 2/8 | STOP + quiet-hours built; **explicit consent-log table is net-new** |
| R10 | Multi-tenant isolation | House convention | Enforced today via `tenant_id` on every query + RLS-ready tables |
| R11 | Conversation AI (auto-qualify, answer "still available?", push to booking) | Optional Workflow F | Reuse `lib/agent` LLM chain; net-new orchestration, do LAST |

**Honest note on R4.** The inbox *engine* is done. The **mobile experience** — a fast, notification-driven, thumb-first thread view an agent lives in all day — is a genuine product, not a responsive tweak. GHL's mobile app is a big part of what the $197/mo buys the customer. This is the single most expensive line in the whole build and the reason we do not rush the cutover.

---

## 3. Target architecture

### 3.1 Components

```
   TWILIO                         OUR INFRA                                CLIENTS
   ──────                         ─────────                                ───────
   Messaging Service(s)  ──┐
   (per-tenant sender)     │  webhooks (SMS in, voice status,      Next.js app (Vercel)
   Voice number  ──────────┼─► delivery status)                   • Conversations inbox (mobile-first)
                           │        │                             • Pipeline / calendar / contacts
   Outbound SMS (REST) ◄───┘        ▼                             • Settings / A2P wizard
                           ┌──────────────────────────┐
                           │  Webhook + worker tier    │          Google Calendar (OAuth) ◄─┐
                           │  (see 3.3 — droplet)      │          Stripe (billing) ◄────────┤ existing
                           └───────────┬──────────────┘          Resend (email) ◄───────────┘
                                       ▼
                           Supabase (Postgres + RLS + auth + storage)
                           tenants · numbers · contacts · conversations ·
                           messages · opportunities · workflows · scheduled_jobs ·
                           appointments · opt_outs/consent
```

### 3.2 Request paths (the four that matter)

**A new lead arrives** (web form / portal / FB):
`source → POST /api/leads (tenant-routed) → upsert contact → create opportunity @ "New Lead" → enqueue cadence "speed-to-lead" → immediate outbound SMS §3.1 via Messaging Service → record outbound message on thread`.
*Failure mode:* Twilio down → outbound row marked `failed`, lead is still safe in pipeline, retried by the worker; A2P not approved → SMS blocked with reason, email §3.2 still fires.

**An inbound reply arrives:**
`Twilio → POST /api/webhooks/twilio/sms → verify signature → ingestInboundSms → thread + message → (a) if STOP → optOut + consent-log; (b) else → cancel active cadence steps for this contact (exit-on-reply), bump unread, push notification to the assigned agent`.
*This already exists* minus the "cancel active cadence" hop (net-new when the cadence engine lands).

**A missed call (the hard one):**
`caller dials tenant Voice number → TwiML: dial the agent's real phone with a short timeout → on Dial status callback = no-answer|busy|failed|canceled → POST /api/webhooks/twilio/voice/status → find tenant by number → enqueue "missed-call text-back" → outbound SMS §3.4`.
*Failure mode:* agent answers → status = completed → no text. Voicemail path: if you record voicemail, the recording-status callback also fires text-back. Idempotency key = CallSid so a retried callback never double-texts.

**A scheduled follow-up fires:**
`cron (every 5 min) → POST /api/admin/run-cadences (secret-gated) → runDueCadenceSteps() → claim due rows (draft→sending, idempotent) → check exit conditions (replied? booked? opted-out?) → quiet-hours/timezone gate → send SMS/email → schedule next step → audit`.
*This is the follow-up worker pattern generalized.*

### 3.3 Where does it run? — **Split: Vercel for UI + business logic, droplet for telephony webhooks + cron.**

| Concern | Runs on | Why |
|---|---|---|
| Next.js UI, server actions, booking pages | **Vercel** (today) | Already there; great DX; the mobile inbox is a Next.js app |
| **Twilio inbound/status webhooks** | **DigitalOcean droplet (static IP `143.110.212.174`)** | Telephony wants a **stable, allowlistable endpoint**. Twilio signature verification is IP-agnostic, but carrier/Twilio ops, IP allowlists, and long-poll voice callbacks are far happier against a pinned host than ephemeral serverless. The droplet already runs the WP suite and provisioning scripts. |
| **Cadence + reminder cron workers** | **droplet** (systemd timer or node-cron) | Vercel cron works, but a always-on worker with a real process, retries, and a queue is a better home for time-critical sends than a 60s-capped function. The reaper pattern in `followup-worker.ts` already assumes a re-entrant worker. |

**Justification for the split, not all-in on one:** The webhooks route in the repo today lives at `app/api/webhooks/twilio/sms/route.ts` on Vercel and it *works* — signature verification is host-derived, so it's portable. But at telephony scale the two things that bite are (1) cold-start latency on the missed-call path (a 3-second cold start is a missed text-back the customer notices) and (2) cron reliability for time-boxed sends. The droplet removes both. We keep the UI on Vercel because rebuilding the app's hosting is pure cost with zero product value. **This is deliberately NOT a microservices split** — it's two deploy targets for one codebase, divided along the single seam that matters (stateless UI vs. always-on telephony). Do not add a third.

> **Over-engineering flag:** the temptation here is Twilio subaccounts + a per-tenant queue + a message bus. Resist. One Postgres table (`scheduled_jobs`) polled by one worker replaces all of it until you are past the crossover client count. See §6.

---

## 4. Data model

Map onto the **existing** tenant model — do not reinvent it. Today the repo uses `tenant_*` tables with `tenant_id uuid` on every row, RLS enabled with interim-open policies, and **service-role writes with `tenant_id` filtering enforced in the query layer** (`createSupabaseServiceClient()` + `.eq("tenant_id", …)` on every call). Membership/roles live in `tenant_users` / `organizations` (migration 0056/0068). LeadLoop v2 reuses all of this.

**Already exists (reuse as-is):**

| Table | Migration | Role in LeadLoop |
|---|---|---|
| `tenant_contacts` | (parity 0045/0046) | the lead; `dnd` + `tags` already power opt-out |
| `tenant_conversations` | 0057 | the inbox thread (per contact+channel) |
| `tenant_messages` | 0057 | each inbound/outbound message |
| `tenant_opportunities` | 0064 | pipeline card (owner/source/stage/lost_reason) |
| `tenant_calendars` / `tenant_appointments` | 0041/0044/0049 | booking + reminders |
| `tenant_integrations` / `tenant_secrets` | 0031/0051 | Twilio creds (encrypted) + config |
| `tenant_settings` | 0050 | per-tenant timezone, follow-up toggles, campaign store |
| `tenant_onboarding_followups` | 0036 | the *pattern* the cadence engine generalizes from |

**Net-new tables (the actual v2 delta):**

```sql
-- Provisioned Twilio numbers per tenant (replaces "from_number in config").
create table tenant_numbers (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  phone_e164 text not null,                 -- the tenant's LeadLoop number
  twilio_sid text,                          -- IncomingPhoneNumber SID
  messaging_service_sid text,               -- sticky sender / A2P binding
  capabilities text[] default '{sms,voice}',
  forward_to_e164 text,                     -- agent's real phone (missed-call dial target)
  status text not null default 'provisioning', -- provisioning|active|released
  created_at timestamptz not null default now()
);
create unique index tenant_numbers_phone_uidx on tenant_numbers (phone_e164);
create index tenant_numbers_tenant_idx on tenant_numbers (tenant_id);

-- A2P registration state, one per tenant, mirrors onboarding Stage 6.
create table tenant_a2p (
  tenant_id uuid primary key,
  brand_sid text, brand_status text,        -- Twilio/TCR brand
  campaign_sid text, campaign_status text,  -- use-case campaign
  use_case text,                            -- vertical wording (real estate/insurance/legal)
  legal_business_name text, ein text, address jsonb, website text,
  submitted_at timestamptz, approved_at timestamptz,
  last_error text
);

-- Workflow definitions (the 5 + G as data, tenant-owned copies from a template).
create table tenant_workflows (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  key text not null,                        -- speed_to_lead|missed_call|followup_loop|reminders|reactivation|nurture
  name text not null,
  enabled boolean not null default true,
  trigger jsonb not null,                   -- {type:'lead_created'|'inbound_no_reply'|'missed_call'|'appointment_booked'|'tag_added', ...}
  exit_conditions text[] default '{replied,booked,opted_out}',
  created_at timestamptz not null default now()
);
create table tenant_cadence_steps (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  workflow_id uuid not null references tenant_workflows(id) on delete cascade,
  step_index int not null,
  delay_minutes int not null,               -- offset from previous step (Day1=1440, Day3=2880 delta, …)
  channel text not null,                    -- sms|email
  template_key text not null,               -- resolves to message library copy
  unique (workflow_id, step_index)
);

-- The scheduler heartbeat. One row per pending send. THIS is the engine.
create table scheduled_jobs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  contact_id uuid not null,
  workflow_id uuid,
  step_index int,
  channel text not null,
  template_key text,
  scheduled_for timestamptz not null,
  status text not null default 'pending',   -- pending|sending|sent|blocked|failed|canceled
  send_attempts int not null default 0,
  last_attempt_at timestamptz,
  idempotency_key text,                     -- e.g. contact_id:workflow:step  (dedupe)
  recipient text, error text, sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index scheduled_jobs_idem_uidx on scheduled_jobs (idempotency_key) where idempotency_key is not null;
create index scheduled_jobs_due_idx on scheduled_jobs (status, scheduled_for) where status = 'pending';

-- Consent + opt-out ledger (compliance liability now sits with US — log everything).
create table tenant_consent_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  contact_id uuid,
  phone_e164 text not null,
  event text not null,                      -- opt_in|opt_out|help|resubscribe
  source text,                              -- form_submit|inbound_msg|manual|import
  raw_body text,                            -- the STOP/START text as received
  created_at timestamptz not null default now()
);
create index tenant_consent_phone_idx on tenant_consent_events (tenant_id, phone_e164, created_at desc);
```

**RLS.** Follow the repo's established pattern exactly (migration 0068 is the template): `enable row level security` on every new table, an interim-open policy for the app's service-role path, and `tenant_id` filtered in *every* query in the server layer. When the app graduates from interim-open to auth-scoped RLS (a portfolio-wide task, not a LeadLoop one), these tables inherit the same `tenant_id = (jwt tenant claim)` policy the rest of the schema will get. **Do not invent a bespoke isolation model for LeadLoop** — it must be indistinguishable from every other `tenant_*` table so one RLS migration covers the whole app.

> **Over-engineering flag:** `tenant_workflows` + `tenant_cadence_steps` as full editable tables is borderline gold-plating for v1. LeadLoop sells *five fixed workflows*, not a workflow builder (the runbook explicitly scopes this: "a proven system we configure, we don't rebuild it per client"). **v1 can ship the five cadences as code constants** and only `scheduled_jobs` + `tenant_consent_events` + `tenant_numbers` + `tenant_a2p` are truly required. Add the workflow tables only when a real second use-case needs per-tenant step editing. Two-users rule: skip until proven.

---

## 5. Twilio wiring

### 5.1 Numbers, Messaging Services, and the account-structure decision

**Decision: ONE Twilio account, ONE Messaging Service per tenant, numbers pooled under the parent account — NOT subaccounts (for now).**

| Approach | Pros | Cons | Verdict |
|---|---|---|---|
| **Subaccount per tenant** | Clean billing isolation; each tenant's usage/suspension is contained; matches GHL's model | Each subaccount is its own A2P **Brand** ($46 vetting each) + more provisioning API surface + more to monitor. Heavy at low client counts. | **Later** — adopt past ~50 clients when isolation/billing-attribution pays for itself |
| **One account + Messaging Service per tenant (number pool inside it)** | One Brand for *your* business is NOT how A2P works for resold identities — see below; but operationally simplest; sticky-sender + A2P campaign attaches at the Messaging Service | You still register a **separate A2P Brand+Campaign per client business** (their EIN, their use-case) — A2P identity is per *business*, not per Twilio-account-structure | **Start here** |

**The A2P nuance that drives everything:** A2P 10DLC Brand identity is tied to the *end business's* legal name + EIN, and each Brand carries its own TCR trust score. So **regardless** of subaccount-vs-pool, **each LeadLoop client needs its own Brand + Campaign registration** (their real estate brokerage / insurance agency / law firm). The account *structure* is an operational choice; the *A2P registration* is per-client either way. That's why the onboarding runbook's Stage 6 is per-customer and why it's the long pole. Starting with a number pool + per-tenant Messaging Service is simplest to provision; move to subaccounts when you want hard billing/suspension isolation.

Provisioning per client (automates runbook Stage 5–6):
1. `IncomingPhoneNumbers.create` — buy a local number in the client's area code → store in `tenant_numbers`.
2. `MessagingServices.create` + add the number to it → store `messaging_service_sid`.
3. Set the number's **SMS webhook** → `https://<droplet>/api/webhooks/twilio/sms` and **Voice webhook** → `/api/webhooks/twilio/voice`.
4. A2P: create Brand (their EIN/name/address), create Campaign (per-vertical use-case wording from the runbook table), attach Messaging Service → store SIDs + status in `tenant_a2p`.

### 5.2 The exact webhooks

| Webhook | Trigger | Endpoint | Does |
|---|---|---|---|
| Inbound SMS | contact texts tenant number | `POST /api/webhooks/twilio/sms` | **exists** — verify sig, ingest, STOP→opt-out |
| **Voice status** | inbound call to tenant number | `POST /api/webhooks/twilio/voice` returns TwiML `<Dial>` to `forward_to_e164` with `action`/`timeout` | **net-new** — the dial-then-detect path |
| **Voice dial-status** | `<Dial>` completes | `POST /api/webhooks/twilio/voice/status` | **net-new** — if `DialCallStatus ∈ {no-answer,busy,failed}` → enqueue missed-call text-back (idempotent on CallSid) |
| **Delivery status** | outbound SMS delivered/failed | `POST /api/webhooks/twilio/sms/status` | **net-new (nice-to-have)** — update `tenant_messages.status`; not required for MVP |

Outbound is already correct in `lib/server/twilio.ts::sendSms` — prefers `MessagingServiceSid`, falls back to `From`, attaches `StatusCallback`. No change needed except pointing it at `tenant_numbers.messaging_service_sid` instead of `config.from_number`.

### 5.3 A2P throughput / trust tiers (what it means at scale)

- **Standard Brand** (register with EIN, ~$46 one-time vetting) unlocks higher throughput and better deliverability; **Low-Volume Standard** and **Sole Proprietor** ($4.50) tiers cap throughput hard. For real estate brokerages with an EIN, register **Standard**.
- Throughput (messages/sec to a given carrier) scales with the Brand's TCR trust score. At LeadLoop's volumes (a few hundred texts/day per client — speed-to-lead + a cadence, not blasts) throughput is a non-issue; the tier matters for **deliverability**, not raw speed.
- **Implication for onboarding:** the vertical use-case wording (runbook Stage 6 table) is the single biggest lever on approval. Get it exactly right per vertical. This is unchanged from the GHL flow — you already know how to do it; you're just doing it against Twilio's console/API instead of GHL's.

### 5.4 Current Twilio economics (verified July 2026)

| Item | Cost | Note |
|---|---|---|
| Local number | **~$1.15/mo** | per tenant |
| Outbound SMS | **~$0.0083/segment** base | 160 chars = 1 segment; a warm 3-line text ≈ 1–2 segments |
| Inbound SMS | ~$0.0075/segment | |
| Carrier pass-through (A2P) | **~$0.003–$0.005/msg** | AT&T/T-Mobile/Verizon; **T-Mobile raised fees Jan 2026** |
| A2P Brand (Standard) | **~$46 one-time** | per client business |
| A2P Campaign vetting | **~$15 one-time** | per campaign |
| A2P Campaign monthly | **~$1.50–$10/mo** | recurring per campaign, per client |

So the **all-in Twilio cost per client** ≈ number ($1.15) + campaign monthly (~$2–$10) + usage. At a realistic real-estate volume (say 800 outbound + 400 inbound segments/mo): usage ≈ 800×(0.0083+0.004) + 400×0.0075 ≈ **~$13**. Total **~$16–$25/client/mo** in raw telephony, plus amortized one-time A2P (~$61) over the client's lifetime. This is the number that must beat GHL. See §9.

---

## 6. Cadence / scheduler engine

**Decision: cron + a `scheduled_jobs` table. NOT BullMQ / not a queue service.**

The repo already proves this pattern works in `followup-worker.ts`: claim-idempotently (`draft→sending` with a conditional update), per-attempt audit, max-attempts cap, quiet-hours defer, a reaper for stuck rows. Generalize it — don't replace it.

- **Firing:** a worker runs every ~5 min (droplet systemd timer, or Vercel cron hitting a secret-gated endpoint). It selects `scheduled_jobs where status='pending' and scheduled_for <= now()` limited to a batch, claims each row atomically, checks exit conditions, sends, and inserts the *next* step's job.
- **Idempotency:** unique `idempotency_key = contact_id:workflow:step`. A double-fired cron can't double-send because the claim is a conditional `update … where status='pending'` and the unique key blocks duplicate enqueues.
- **Exit conditions (the critical one — the runbook calls out "nagging booked clients" as the embarrassing failure):** before sending a cadence step, re-check: did the contact reply since enqueue? is there a booked appointment? is `dnd`/opted-out? Any true → mark the job `canceled` and cancel the rest of that contact's pending jobs for the workflow. Also cancel on the **inbound webhook** the instant a reply lands (belt and suspenders).
- **Quiet hours + timezone:** already implemented (`inQuietHours(tz)` defers to +3h). Reuse verbatim. Timezone comes from `tenant_settings.default_timezone`.

> **Over-engineering flag:** BullMQ/Redis buys you nothing here. Cadence sends are minute-granular, low-volume, and already idempotent in Postgres. A queue adds an operational dependency (Redis uptime) to a telephony system whose whole selling point is that *you* now own uptime. Fewer moving parts = fewer 2 a.m. pages. Postgres-as-queue until you are sending tens of thousands of jobs/hour, which LeadLoop will not do for years.

---

## 7. What's reusable vs net-new

This is the crux of the effort estimate. **The repo is much further along than "we run on GHL" implies.**

| Capability | State in repo | File(s) | Verdict |
|---|---|---|---|
| Twilio send/creds/E.164/signature-verify | **Built** | `lib/server/twilio.ts` | Reuse; repoint `from` → `tenant_numbers` |
| Inbound SMS webhook | **Built** | `app/api/webhooks/twilio/sms/route.ts` | Reuse; move to droplet |
| Conversations inbox (data + threads + reply + STOP) | **Built** | `lib/server/conversations.ts`, migration 0057, `components/conversations/ConversationsHub.tsx` | Reuse |
| Follow-up worker (claim/idempotent/quiet-hours/reaper) | **Built** (onboarding-scoped) | `lib/server/followup-worker.ts`, migration 0036 | **Generalize** into the cadence engine |
| Appointment reminders (email + 1h SMS, idempotent) | **Built** | `lib/server/appointment-reminders.ts` | Reuse; add 24h/2h SMS variants |
| SMS campaigns (bulk, opt-out floor, metering) | **Built** | `lib/server/sms-campaigns.ts` | Reuse for Reactivation (Workflow E) |
| Opportunities / pipelines / stages | **Built** | migration 0064, opportunities UI | Reuse |
| Calendars + public booking + Google sync | **Built** | migration 0041/0044, `/book/T/slug` | Reuse (this is a *huge* GHL-parity chunk already done) |
| Contacts + tags + dnd + import + merge | **Built** | GHL-PARITY.md Contacts section | Reuse |
| Stripe billing + Identity | **Built** | INVENTORY §4 | Reuse for LeadLoop enroll link |
| Multi-tenant model + RLS-ready tables | **Built** | migrations 0056/0068 pattern | Reuse — do not reinvent |
| **Missed-call text-back** | **Net-new** | (voice webhooks) | Build — Phase 1 |
| **Per-tenant A2P + number provisioning** | **Net-new** (human does it in GHL today) | `tenant_a2p`, `tenant_numbers`, provisioning actions | Build — Phase 2 |
| **General cadence engine** (5 workflows as scheduled_jobs) | **Net-new** (worker pattern exists) | `scheduled_jobs`, generalized worker | Build — Phase 2 |
| **Consent ledger** | **Net-new** | `tenant_consent_events` | Build — Phase 2 |
| **Mobile two-way inbox** | **Net-new** (desktop inbox exists) | mobile-first inbox + push notifications | Build — **Phase 3, the long pole** |
| **Conversation AI orchestration** | **Net-new** (LLM chain exists) | `lib/agent` + inbox | Build — Phase 4, last |

**The Voice domain is a stub, not a build.** `lib/agent/domains/voice.ts` registers `placeCall`/`sendSms` as G-gated + `liveEnabled:false`. That's the agent-mesh's safety posture, not the LeadLoop path. LeadLoop's missed-call text-back is a plain webhook + `sendSms`, not the agent mesh — don't route it through the gated voice domain.

**Bottom line:** roughly **60%** of the native engine already exists. LeadLoop v2 is not "build GHL"; it's "add missed-call, A2P provisioning, a generalized cadence engine, a consent ledger, and a mobile inbox to an app that already has the inbox, sender, cadence-pattern, booking, and pipeline."

---

## 8. Build phases & effort

Person-weeks are for one competent full-stack dev (Nova) + PHP where the droplet needs it (Mason). Ranges are honest, not optimistic. GHL keeps running the UI-heavy parts until Phase 3 lands.

| Phase | Scope | Net-new work | Effort | GHL still doing |
|---|---|---|---|---|
| **P1 — Speed-to-lead + Missed-call MVP** | Provision one number by hand; wire lead→SMS §3.1 via existing `sendSms`; build the **voice status webhook** + missed-call text-back; run cadence via generalized worker for *one* client (yourself). Inbox: desktop only (exists). | Voice webhooks; generalize `scheduled_jobs`; consent ledger | **3–5 pw** | Everything for paying clients |
| **P2 — Onboarding automation** | `tenant_numbers` + `tenant_a2p` tables; **provisioning actions** (buy number, create Messaging Service, submit A2P via API); the 5 cadences as code; delivery-status webhook | Provisioning API surface; A2P submit flow | **4–6 pw** | UI-heavy inbox + client mgmt for existing clients |
| **P3 — Mobile inbox (THE LONG POLE)** | Mobile-first two-way conversations: fast thread view, send, assign, push notifications (web-push or a thin PWA), unread badges, quick-replies from the message library. This is what lets you actually *leave* GHL. | The whole mobile inbox + push infra | **6–10 pw** | Nothing new; clients migrate off here |
| **P4 — Conversation AI + full migration** | Wire the OpenAI→Gemini chain into the inbox to auto-answer/qualify/book; migrate remaining clients; decommission GHL seat | AI orchestration; migration tooling | **3–5 pw** | — (GHL retired) |

**Total: ~16–26 person-weeks** to fully own the engine, of which the **mobile inbox alone is a third**. P1 delivers a working demo you own in a month; P3 is the gate to actually turning GHL off.

---

## 9. Cost model & crossover

**Rent (GHL):** Agency/SaaS **$497/mo flat**, unlimited sub-accounts, + ~$16–$25/client raw Twilio pass-through (which you also pay when you own). Plus ~$0 of your engineering/on-call time — GHL owns the platform, the A2P relationship, deliverability reputation, and 24/7 telephony uptime.

**Own (native engine):** Twilio raw ~$16–$25/client/mo + amortized one-time A2P (~$61/client) + **your build and maintenance time as a real cost**. That last term is what most build-vs-rent math dishonestly drops.

### The honest crossover

Model the *marginal monthly* cost per client and the *fixed* monthly burden.

| | Rent (GHL) | Own (native) |
|---|---|---|
| Fixed / mo | $497 (Agency) | **$0 subscription**, but **~$1.5k–$3k/mo amortized** engineering maintenance + on-call (16–26pw build amortized over 24 mo + ongoing upkeep) |
| Marginal / client / mo | ~$20 Twilio | ~$20 Twilio (same) |
| One-time / client | ~$0 (GHL handles A2P infra) | ~$61 A2P |

The marginal Twilio cost is **identical** either way (you pay Twilio in both worlds). So the crossover is driven entirely by **GHL's $497 flat vs. your amortized fixed engineering burden.**

- If you carry a realistic **~$2k/mo** true cost of owning (maintenance + on-call + the occasional A2P/deliverability firefight), owning is **more expensive than GHL's $497 until the flat fee itself becomes trivial** — i.e. never on cost alone at small scale.
- **Owning wins when the value isn't the $497 saved — it's margin control, product differentiation, and not being a reseller.** The real trigger is **client count high enough that (a) the mobile inbox is worth building and (b) your maintenance cost per client drops below GHL's implicit per-client cost.** That lands around **30–40 active clients (~$6k–$8k MRR at $197/client)**: at that scale, $2k/mo of ownership burden is ~$50–$65/client, comparable to what GHL's $497 + your management time costs per client, and you gain the moat.

**Recommendation: pull the trigger at ~30 active clients / ~$6k MRR — and even then, start with P1/P2 while GHL runs P3-shaped work.** Below 30 clients, GHL is cheaper *and* de-risks compliance/uptime. The build is justified by **strategic ownership** (margin, product control, not reselling someone else's engine), not by cost savings — and it only pencils once the client base amortizes the maintenance burden.

> **Adversarial check on my own number:** the biggest hidden cost is not Twilio, it's *you becoming on-call for telephony*. If a cadence worker stalls at 2 a.m., or T-Mobile filters your traffic, or an A2P campaign gets rejected, that's now your emergency, not GHL's. Price that honestly (it's in the ~$2k) or the crossover is a mirage.

---

## 10. Risks & mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| **Deliverability / carrier filtering** | Texts silently dropped; customer thinks LeadLoop is broken | Standard Brand registration; correct per-vertical use-case; monitor delivery-status webhook; keep volumes conversational (LeadLoop's cadence is low-volume by design). GHL's shared reputation was a hidden asset — owning means owning reputation. |
| **A2P rejection** | Client can't go live; onboarding stalls | Same failure story as the runbook (fix use-case wording / EIN match, resubmit). Build the A2P submit as an API call with clear status surfacing in `tenant_a2p.last_error`. |
| **Compliance liability shifts to us** | We're now the party responsible for consent/STOP/quiet-hours | `tenant_consent_events` ledger logs every opt-in/out with the raw text; STOP handling already built; contract (runbook Stage 2) already makes the *customer* affirm their contacts consented. Keep that clause. |
| **Telephony uptime / on-call** | A stalled worker = missed texts = the customer's lost deal | Droplet + systemd timer + the reaper pattern already in the codebase; delivery-status monitoring; a simple health-check alert. This is the real cost in §9 — don't pretend it's free. |
| **Maintenance burden** | Small team, big surface | Reuse over rebuild (§7); ship the 5 cadences as code not a builder (§4 flag); no queue service (§6 flag). Every avoided abstraction is a Sunday you keep. |
| **Migration drops a live client's messages** | Customer mid-conversation loses a thread | **Dual-run per client:** provision their native number *in parallel*, port lead sources to the native `/api/leads` endpoint, run both engines for a week with the native one shadow-logging, then flip the number's webhook and forward the GHL number. Never move all clients at once. Migrate the *newest*/simplest client first. |
| **Mobile inbox under-delivers** | Agents keep opening GHL's app; you can't retire GHL | Treat P3 as a real product with its own QA. Until the mobile inbox is something agents *prefer*, GHL stays. This is the gate, not a checkbox. |

---

## 11. Recommendation (the verdict)

**Stay on GHL now. Do not start migrating clients until ~30 active clients / ~$6k MRR.** Below that, GHL's $497 flat fee is cheaper than the true cost of owning, and it rents you three things you don't want to build yet: the A2P relationship, deliverability reputation, and 24/7 telephony ops.

**But start the build in parallel and in this order — because ~60% already exists and P1 is a month of work:**

1. **P1 (now, ~3–5pw):** Own your *own* LeadLoop-selling-LeadLoop instance on the native engine. Missed-call text-back + speed-to-lead + the generalized cadence worker, desktop inbox. This is your demo, your dogfood, and it de-risks the hard parts (voice webhooks, cadence exits) at zero customer risk.
2. **P2 (~4–6pw):** Automate number + A2P provisioning and ship the 5 cadences as code + the consent ledger. Now onboarding a native client is as fast as loading a GHL snapshot.
3. **P3 (~6–10pw, the long pole):** Build the mobile inbox until agents *prefer* it to GHL's app. **This is the gate to turning GHL off** — do not cut over before it clears.
4. **P4 (~3–5pw):** Conversation AI + migrate clients one-at-a-time (dual-run, newest first), then retire the GHL Agency seat.

**Pull the trigger to migrate at ~30 clients.** Justify the build on **ownership and margin control**, not cost savings — the Twilio marginal cost is identical either way, so the win is strategic (you stop reselling someone else's engine), and it only pencils once the client base amortizes the ~$2k/mo maintenance-and-on-call burden.

**The one thing that decides the timeline is the same as it was for GHL: A2P.** And the one thing that decides whether you can *ever* leave GHL is the mobile inbox. Build to those two truths.

---

## Appendix — files this spec is grounded in

- Behavior source: `small-business-pain-points/leadloop/leadloop-ghl-launch-playbook.md`, `…/leadloop-fulfillment-runbook.md`
- Twilio client + inbound webhook: `lib/server/twilio.ts`, `app/api/webhooks/twilio/sms/route.ts`
- Conversations inbox: `lib/server/conversations.ts`, `supabase/migrations/0057_unified_conversations.sql`, `components/conversations/ConversationsHub.tsx`
- Cadence pattern to generalize: `lib/server/followup-worker.ts`, `supabase/migrations/0036_followup_sender_worker.sql`
- Appointment reminders: `lib/server/appointment-reminders.ts`
- Bulk SMS (Reactivation): `lib/server/sms-campaigns.ts`
- Opportunities/pipeline: `supabase/migrations/0064_opportunities_fields.sql`
- Tenant/RLS pattern to copy: `supabase/migrations/0068_memberships.sql`, `0056_team_and_orgs.sql`
- Voice stub (do NOT route LeadLoop through it): `lib/agent/domains/voice.ts`
- Cron config today: `vercel.json`
- Parity status: `docs/GHL-PARITY.md`

**Twilio pricing verified (July 2026):**
- [A2P 10DLC pricing & fees — Twilio Help Center](https://help.twilio.com/articles/1260803965530-What-pricing-and-fees-are-associated-with-the-A2P-10DLC-service-)
- [SMS Pricing US — Twilio](https://www.twilio.com/en-us/sms/pricing/us)
- [Phone Number pricing — Twilio](https://www.twilio.com/docs/phone-numbers/pricing)
- [A2P 10DLC in 2026 — tuco.ai](https://tuco.ai/a2p-10dlc)
