import { parse } from "node-html-parser";
import { llm, stripFences } from "@/lib/agent/llm";

/**
 * Agent KNOWLEDGE intake (D-281): URL scraping (server-side fetch + readable-text
 * extraction) and the AI ASSIST that turns a tenant's plain-language wish ("engage
 * visitors, get their contact info and pain point, book a discovery call") into a
 * structured agent instruction prompt. File uploads (txt/md/csv) are read client-side
 * and arrive as plain snippets — no parser dependencies.
 */

const MAX_CHARS = 6000;

export async function scrapeUrlToSnippet(url: string): Promise<{ ok: true; title: string; content: string; source: string } | { ok: false; error: string }> {
  let u: URL;
  try { u = new URL(url.startsWith("http") ? url : `https://${url}`); } catch { return { ok: false, error: "That doesn't look like a valid URL." }; }
  if (!/^https?:$/.test(u.protocol)) return { ok: false, error: "Only http(s) URLs are supported." };
  try {
    const res = await fetch(u.toString(), { redirect: "follow", signal: AbortSignal.timeout(15000), headers: { "user-agent": "AIBizConnect-KnowledgeBot/1.0" } });
    if (!res.ok) return { ok: false, error: `The page returned ${res.status}.` };
    const html = await res.text();
    const root = parse(html, { comment: false });
    root.querySelectorAll("script, style, noscript, svg, iframe, nav, header, footer").forEach((el) => el.remove());
    const title = root.querySelector("title")?.text?.trim() || u.hostname;
    const body = root.querySelector("main") ?? root.querySelector("article") ?? root.querySelector("body") ?? root;
    const text = body.text.replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
    if (text.length < 80) return { ok: false, error: "Couldn't extract readable text — the page may be JavaScript-rendered. Paste the key content as text instead." };
    return { ok: true, title: title.slice(0, 120), content: text.slice(0, MAX_CHARS), source: `url:${u.hostname}` };
  } catch (e) {
    return { ok: false, error: `Couldn't fetch the page: ${(e as Error).message}` };
  }
}

/** Plain-language wish → structured agent instructions (goals, collect-list, booking flow, guardrails). */
export async function draftAgentInstructions(tenantId: string, role: string, brief: string): Promise<string | null> {
  const raw = await llm.complete({
    system: [
      "You write SYSTEM INSTRUCTIONS for a small business's AI agent (a chat assistant that has real tools: check calendar availability, book appointments, create CRM contacts, save notes).",
      "Convert the owner's plain-language wish into crisp agent instructions with these parts:",
      "GOAL (one line) · CONVERSATION FLOW (numbered: greet → discover need/pain point → collect name, email, phone naturally — never as a form → create the contact and save a one-line note about their need → offer 2-3 concrete appointment slots → book) · STYLE rules (short messages, one question at a time, mirror the visitor's language) · GUARDRAILS (never invent facts or prices; if unsure say so and offer the booking; never promise what the business didn't state).",
      "Write in second person ('You are...'). Max 220 words. Respond as ONE JSON object: {\"instructions\":\"...\"}.",
    ].join("\n"),
    user: `Agent role: ${role}. Owner's wish: ${brief}`,
    jsonObject: true,
    temperature: 0.5,
  }, tenantId);
  if (!raw) return null;
  try {
    const j = JSON.parse(stripFences(raw));
    return typeof j.instructions === "string" && j.instructions.trim() ? j.instructions.trim().slice(0, 2500) : null;
  } catch { return null; }
}
