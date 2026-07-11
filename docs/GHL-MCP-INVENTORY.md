# GHL Integration & MCP Inventory

> **Purpose:** durable, session-independent record of how AIBizConnect can talk to
> GoHighLevel (GHL) programmatically — what's actually connected, what each path
> can and cannot do, and the strategic options for making the app "run on GHL."
> Committed to the repo so **every Claude session reads it from `CLAUDE.md` context**
> instead of re-discovering it live.
>
> _Verified: 2026-07-11. Re-verify the "Live state" section whenever connectors change._

---

## 0. TL;DR (read first)

- There are **three distinct ways** to integrate GHL. They have wildly different
  capability ceilings. Do not conflate them.
- **As of 2026-07-11, only the thinnest path (Zapier "LeadConnector") is reachable
  from a Claude session**, and it still **needs account authentication**.
- A **GHL-native MCP** was reportedly installed on a GHL account the morning of
  2026-07-11, but it is **NOT visible to this session's connector set** (see §4).
  Until it appears in `ListConnectors`, no session can use it.
- **The website editor cannot be "replaced by GHL's editor" via any API/MCP.**
  GHL's funnel/site builder is not a programmatic surface. Your editor options are
  (a) keep ours, or (b) embed GHL's builder UI via white-label — not "call GHL's
  editor from our UI." See §3.

---

## 1. The three integration paths & their ceilings

| Path | What it is | Read? | Write? | Powers a CRM UI? | Powers the editor? | Effort |
|---|---|---|---|---|---|---|
| **A. Zapier "LeadConnector"** | GHL's Zapier app, surfaced as MCP actions | 1 action | 5 actions | ❌ no list/search/conversations | ❌ none | tiny (clicks) |
| **B. GHL REST API v2** (Marketplace OAuth app) | GHL's real programmatic API | full | full | ✅ contacts, conversations, calendars, opportunities, payments | ⚠️ funnels/sites only shallowly | medium (build an OAuth app) |
| **C. White-label / SaaS-mode + SSO embed** | Resell GHL itself, branded as AIBizConnect | n/a (you use GHL's UI) | n/a | ✅ GHL's own CRM UI | ✅ GHL's own builder UI | low-code, but you're embedding GHL, not building |

**Rule of thumb:**
- Want **our UI, GHL data** → Path **B** (REST API v2). This is the only "our app,
  fully functional on GHL" route.
- Want **least code, fastest to money**, and you're OK showing GHL's UI under our
  brand → Path **C** (white-label). This is what `leadloop-ghl-launch-playbook.md`
  assumes.
- Want **automation triggers only** (push a lead into GHL, kick a workflow) →
  Path **A** is enough, and nothing more.

---

## 2. Path A — Zapier "LeadConnector" (VERIFIED live, needs auth)

The only GHL path currently attached to a Claude session. Enabled via Zapier
(`discover_zapier_actions` → app **LeadConnector**, `selected_api: HighLevelCLIAPI`).

**Full action set — this is the ceiling (5 write, 1 read, 0 search):**

| Action key | Tool | What it does | Key params |
|---|---|---|---|
| `add_update_contact` | write | Upsert a contact | name, phone, email, tags, source, notes, company, DOB, address |
| `add_update_opportunity` | write | Upsert an opportunity into a pipeline+stage | + `pipelineId`, `stageId` (dynamic), `assignedTo` |
| `campaign` | write | Add a contact into a GHL workflow/campaign | `campaign_id` (dynamic workflow id), contact fields, `eventStartTime` |
| `campaign_stop_all` | write | Remove a contact from ALL campaigns | phone/email/name |
| `task` | write | Create a task for a user | `title`, `body`, `dueDate`, `assigned_to`, contact ref |

**Hard limits of Path A:**
- **No way to LIST or SEARCH** contacts/opportunities/conversations. It's a one-way
  push pipe. You cannot render a contact list, an inbox, or a calendar from it.
- No conversations / messaging / calendar / payments read or write.
- Cannot touch websites, funnels, or the editor at all.
- **Auth status: NOT authenticated.** A GHL account must be connected to the Zapier
  LeadConnector before any of these execute. (`needs_auth: true`.)

**Verdict:** good for "when X happens in AIBizConnect, push the lead/opportunity into
GHL and start a follow-up workflow." Useless as a backend for a CRM or editor UI.

---

## 3. Path B — GHL REST API v2 (the real "our UI on GHL data" route)

Not an MCP — a Marketplace OAuth app you build. This is the surface that can actually
back the AIBizConnect CRM with GHL as source of truth. Documented here as the target
even though it isn't wired yet.

**What GHL API v2 exposes (well-supported):**
- Contacts (full CRUD, search, tags, custom fields, notes, tasks)
- Conversations (SMS/email/IG/FB threads, send + receive) — the inbox
- Calendars & appointments (CRUD, availability, free/busy)
- Opportunities & pipelines (CRUD, stages)
- Payments (invoices, orders, transactions, products)
- Workflows (enrollment; the visual builder itself is not API-authorable)
- Users, locations (sub-accounts), custom values/fields

**What GHL API v2 does NOT give you (the editor gap):**
- **The funnel/website builder is not a meaningful API surface.** You can list/create
  funnels and pages at a coarse level, but you **cannot drive GHL's drag-drop editor
  from our UI**, and there is no "render GHL's editor inside AIBizConnect" API. If the
  goal is "replace our editor with GHL's editor," the only real mechanism is Path C
  (embed GHL's builder via white-label), not the API.

**Implication for the CLAUDE.md parity work:** our native, Supabase-backed builder
(`docs/editor-spec.md`, `components/editor`, `components/builder`, `components/sites`)
remains the right home for the editor regardless of GHL strategy. GHL does not
replace it.

---

## 4. Live state — what a session can actually see (2026-07-11)

Verified via `ListConnectors` (twice, incl. after a session resume):

**Connected & usable in-session (15):** Bitly, Canva, Gmail, Google Calendar,
Google Drive, Granola, Intuit Mailchimp, Malwarebytes, Semrush, Send, Zapier,
Zoom, GitHub (+ HeyGen / HyperFrames / Microsoft 365 present but unauthenticated/off).

**GoHighLevel / HighLevel-native MCP:** ❌ **NOT present.** Searched the connector
registry and the org connector list for `GoHighLevel`, `HighLevel`, `GHL`,
`LeadConnector` — zero native-MCP results. The GHL MCP installed on a GHL account
the morning of 2026-07-11 is **not attached to the org/environment running these
sessions.**

**Most likely reasons (and the fix):**
1. **Wrong org/account.** The MCP was connected on the "ABC" or "ABR" GHL account,
   but this session runs under a different claude.ai org. → Connect the GHL MCP on
   the **same org** these sessions run under.
2. **Toggled off "in this chat."** → Enable GoHighLevel in the chat's connector
   settings, then start a fresh message.
3. **Session predates the install.** New MCPs don't hot-load. → Start a new session
   after connecting.

**Until the native MCP shows up in `ListConnectors` with `enabledInChat: true`,
§5 below cannot be filled in and no session can use it.**

---

## 5. GHL-native MCP inventory — PENDING (fill when visible)

> When the GoHighLevel-native MCP appears in `ListConnectors`, complete this table:
> every tool name, read/write, scope, and required params. Until then this section is
> intentionally empty — do not fabricate it.

| Tool | R/W | Scope | Notes |
|---|---|---|---|
| _pending — native MCP not yet reachable_ | | | |

---

## 6. Recommended decision (unresolved — needs Ali)

The strategic fork that determines all downstream work:

- **Embed / white-label GHL (Path C):** fastest, least code; AIBizConnect becomes the
  brand wrapper and you use GHL's own CRM + editor UI. Matches the LeadLoop playbook.
- **GHL as backend, our UI (Path B):** keep the AIBizConnect UI, swap our Supabase CRM
  data layer for live GHL via API v2. Big rebuild of the CRM data layer; editor stays
  ours (GHL can't back it).
- **Two-way sync, keep both (Path A + our native CRM):** lowest risk; our native CRM +
  editor stay authoritative, we push contacts/opportunities to GHL for its SMS/
  automation engine. Path A already covers the push side.

No architecture is committed until Ali picks one. Once picked, supersede the
GHL-parity build plan in `docs/GHL-PARITY-AUDIT.md` accordingly.

---

## 7. Cross-references
- `docs/GHL-PARITY.md`, `docs/GHL-PARITY-AUDIT.md` — the native rebuild (what we'd
  stop duplicating if we go Path B/C).
- `docs/editor-spec.md` — our editor (survives all paths; GHL can't replace it).
- `small-business-pain-points/leadloop/leadloop-ghl-launch-playbook.md` — the Path C
  white-label playbook.
- `docs/INVENTORY.md` §7 — GHL listed as "Primary engine for LeadLoop."
