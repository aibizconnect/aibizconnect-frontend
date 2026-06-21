# Occasions Widget — GHL funnel build guide

A free **lead-gen tool**: a website owner registers their site, pastes one `<script>` line, and gets
festive holiday/sale banners + animations on their site automatically. We capture the **lead
(name / email / domain)** in GHL (and mirror it to our CRM). The widget only shows on a **registered
domain** — unregistered sites render nothing.

The **funnel lives in your GHL site (aibizconnect.ca)**. The **widget + backend live in our app**
(GHL can't serve our JS). This doc is the GHL build; the app side is already deployed.

## One-time setup (our side)
- Set env var **`OCCASIONS_WIDGET_SECRET`** to a long random string (the shared secret GHL sends).
- Apply migration **`supabase/APPLY_0084.sql`**.

## Endpoints (our app — base = the app host, later aibizconnect.ca)
| Purpose | Method | URL |
|---|---|---|
| Register (GHL webhook) | POST | `/api/occasions-widget/register` |
| Get-your-snippet (thank-you) | GET page | `/tools/occasions/snippet?d=<domain>` |
| Manage occasions (configurator) | GET page | `/tools/occasions/manage?k=<key>` |
| Embed script (the snippet) | GET | `/api/occasions-widget/embed?k=<key>` |
| Active feed (used by the script) | GET | `/api/occasions-widget/active?k=<key>&host=<host>` |

## Build the funnel in GHL
1. **Landing page** (reuse your SEO/GEO tool's header/footer): headline + "Add free holiday banners &
   animations to your website in 60 seconds." CTA → the form.
2. **Form** — 3 fields, all required:
   - Full name → maps to contact **Name**
   - Email → **Email**
   - **Website URL** (a custom field, e.g. `website` / `domain`)
3. **Automation / Workflow** on form submit:
   - Action **"Custom Webhook"** → `POST {APP}/api/occasions-widget/register`
     - Body (JSON):
       ```json
       { "name": "{{contact.name}}", "email": "{{contact.email}}",
         "domain": "{{contact.website}}", "secret": "<OCCASIONS_WIDGET_SECRET>" }
       ```
     - The response is `{ key, domain, snippet, manageUrl }`. (Optional: map `key`/`snippet` to
       contact custom fields if you want them in GHL emails.)
4. **Thank-you page / redirect** → send them to:
   `{APP}/tools/occasions/snippet?d={{contact.website}}`
   This page shows their copy-paste snippet + "Open my Occasions settings" → the configurator. (It
   looks the registration up by domain, so you don't have to wire the webhook response back into GHL.)
5. **Welcome email** (recommended) — include the snippet (or just link the thank-you page) + the
   manage link so they can re-find it.

## How the gate works
The pasted `<script>` reads the page's own hostname and asks our `active` endpoint. We render the
configured occasions **only if** that host matches the registered domain and the account is active —
otherwise nothing. (Pasting the snippet already proves they control the site, so v1 needs no extra
domain verification; a `verified` flag exists to tighten this later.)

## v1 scope
- Renders: **banners** (positioned/styled), **fly-across airplane** banner, and **emoji animations**
  (snow, hearts, confetti, lanterns, leaves, butterflies, petals, shamrocks, pumpkins).
- New registrations auto-enable the **current holiday** so the widget shows value immediately.
- Owners customize everything at `/tools/occasions/manage?k=…`.
- Not yet ported to the embed: santa-sprite, fireworks, sun-rays (Phase 2).
