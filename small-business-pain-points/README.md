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
| `leadloop-landing.html` | **Open in a browser.** A real-estate landing page, droppable into WordPress. Hero + SMS mockup, cold-lead cost calculator, pricing, FAQ, lead-capture form. `TODO` markers flag the spots to fill (pricing, calendar link, form webhook). |
| `leadloop-ghl-launch-playbook.md` | The build kit: GHL click-path (account, phone + A2P, pipeline, calendar, 5 workflows), full real-estate message library, WordPress→GHL wiring, offer/pricing, and week-1 go-to-market scripts. |

---

## The short version

- **Winner: LeadLoop** — an automated lead follow-up / missed-call text-back engine. Scores #1 on the rubric and is the fastest to revenue. Real-estate agents are the beachhead.
- **Build it on GoHighLevel (GHL) + WordPress now**, migrate to the AIBizConnect app later. This makes money while the app matures.
- **RedTape Radar** (compliance calendar) is the strongest second product; **PriceGuard** (margin calculator) ships as a free lead magnet.

## Status / next steps
- Research, ideas, scorecard, landing page, and GHL playbook: **done** (in this folder).
- **To let Claude touch GHL directly:** add `*.leadconnectorhq.com`, `*.gohighlevel.com`, `*.msgsndr.com` to the environment's **Custom** network allowlist (keep the default package-manager list checked), then create a GHL **Private Integration Token** as an env var. Until then, GHL is reachable only via the Zapier connector.
