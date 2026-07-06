# The AIBizConnect Idea Scorecard — reusable framework

**Purpose:** a single, repeatable way to triage any product idea — so we compare bets apples-to-apples, defend the pick, and reuse the same method on the *next* idea instead of re-arguing from scratch. The interactive version lives in `idea-comparison.html` (adjust weights live, add new ideas).

**How to use it (3 steps):**
1. Score the idea **1–5 on each of the 7 criteria** using the anchors below.
2. The weighted total = Σ(score × weight). Higher = build sooner.
3. Add it as a row in `idea-comparison.html` and it slots into the ranking automatically.

---

## The 7 criteria & weights

Weights reflect the brief's explicit priorities — *fast, easy, cheap to us* — balanced against *will it actually sell*. Weights sum to 100%. They are **defaults**; the HTML tool lets you re-weight live for a given strategic moment.

| # | Criterion | Weight | What it measures | Higher score = |
|---|---|---|---|---|
| 1 | **Build speed** | 20% | Calendar time to a shippable MVP | Faster to ship |
| 2 | **Implementation ease** | 15% | Technical simplicity / few moving parts / low integration risk | Simpler |
| 3 | **Cost to us** | 20% | Infra + maintenance + ongoing data upkeep | Cheaper |
| 4 | **Willingness to pay** | 15% | Evidence users already pay to solve this | Stronger $ signal |
| 5 | **Market size** | 10% | Size of the addressable, reachable segment | Bigger |
| 6 | **Evidence strength** | 10% | How well research verifies the pain (✅ vs ◑) | Better-proven |
| 7 | **Platform fit** | 10% | Reuse of AIBizConnect assets + funnel into core product | More leverage |

*Design note: criteria 1–3 (build speed, ease, cost) carry 55% combined — deliberately, because the brief prioritizes "fast, easy, very little cost to us." Criteria 4–7 (55→) keep us from shipping something cheap that nobody wants.*

---

## Scoring anchors (1–5) — use these to stay objective

**1 · Build speed** — *time to shippable MVP*
- 5 = ≤2 weeks · 4 = ~3 wks · 3 = ~4 wks · 2 = ~6 wks · 1 = 8+ wks

**2 · Implementation ease** — *complexity / integration risk*
- 5 = pure calc + storage, no external integrations
- 4 = storage + scheduled jobs (cron/email)
- 3 = reuses existing internal engine (e.g. our CRM)
- 2 = one external integration (email/SMS/payment)
- 1 = multiple integrations or bank/gov data feeds

**3 · Cost to us** — *infra + maintenance + data upkeep*
- 5 = negligible, no data to maintain
- 4 = minor infra, static reference data
- 3 = modest infra or light per-region content
- 2 = ongoing data maintenance (e.g. rules per province/year)
- 1 = heavy infra or continuous data/compliance upkeep

**4 · Willingness to pay** — *proven $ signal from research*
- 5 = users already pay a measured $ for this exact job
- 4 = strong adjacent spend evidence
- 3 = clearly valued, price unproven
- 2 = "nice to have," soft signal
- 1 = users expect it free

**5 · Market size** — *addressable, reachable segment*
- 5 = millions, both CA + US · 4 = large national · 3 = large vertical/regional · 2 = niche · 1 = very narrow

**6 · Evidence strength** — *research verification*
- 5 = ✅ 3–0 verified, multiple primary sources
- 4 = ✅ verified, single strong source
- 3 = ◑ cited, strong primary source
- 2 = ◑ cited, single/soft source
- 1 = inferred, no direct source

**7 · Platform fit** — *reuse + funnel leverage*
- 5 = reuses core engine AND is a natural funnel into AIBizConnect
- 4 = strong reuse or strong funnel
- 3 = some reuse
- 2 = standalone, little reuse
- 1 = off-strategy

---

## Scores for the current 5 ideas

Scored against the anchors above. (These same numbers drive `idea-comparison.html`.)

| Idea | Build speed | Impl. ease | Cost to us | WTP | Market | Evidence | Platform fit | **Weighted** |
|---|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| **3 · LeadLoop** | 5 | 3 | 4 | 4 | 4 | 3 | 5 | **4.05** |
| **4 · PriceGuard** | 5 | 5 | 5 | 2 | 3 | 3 | 3 | **3.95** |
| **1 · RedTape Radar** | 4 | 4 | 2 | 5 | 4 | 5 | 4 | **3.85** |
| **2 · CashRunway** | 3 | 4 | 4 | 4 | 5 | 3 | 4 | **3.80** |
| **5 · HireQuick** | 3 | 3 | 4 | 3 | 3 | 3 | 3 | **3.20** |

*Weighted = Σ(score × weight) using the default weights above. Recompute live in the HTML tool; re-weighting changes the order.*

**Read the result — and note where judgment overrides raw score:**
- **LeadLoop (4.05)** tops it cleanly: fast, high platform leverage, strong pain. Clear #1.
- **PriceGuard (3.95)** ranks #2 *purely because it's the cheapest and fastest to build* — it maxes the three cost-oriented criteria (55% of the weight). But its **willingness-to-pay is a 2** (users expect margin math free/cheap). This is exactly the case where the scorecard informs but shouldn't dictate: PriceGuard is best deployed as a **free acquisition tool**, not a standalone paid product — so we sequence it *after* the two revenue products, as a lead magnet.
- **RedTape Radar (3.85)** is a hair behind on raw score only because its "cost to us" is a 2 (per-province rules upkeep). On the criteria that predict *revenue* — willingness-to-pay (5) and evidence strength (5) — it's the strongest of all five. That's why the recommendation elevates it to the #2 *build* despite the #3 raw score.

This is the framework working as intended: a transparent score, plus documented judgment on top. See the sequenced recommendation in `2026-07-five-app-ideas.md`. Push the "cost to us" weight up in the HTML tool and PriceGuard takes #1 — a useful stress test of "what if cheapness matters most."

---

## Reusing this on future ideas

1. Open `idea-comparison.html`.
2. Click **"+ Add idea"**, name it, score 1–5 per criterion (anchors above).
3. It's ranked instantly against everything else.
4. Adjust weights with the sliders to pressure-test — "does it still win if cost matters most?"
5. Screenshot/share for the decision meeting.

This is the standing triage tool. Every new idea goes through the same 7 criteria, so decisions stay consistent and comparable over time.
