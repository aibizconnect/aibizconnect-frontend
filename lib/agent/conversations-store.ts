import { createSupabaseServiceClient } from "@/lib/supabase/service";

/**
 * Agent CONVERSATIONS store (D-281 — "store the conversation"). One record per chat
 * session (the widget's sessionId), transcript capped at 40 messages, linked to the
 * CRM contact as soon as the agent creates one mid-chat. Table tenant_agent_conversations
 * (0055, queued) with the standard tenant_settings fallback (`agent_convo:<sessionId>`).
 */

export interface StoredConversation {
  sessionId: string;
  agentId: string;
  channel: "webchat" | "test";
  contactEmail: string | null;
  messages: { role: "user" | "agent"; text: string }[];
  toolEvents: string[];
  startedAt: string;
  updatedAt: string;
}

const FALLBACK_PREFIX = "agent_convo:";
const missingTable = (msg?: string) => /relation .* does not exist|Could not find the table/i.test(msg ?? "");
const svc = () => createSupabaseServiceClient();

const normalize = (raw: any, sessionId: string): StoredConversation => ({
  sessionId,
  agentId: String(raw?.agentId ?? ""),
  channel: raw?.channel === "test" ? "test" : "webchat",
  contactEmail: raw?.contactEmail ?? null,
  messages: Array.isArray(raw?.messages) ? raw.messages.slice(-40) : [],
  toolEvents: Array.isArray(raw?.toolEvents) ? raw.toolEvents.slice(-60) : [],
  startedAt: String(raw?.startedAt ?? new Date().toISOString()),
  updatedAt: String(raw?.updatedAt ?? new Date().toISOString()),
});

export async function upsertConversation(tenantId: string, convo: StoredConversation): Promise<void> {
  const sb = svc();
  const config = { ...convo, messages: convo.messages.slice(-40), toolEvents: convo.toolEvents.slice(-60), updatedAt: new Date().toISOString() };
  const { error } = await sb.from("tenant_agent_conversations").upsert(
    { id: convo.sessionId, tenant_id: tenantId, config, updated_at: config.updatedAt },
    { onConflict: "id" },
  );
  if (!error) return;
  if (!missingTable(error.message)) return; // conversation storage is best-effort
  await sb.from("tenant_settings").upsert(
    { tenant_id: tenantId, setting_key: `${FALLBACK_PREFIX}${convo.sessionId}`, setting_value: config, updated_at: config.updatedAt },
    { onConflict: "tenant_id,setting_key" },
  );
}

export async function getConversation(tenantId: string, sessionId: string): Promise<StoredConversation | null> {
  const sb = svc();
  const { data, error } = await sb.from("tenant_agent_conversations").select("config").eq("tenant_id", tenantId).eq("id", sessionId).maybeSingle();
  if (!error && data) return normalize((data as any).config, sessionId);
  if (error && !missingTable(error.message)) return null;
  const { data: row } = await sb.from("tenant_settings").select("setting_value").eq("tenant_id", tenantId).eq("setting_key", `${FALLBACK_PREFIX}${sessionId}`).maybeSingle();
  return row ? normalize((row as any).setting_value, sessionId) : null;
}

export async function listConversations(tenantId: string, limit = 50): Promise<StoredConversation[]> {
  const sb = svc();
  const { data, error } = await sb.from("tenant_agent_conversations").select("id, config").eq("tenant_id", tenantId).order("updated_at", { ascending: false }).limit(limit);
  if (!error) return (data ?? []).map((r: any) => normalize(r.config, r.id));
  if (!missingTable(error.message)) return [];
  const { data: rows } = await sb.from("tenant_settings").select("setting_key, setting_value").eq("tenant_id", tenantId).like("setting_key", `${FALLBACK_PREFIX}%`);
  return (rows ?? [])
    .map((r: any) => normalize(r.setting_value, String(r.setting_key).slice(FALLBACK_PREFIX.length)))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, limit);
}
