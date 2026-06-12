import { createSupabaseServiceClient } from "@/lib/supabase/service";

/**
 * Tenant-facing AI AGENTS store (D-274 — the "AI Agents" product menu, GHL-class).
 * Definitions live in `tenant_ai_agents` (0053, queued); until that DDL is applied the
 * store falls back to `tenant_settings` rows keyed `ai_agent:<id>` (setting_value jsonb)
 * so the feature works immediately. Same convergence pattern as the rest of the app.
 */

export type AgentRole = "va_bookings" | "receptionist" | "lead_qualifier" | "support";
export type AgentTone = "professional" | "friendly" | "concise" | "enthusiastic";

export interface AgentSnippet { id: string; content: string; source: string }
export interface AiAgentDef {
  id: string;
  name: string;
  role: AgentRole;
  tone: AgentTone;
  instructions: string;
  skills: { calendar: boolean; contacts: boolean; email: boolean; sms: boolean; voice: boolean; reviews: boolean };
  knowledge: { businessProfileMerged: boolean; snippets: AgentSnippet[] };
  /** Channels this agent answers on. webchat = the floating AI chat on the tenant's public sites. */
  channels: { webchat: boolean };
  /** Chat bubble appearance — the tenant decides look + position (D-276). color "" = use the site's brand color. */
  widget: { position: "bottom-right" | "bottom-left"; color: string; greeting: string; size: "compact" | "standard" | "large" };
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export const ROLE_LABELS: Record<AgentRole, string> = {
  va_bookings: "Virtual Assistant — Bookings",
  receptionist: "AI Receptionist",
  lead_qualifier: "Lead Qualifier",
  support: "Customer Support",
};

export const ROLE_PRESETS: Record<AgentRole, string> = {
  va_bookings:
    "You are the business's virtual booking assistant. Help people find a suitable time, book, reschedule, or cancel appointments. Always confirm date, time (with timezone), and the person's name and email before booking. Offer 2-3 concrete open slots rather than asking open-ended questions.",
  receptionist:
    "You are the business's friendly receptionist. Greet visitors, answer questions about the business (services, hours, location, contact details), and route booking requests to the calendar. If you don't know an answer, take the person's contact details and promise a follow-up.",
  lead_qualifier:
    "You qualify new leads. Ask short, natural questions to learn what they need, their timeline, and their budget. Summarize what you learned at the end and suggest the next step (usually booking a call).",
  support:
    "You are the business's support agent. Answer questions clearly and concisely from the business knowledge provided. When a question needs a human, say so honestly and collect the person's contact details.",
};

const FALLBACK_PREFIX = "ai_agent:";
const missingTable = (msg?: string) => /relation .* does not exist|Could not find the table/i.test(msg ?? "");

const normalize = (raw: any, id: string): AiAgentDef => ({
  id,
  name: String(raw?.name ?? "Untitled agent"),
  role: (raw?.role ?? "va_bookings") as AgentRole,
  tone: (raw?.tone ?? "professional") as AgentTone,
  instructions: String(raw?.instructions ?? ""),
  skills: { calendar: true, contacts: false, email: false, sms: false, voice: false, reviews: false, ...(raw?.skills ?? {}) },
  knowledge: { businessProfileMerged: raw?.knowledge?.businessProfileMerged !== false, snippets: Array.isArray(raw?.knowledge?.snippets) ? raw.knowledge.snippets : [] },
  channels: { webchat: raw?.channels?.webchat === true },
  widget: {
    position: raw?.widget?.position === "bottom-left" ? "bottom-left" : "bottom-right",
    color: typeof raw?.widget?.color === "string" ? raw.widget.color : "",
    greeting: typeof raw?.widget?.greeting === "string" ? raw.widget.greeting : "",
    size: ["compact", "large"].includes(raw?.widget?.size) ? raw.widget.size : "standard",
  },
  enabled: raw?.enabled !== false,
  createdAt: String(raw?.createdAt ?? new Date().toISOString()),
  updatedAt: String(raw?.updatedAt ?? new Date().toISOString()),
});

export async function listAiAgents(tenantId: string): Promise<AiAgentDef[]> {
  const sb = createSupabaseServiceClient();
  const { data, error } = await sb.from("tenant_ai_agents").select("id, config").eq("tenant_id", tenantId).order("created_at");
  if (!error) return (data ?? []).map((r: any) => normalize(r.config, r.id));
  if (!missingTable(error.message)) return [];
  const { data: rows } = await sb.from("tenant_settings").select("setting_key, setting_value").eq("tenant_id", tenantId).like("setting_key", `${FALLBACK_PREFIX}%`);
  return (rows ?? [])
    .map((r: any) => normalize(r.setting_value, String(r.setting_key).slice(FALLBACK_PREFIX.length)))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function saveAiAgent(tenantId: string, agent: AiAgentDef): Promise<void> {
  const sb = createSupabaseServiceClient();
  const config = { ...agent, updatedAt: new Date().toISOString() };
  const { error } = await sb.from("tenant_ai_agents").upsert(
    { id: agent.id, tenant_id: tenantId, config, updated_at: config.updatedAt },
    { onConflict: "id" },
  );
  if (!error) return;
  if (!missingTable(error.message)) throw new Error(error.message);
  const { error: e2 } = await sb.from("tenant_settings").upsert(
    { tenant_id: tenantId, setting_key: `${FALLBACK_PREFIX}${agent.id}`, setting_value: config, updated_at: config.updatedAt },
    { onConflict: "tenant_id,setting_key" },
  );
  if (e2) throw new Error(e2.message);
}

export async function deleteAiAgent(tenantId: string, agentId: string): Promise<void> {
  const sb = createSupabaseServiceClient();
  const { error } = await sb.from("tenant_ai_agents").delete().eq("tenant_id", tenantId).eq("id", agentId);
  if (error && !missingTable(error.message)) throw new Error(error.message);
  await sb.from("tenant_settings").delete().eq("tenant_id", tenantId).eq("setting_key", `${FALLBACK_PREFIX}${agentId}`);
}
