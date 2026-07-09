# Small-Business Pain Points → Products

Everything from the small-business / independent-professional pain-point research and
the first product to come out of it (**LeadLoop**), gathered in one place.

> **How to resume this work in a new session:** a Claude Code on the web session starts
> from a **repository + branch**, not a folder. Start a new session, pick repo
> `aibizconnect/aibizconnect-frontend` and branch `claude/small-biz-pain-points-ob9unw`,
> and all of this comes back with the clone. Then just say *"open the small-business-pain-points folder."*

---

## What's here

### `research/` — the research and the product-selection tooling
| File | What it is |
|---|---|
| `2026-07-small-biz-pain-points.md` | The cited research report. Pain points ranked and broken out Toronto → Ontario → Canada → USA. Each claim tagged ✅ **Verified** (adversarially confirmed) vs ◑ **Cited** (single-source). |
| `2026-07-five-app-ideas.md` | Five app ideas, each with a one-page feasibility study (clients, market size, how we serve them, MVP scope, monetization, competition, risks) + the recommendation. |
| `idea-scorecard-framework.md` | The **reusable** scoring rubric — 7 weighted criteria with 1–5 anchors. Score any future idea the same way. |
| `idea-comparison.html` | **Open in a browser.** Interactive side-by-side scorecard: live weight sliders, editable scores, add-your-own-idea, light/dark, printable. The "show them" artifact. |

### `leadloop/` — the first product to ship (money-now)
| File | What it is |
|---|---|
| `leadloop-landing.html` | **Open in a browser.** A real-estate landing page, droppable into WordPress. Hero + SMS mockup, cold-lead cost calculator, pricing, FAQ, lead-capture form. Inline TODOs resolved; now carries SMS consent language, a spam honeypot, footer privacy/terms/contact links, and a single `LEADLOOP_WEBHOOK` config point to wire the form to GHL. Pre-publish gate documented in its header comment. |
| `leadloop-ghl-launch-playbook.md` | The build kit: GHL click-path (account, phone + A2P, pipeline, calendar, 5 workflows), full real-estate message library, WordPress→GHL wiring, offer/pricing, and week-1 go-to-market scripts. |
| `leadloop-setup-checklist.md` | **Print this.** The tick-box execution version of the playbook — Day 0 → first customer, plus a pre-publish gate for the landing page. |
| `leadloop-fulfillment-runbook.md` | **The ops SOP.** What you do from order → live customer across **two entry paths** — Path A "Enroll Now" (self-serve: pay → intake → provision) and Path B "Strategy Session" (talk-first: qualify/close → enroll link → provision). Covers agreement + SMS-consent, intake, provision from Snapshot, A2P submit (the clock), per-customer customization, QA go-live gate, handoff, and month-1. Includes a **Scope & boundaries** section (included vs change-order, turnaround SLA), **Workflow G — Prospect Nurture (session → enroll)** copy, a per-order timeline (both paths), and a per-vertical (real estate / insurance / legal) differences table. |
| `leadloop-client-intake-form.md` | **Send to each new customer.** The copy-pasteable onboarding questionnaire (business identity, vertical, brand voice, lead sources, calendar, phone, compliance, assets, sign-offs) so setup from the Snapshot takes ~30 min. Six 🔴 fields are blocking (needed to provision + start A2P). Path A customers get it auto-sent on payment (Payment sign-off pre-satisfied); Path B pays at/after the call. |
| `leadloop-service-agreement-TEMPLATE.md` | **⚠️ TEMPLATE — NOT LEGAL ADVICE, needs attorney review before use.** The customer-facing service agreement (Stage 2 of the runbook) — scope/included vs change-order, fees + the 14-day guarantee as a service credit, the SMS consent warranty + sender-of-record + TCPA/CASL language, indemnification, liability cap, and a regulated-segment (legal/insurance) sign-off addendum. Encodes the runbook's "Scope & boundaries" and "Compliance & liability posture" sections contractually. |

---

## The short version

- **Winner: LeadLoop** — an automated lead follow-up / missed-call text-back engine. Scores #1 on the rubric and is the fastest to revenue. Real-estate agents are the beachhead.
- **Build it on GoHighLevel (GHL) + WordPress now**, migrate to the AIBizConnect app later. This makes money while the app matures.
- **RedTape Radar** (compliance calendar) is the strongest second product; **PriceGuard** (margin calculator) ships as a free lead magnet.

## Status / next steps
- Research, ideas, scorecard, landing page, and GHL playbook: **done** (in this folder).
- **Review pass (2026-07-06):** research re-verified — MBO independent-market claims promoted ◑→✅ (three independent sources), client-acquisition pain corroborated ◑→◑+. Landing page finished: SMS-consent language + honeypot + privacy/terms/contact links added, form wired to a single `LEADLOOP_WEBHOOK` config point, guarantee wording aligned to playbook §5. Added `leadloop-setup-checklist.md` (printable execution list).
- **Landing page pre-publish gate (still requires you):** set `LEADLOOP_WEBHOOK`, create `/privacy` + `/terms` pages, confirm pricing + contact number. See the file's header comment.
- **To let Claude touch GHL directly:** add `*.leadconnectorhq.com`, `*.gohighlevel.com`, `*.msgsndr.com` to the environment's **Custom** network allowlist (keep the default package-manager list checked), then create a GHL **Private Integration Token** as an env var. Until then, GHL is reachable only via the Zapier connector — and the actual build (sub-account, A2P, calendar connect) is hands-on-keyboard yours regardless.
