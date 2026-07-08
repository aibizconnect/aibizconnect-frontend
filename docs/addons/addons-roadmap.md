# AIBizConnect — Growth Add-Ons Suite: architecture & roadmap

**The vision:** a suite of marketing/growth add-ons (SEO & geo ranking, keyword tools, social planner, social post creator, Google Ads, Meta Ads, …) that customers switch on from **one account**. Ship the easy ones now; mark the hard ones **Coming soon**.

---

## 1. The single point of registration (your question, answered)

**Yes — repurpose `aibizconnect.app` as the one account + dashboard hub.** It already has what a "single point of registration" needs, so this is the *least* work, not the most:

- **One auth:** Supabase (already live — auth, RLS, multi-tenant).
- **One billing:** Stripe (already live), with per-add-on entitlements.
- **One dashboard:** the app shell; each add-on is a module, not a separate product.

### What to do with the subdomains
You have `SEO.aibizconnect.ca` and `rank.aibizconnect.ca`. **Don't** give them their own logins. Two clean options:

| Option | How | When |
|---|---|---|
| **A. Marketing funnels (do now, cheap)** | `seo.` / `rank.` are *landing pages* that explain the tool and CTA → **one signup at `aibizconnect.app`**. No new auth. | Now |
| **B. Authenticated app routes (later)** | The tools live *inside* the app (`aibizconnect.app/tools/seo`, `/tools/rank`); the subdomains reverse-proxy or 301 to those routes, sharing the Supabase session (SSO). | Phase 2 |

**Recommendation:** Option A now (subdomains → funnels → single signup), migrate to B as each tool ships inside the app. Either way there is exactly **one registration**, at `aibizconnect.app`.

> Brand note: `aibizconnect.app` is the product; `aibizconnect.ca` is corp. Keep the app where it already works. If you want `.ca` consistency later, add `app.aibizconnect.ca` as an alias to the same Vercel app — no rebuild.

### The mechanism for "add-ons" + "coming soon"
- An **entitlements** concept (per-tenant flags: which add-ons this customer has). You already have feature flags in `lib/flags.ts` (`FUNNELS_ENABLED`, `IDX_ENABLED`) — extend the same pattern per add-on.
- **"Coming soon" is just a status** on the catalog card: `available | beta | soon`. No tool required to ship the *shelf*; the shelf sells the roadmap.

---

## 2. Feasibility triage — what we can do NOW vs Coming soon

The deciding factor is whether we **already own the data source** (inventory rule: don't buy a new one). We do, for the first three.

| Add-on | Uses what we already own | Effort | Status |
|---|---|---|---|
| **SEO & Geo ranking report** | **Semrush** (MCP) for rankings/positions + **Serper/Brave/Bing** for SERP checks | Low–Med | ✅ **Now** |
| **Keyword research & reporting** | **Semrush** `keyword_research` + trends | Low | ✅ **Now** |
| **Social post creator** | **OpenAI/Gemini** (copy) + **Canva** (design) + **Pixabay** (images) | Low | ✅ **Now** |
| **Social media planner / scheduler** | **Meta** integration + **Zapier**; or GHL's social planner | Med (scheduling/state) | 🟡 **Beta / soon** |
| **Google Ads manager** | *No connector owned* — needs Google Ads API + OAuth + spend controls | High | 🔴 **Coming soon** |
| **Meta Ads manager** | Meta integration exists, but ads *management* (budgets, creatives, spend) is heavy | High | 🔴 **Coming soon** |

**Nothing new to buy for the three green rows.** Semrush, Canva, Pixabay, Serper/Brave/Bing, OpenAI, Gemini are all already in the stack.

---

## 3. Build sequence

- **Phase 0 — the shelf (now, near-zero risk):** publish the **add-ons catalog** (`addons-catalog.html`) showing every tool with Available/Coming-soon badges and a single "Create account" CTA → `aibizconnect.app`. This makes the suite *visible and sellable* today and answers "single point of registration + coming soon" in one surface.
- **Phase 1 — ship the three green add-ons** as app modules, gated by entitlements:
  1. **Keyword report** (thinnest — Semrush in, formatted report out).
  2. **SEO/Geo ranking report** (Semrush positions + local pack via Serper).
  3. **Social post creator** (LLM copy + Canva render + Pixabay image).
- **Phase 2 — social planner** (scheduling/calendar + Meta publish) → beta.
- **Phase 3 — Google/Meta Ads managers** (real integrations, spend safety) → the "coming soon" graduates.

Each phase reuses the same auth/billing/dashboard — so the marginal cost per add-on is the tool logic only, not a new product.

---

## 4. Open items for you
- Confirm the canonical registration domain: **`aibizconnect.app`** (recommended) or add `app.aibizconnect.ca` alias.
- Where do `seo.` / `rank.` point today (DO droplet? Vercel? a separate build)? Determines whether we point them at funnels (Option A) or app routes (Option B).
- Priority order for Phase 1 — I recommend Keyword report first (fastest to a visible result from Semrush).
