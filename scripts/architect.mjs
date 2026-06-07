// Architect relay — a local, API-backed "architect peer" for AIBizConnect.
//
// Replaces the flaky browser relay to Microsoft Copilot with a real API loop. Claude (the
// Builder) sends a message; this script calls Gemini (default) or OpenAI with an architect
// persona + persistent conversation history, and prints the architect's reply. No browser.
//
// Usage (run with the env file so the API key loads; key is never printed):
//   node --env-file=.env.local scripts/architect.mjs --file .architect/inbox.md
//   node --env-file=.env.local scripts/architect.mjs "inline short message"
//   echo "message" | node --env-file=.env.local scripts/architect.mjs
//
// State lives in .architect/:
//   system.md       — the architect persona/brief (edit to steer it; auto-created if missing)
//   history.json    — full conversation (Builder <-> Architect), so context persists
//   last-reply.md   — the most recent architect reply (also printed to stdout)

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";

const DIR = ".architect";
const SYSTEM_PATH = `${DIR}/system.md`;
const HISTORY_PATH = `${DIR}/history.json`;
const LAST_REPLY_PATH = `${DIR}/last-reply.md`;

const DEFAULT_SYSTEM = `You are the ARCHITECT for AIBizConnect — a multi-tenant Next.js (App Router) + Supabase
SaaS that builds AI-generated business websites merged with CRM, lead-gen, ads/pixel, and
follow-up automation (GoHighLevel-parity-or-better, real-estate flavored). You are the peer
architect to "the Builder" (Claude Code), who implements your specs as real TypeScript in the
codebase. You replaced a previous architect (Microsoft Copilot); match its decisive style.

YOUR JOB: produce concrete, implementation-ready specs — data models, JSON contracts, SQL
migrations, step pipelines, and Supervisor verification schemas. Be decisive. Prefer exact
field lists, table definitions, and JSON shapes over prose. Number your rulings.

HARD CONSTRAINTS you must always respect:
- Drafts only: never design auto-publish, auto-send, or auto-charge. Metering is fine; billing
  is a separate gated step.
- Every brand/page/media/CRM write is scoped by (tenant_id, website_id). Never tenant-wide.
- The app uses a Supabase service-role client server-side; tenant scoping is enforced in code.
- Platform team tiers: superadmin > admin > staff (env allowlists + app_metadata.platform_role).
- A platform_audit_log table (migration 0028) already exists for sensitive events.
- The website-creation pipeline is AI-first: analyze existing site/socials -> pre-fill wizard ->
  tenant confirms -> reserve subdomain -> lean build (Home+Contact+Offer) + CRM/funnel ->
  editor -> Publish->Cloudflare. Count ONLY real main pages (ignore product/listing/blog-post/
  cart/system pages). Extract -> repurpose into atomic blocks -> propose a better page tree.
- Every step has a Supervisor verification gate (completeness, accuracy, consistency, business
  logic, brand alignment, structural integrity, no hallucinations, correct websiteId scoping).

When asked for "the data model" or "the JSON contract", output the actual schema (SQL + JSON),
not a description of it. Keep replies focused and skimmable.`;

function ensureSetup() {
  if (!existsSync(DIR)) mkdirSync(DIR, { recursive: true });
  if (!existsSync(SYSTEM_PATH)) writeFileSync(SYSTEM_PATH, DEFAULT_SYSTEM);
  if (!existsSync(HISTORY_PATH)) writeFileSync(HISTORY_PATH, "[]");
}

function readMessage() {
  const argv = process.argv.slice(2);
  if (argv[0] === "--file") {
    if (!argv[1]) { console.error("Usage: --file <path>"); process.exit(1); }
    return readFileSync(argv[1], "utf8").trim();
  }
  if (argv.length && argv[0] !== "-") return argv.join(" ").trim();
  // stdin fallback
  try { return readFileSync(0, "utf8").trim(); } catch { return ""; }
}

async function callGemini(system, history, key) {
  const model = process.env.ARCHITECT_MODEL || process.env.AI_PLAN_MODEL || "gemini-2.5-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
  const contents = history.map((m) => ({ role: m.role === "architect" ? "model" : "user", parts: [{ text: m.text }] }));
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: system }] },
      contents,
      generationConfig: { temperature: 0.4, maxOutputTokens: 8192 },
    }),
  });
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${(await res.text()).slice(0, 400)}`);
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") ?? "";
  if (!text) throw new Error("Gemini returned no text.");
  return { text, model };
}

async function callOpenAI(system, history, key) {
  const model = process.env.ARCHITECT_MODEL || "gpt-4o";
  const messages = [{ role: "system", content: system },
    ...history.map((m) => ({ role: m.role === "architect" ? "assistant" : "user", content: m.text }))];
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model, messages, temperature: 0.4 }),
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${(await res.text()).slice(0, 400)}`);
  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content ?? "";
  if (!text) throw new Error("OpenAI returned no text.");
  return { text, model };
}

async function main() {
  ensureSetup();
  const message = readMessage();
  if (!message) { console.error("No message provided (use --file <path>, an arg, or stdin)."); process.exit(1); }

  const system = readFileSync(SYSTEM_PATH, "utf8");
  const history = JSON.parse(readFileSync(HISTORY_PATH, "utf8"));
  history.push({ role: "builder", text: message });

  const gKey = process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY;
  const oKey = process.env.OPENAI_API_KEY;

  let reply, used;
  try {
    if (gKey) { const r = await callGemini(system, history, gKey); reply = r.text; used = `gemini:${r.model}`; }
    else if (oKey) { const r = await callOpenAI(system, history, oKey); reply = r.text; used = `openai:${r.model}`; }
    else throw new Error("No GOOGLE_AI_API_KEY / GEMINI_API_KEY / OPENAI_API_KEY in env.");
  } catch (e) {
    if (gKey && oKey) { // Gemini failed -> try OpenAI
      const r = await callOpenAI(system, history, oKey); reply = r.text; used = `openai:${r.model} (gemini failed: ${e.message})`;
    } else throw e;
  }

  history.push({ role: "architect", text: reply });
  writeFileSync(HISTORY_PATH, JSON.stringify(history, null, 2));
  writeFileSync(LAST_REPLY_PATH, reply);

  console.log(`\n=== ARCHITECT (${used}) ===\n`);
  console.log(reply);
  console.log(`\n=== end (turn ${history.filter((m) => m.role === "architect").length}) ===`);
}

main().catch((e) => { console.error("Architect relay failed:", e.message); process.exit(1); });
