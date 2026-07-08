# LeadLoop — Contact Export & Reactivation-List Guide

**Goal:** pull your existing contacts out of wherever they live, into **one clean CSV**, then import them into your GHL sub-account and run the reactivation sequence (playbook §3.7 / Workflow E). Reactivating people you already know is the **fastest, cheapest source of real appointments** — no ad spend, no traffic.

> Menu labels on these platforms shift over time. I describe *what to look for* ("an Export / Download CSV action"), which stays stable even when the exact button moves.

---

## 0. The target format (normalize everything to this)

Whatever you export, massage it into these columns before importing to GHL. A spreadsheet (Google Sheets / Excel) is fine.

| Column | Notes |
|---|---|
| `first_name` | Split full names if the source only has one field. |
| `last_name` | |
| `phone` | **Format as E.164: `+1XXXXXXXXXX`** (GHL + SMS need this). Drop anything without a valid mobile — you can't text a landline. |
| `email` | Keep even if you have a phone; email is the fallback channel. |
| `source` | Where it came from, e.g. `boldtrail`, `myrealpage`. Useful for reporting. |
| `last_activity` | Date of last contact/transaction if available — **critical for compliance** (see §7). |
| `tags` | Set them all to `reactivation-2026-07` so you can target just this batch. |
| `notes` | Anything useful (property interest, past deal, etc.). |

---

## 1. BoldTrail (formerly kvCORE)

1. Log in → open **Smart CRM / Contacts**.
2. Filter to the segment you want (e.g. leads with a phone, added in the last 2 years). Filtering *before* export keeps the list compliant and relevant.
3. **Select all** in the filtered view → open the **mass-action / "…" menu** → choose **Export** (downloads or emails a CSV).
4. If you don't see Export, your seat may lack the permission — a **team lead / broker admin** account can export. Ask them to run it.

> kvCORE/BoldTrail sometimes limits export on individual agent seats by design. The admin/office account is the reliable path.

## 2. MyRealPage

1. Log in to the **admin/back-office** → **Leads / Contacts** section.
2. Look for **Export** (usually top of the leads list) → **CSV**.
3. If it only exports the current page, increase the page size or export per-status, then stack the CSVs in one sheet.

## 3. GoHighLevel (contacts already in a sub-account)

1. Sub-account → **Contacts**.
2. (Optional) apply a **Smart List filter** first.
3. **Select all** → **More / "…" → Export** → GHL emails you the CSV.
4. *Programmatic option:* once your `GHL_PIT` + `GHL_LOCATION_ID` are set, I can pull this straight to CSV with the smoke-test script (I'll add a `contacts:export` command) — no clicking.

## 4. HubSpot (connected in your Zapier — evaluate for overlap)

1. **Contacts → Contacts** → top-right **Export**.
2. Choose the properties (at least name, phone, email, last activity) → **CSV** → HubSpot emails it.

## 5. Google Contacts / Gmail

1. Go to **contacts.google.com**.
2. Left menu → **Export**.
3. Choose **Google CSV** (or **Outlook CSV**) → download. Good for your personal sphere that never made it into a CRM.

## 6. Mailchimp (past marketing audience)

1. **Audience → All contacts**.
2. **Export Audience** → download the CSV when it's ready.
3. These are email-first; many won't have mobile numbers — use for the email touches, not SMS.

## 7. ⚠️ Compliance — read before you send (Canada is strict)

You are texting/emailing real people; **CASL (Canada) and A2P/CTIA rules apply.** This is informational, not legal advice — confirm with your brokerage/lawyer.

- **Only message people you have a real relationship with** — past clients, past inquiries, your sphere. Under CASL, **implied consent from an inquiry/transaction generally lasts ~2 years** from that last activity (that's why `last_activity` matters — drop anyone older unless you have express consent).
- **Never** text a **purchased, scraped, or shared** list. That's the fast way to a complaint and a carrier ban.
- **Every message must** identify who you are and offer a **clear opt-out** ("Reply STOP to opt out"). The playbook messages already include this on the first touch.
- **Honor STOP / unsubscribe instantly** — GHL does this automatically when you use its SMS.
- **Your A2P campaign registration must match** what you actually send (lead follow-up / reactivation). Don't send content outside the registered use case.
- **Landlines can't receive SMS** — filter to mobiles for the text sequence; use email for the rest.

**The safe, high-ROI play:** a filtered list of *your own* past leads/clients from the last ~2 years, with valid mobiles, tagged `reactivation-2026-07`. That's defensible and it's exactly the group most likely to book.

---

## 8. Import into GHL and launch

1. Sub-account → **Contacts → Import / Add → Upload CSV**.
2. **Map columns** to GHL fields (first name, last name, phone, email). Map your `tags` column to Tags (or apply the tag `reactivation-2026-07` to the whole import).
3. Confirm phones imported as **`+1…`** — fix formatting in the sheet first if not.
4. Add contacts to **Workflow E — Database Reactivation** (playbook §2.5 / messages §3.7), or trigger it by the `reactivation-2026-07` tag.
5. Start small: **run the first 25–50** to watch replies and tune wording before blasting the whole list.

---

## 9. What I can do from here (once your token is set)

- Add a **`contacts:export`** command to `scripts/ghl-smoke.mjs` to pull your GHL contacts to CSV programmatically.
- **De-dupe and normalize** a CSV you paste/export (merge sources, fix phone formatting, split names, flag landlines, drop >2-year-old records).
- Draft any **extra reactivation message variants** for a specific segment (past buyers vs. past sellers vs. cold sphere).

Just say which.
