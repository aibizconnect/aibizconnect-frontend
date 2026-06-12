import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { listAiAgents } from "@/lib/agent/agents-store";
import { runAgentTurn } from "@/lib/agent/agent-runtime";

/**
 * PUBLIC AI chat endpoint (D-275) — powers the floating chat widget on tenants'
 * public websites. Anonymous-safe by construction: the runtime's "public" mode
 * allows ONLY calendar.list / calendar.availability / calendar.book /
 * contacts.create (become-a-lead). No CRM reads, no email/SMS sends, no
 * reschedule/cancel. The agent must be enabled with the webchat channel on.
 * Simple per-IP throttle: 20 turns per 5 minutes per instance.
 */

const bodySchema = z.object({
  tenantId: z.string().uuid(),
  agentId: z.string().uuid(),
  sessionId: z.string().uuid().optional(), // widget chat session — enables conversation storage
  messages: z.array(z.object({ role: z.enum(["user", "agent"]), text: z.string().min(1).max(2000) })).min(1).max(40),
});

const WINDOW_MS = 5 * 60 * 1000;
const MAX_TURNS = 20;
const hits = new Map<string, number[]>();
function throttled(ip: string): boolean {
  const now = Date.now();
  const list = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  list.push(now);
  hits.set(ip, list);
  if (hits.size > 5000) hits.clear(); // memory backstop
  return list.length > MAX_TURNS;
}

export async function POST(req: NextRequest) {
  let body: z.infer<typeof bodySchema>;
  try { body = bodySchema.parse(await req.json()); }
  catch { return NextResponse.json({ error: "Invalid input" }, { status: 400 }); }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (throttled(ip)) return NextResponse.json({ error: "Too many messages — please slow down a little." }, { status: 429 });

  const agents = await listAiAgents(body.tenantId);
  const agent = agents.find((a) => a.id === body.agentId);
  if (!agent || !agent.enabled || !agent.channels.webchat) {
    return NextResponse.json({ error: "This assistant is not available." }, { status: 404 });
  }

  const r = await runAgentTurn(body.tenantId, agent, body.messages, { mode: "public" });
  if (r.error) return NextResponse.json({ error: "The assistant is unavailable right now." }, { status: 503 });

  // STORE THE CONVERSATION (D-281): one record per widget session, linked to the CRM
  // contact the moment the agent creates one mid-chat. Best-effort — never blocks the reply.
  if (body.sessionId) {
    try {
      const { upsertConversation, getConversation } = await import("@/lib/agent/conversations-store");
      const prev = await getConversation(body.tenantId, body.sessionId);
      const createStep = r.steps.find((s) => s.tool === "contacts.create" && s.ok);
      const contactEmail = (createStep?.args as any)?.email ?? prev?.contactEmail ?? null;
      await upsertConversation(body.tenantId, {
        sessionId: body.sessionId,
        agentId: agent.id,
        channel: "webchat",
        contactEmail: typeof contactEmail === "string" ? contactEmail : null,
        messages: [...body.messages, ...(r.reply ? [{ role: "agent" as const, text: r.reply }] : [])],
        toolEvents: [...(prev?.toolEvents ?? []), ...r.steps.map((s) => `${s.tool}${s.ok ? "" : "✗"}`)],
        startedAt: prev?.startedAt ?? new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    } catch { /* storage is best-effort */ }
  }

  // Tool names only — never internal args/summaries — leave the server.
  return NextResponse.json({ reply: r.reply, tools: r.steps.map((s) => s.tool) });
}
