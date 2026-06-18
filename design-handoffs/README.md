# Design handoffs — Claude Design → GitHub → build

This folder is the **intake** for the two-way loop: you design pages in **Claude Design**, push the
export here, and Claude Code builds them into the app as native, on-brand, wired pages.

Direction note: `code → Claude Design` works via Claude Design's GitHub integration (it reads this repo +
`DESIGN.md`). `Design → code` runs through THIS folder, because the programmatic connector (`/design-sync`)
needs a Claude Code login with design scopes, which the current runtime can't grant.

## How to hand off a page (your steps)
1. In Claude Design, build the page (it'll be on-brand — it reads our `DESIGN.md` + tokens).
2. **Export** the project ("handoff to Claude Code" / ZIP).
3. Unzip it into a named subfolder here: `design-handoffs/<slug>/` (e.g. `design-handoffs/pricing/`).
   Keep the `*.dc.html` (the primary design), the `_ds/.../tokens/*.css`, the `README.md`, and `assets/`.
   You can skip the multi‑MB inlined `*.html` render — it's not needed.
4. Commit + push, and tell me the slug.

## What I do when it lands (my steps)
1. `git pull`, read `<slug>/README.md` + the `*.dc.html` in full + the token CSS.
2. Translate it to **our native sections** (per the native-elements rule) — never paste raw HTML into the tree.
3. Apply the ABC tokens, wire CTAs → `/start`, forms → CRM; build it as a page on the platform tenant
   (or as app components if it's product UI).
4. Build green, push, give you the live URL.

## Conventions
- One subfolder per page/flow. Reuse the same slug to send a revision (I diff against what's built).
- Brand/theme already lives in `app/abc-design-system.css` (scoped `.abc-ds`) and `DESIGN.md` — designs
  should come out matching; I reconcile any drift to those tokens.
- Parity target for the public site: the live aibizconnect.app (Platform · CRM · Websites & Funnels ·
  AI Builder · Automations · Consumer Portal · Marketplace · Templates · Pricing · Solutions-by-industry ·
  Resources · Company). Send pages in whatever order you want them built.
