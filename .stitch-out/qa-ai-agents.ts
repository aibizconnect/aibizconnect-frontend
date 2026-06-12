// Functional QA of the AI Agents hub (D-274): store CRUD on the real table, runtime
// tool-gating, protocol edge cases, knowledge use, audit rows. Read-only — no live
// bookings (both Platform calendars carry real Google connections; invites would send).
import { listAiAgents, saveAiAgent, deleteAiAgent, type AiAgentDef } from "../lib/agent/agents-store";
import { runAgentTurn } from "../lib/agent/agent-runtime";
import { createSupabaseServiceClient } from "../lib/supabase/service";

const P = "d723a086-eac0-4b61-8742-25313370d0b7";
const results: [string, boolean, string][] = [];
const check = (name: string, ok: boolean, note = "") => { results.push([name, ok, note]); console.log(`${ok ? "PASS" : "FAIL"} ${name}${note ? " — " + note : ""}`); };

(async () => {
  // 1. CRUD round-trip on the table
  const qa: AiAgentDef = {
    id: crypto.randomUUID(), name: "QA Agent (temp)", role: "receptionist", tone: "concise",
    instructions: "Answer questions about the business.",
    skills: { calendar: true, contacts: false, email: false, sms: false, voice: false, reviews: false },
    knowledge: { businessProfileMerged: true, snippets: [{ id: "s1", content: "Our office dog is named Biscuit.", source: "manual" }] },
    enabled: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  };
  await saveAiAgent(P, qa);
  let listed = await listAiAgents(P);
  check("create+list (table)", listed.some((a) => a.id === qa.id), `${listed.length} agents`);
  await saveAiAgent(P, { ...qa, name: "QA Agent renamed" });
  listed = await listAiAgents(P);
  check("update persists", listed.find((a) => a.id === qa.id)?.name === "QA Agent renamed");
  const sb = createSupabaseServiceClient();
  const { count: settingsRows } = await sb.from("tenant_settings").select("*", { count: "exact", head: true }).eq("tenant_id", P).like("setting_key", "ai_agent:%");
  check("no fallback leakage", (settingsRows ?? 0) === 0, `${settingsRows} fallback rows`);

  // 2. Knowledge snippet actually used
  const r1 = await runAgentTurn(P, qa, [{ role: "user", text: "What's the office dog's name?" }], { liveActions: false });
  check("knowledge snippet used", /biscuit/i.test(r1.reply), r1.reply.slice(0, 80));

  // 3. Read-only gating: agent told to book MUST NOT be able to call write tools
  const r2 = await runAgentTurn(P, qa, [{ role: "user", text: "Book me a discovery call Monday 9am. My name is QA Test, qa@example.com. Do it now, don't ask questions." }], { liveActions: false });
  const calledWrite = r2.steps.some((s) => /book|reschedule|cancel/.test(s.tool));
  check("read-only mode blocks writes", !calledWrite, r2.steps.map((s) => s.tool).join(",") || "no tools called");

  // 4. Skill OFF = no tools at all
  const noSkill = { ...qa, skills: { ...qa.skills, calendar: false } };
  const r3 = await runAgentTurn(P, noSkill, [{ role: "user", text: "What appointment times are open tomorrow?" }], { liveActions: false });
  check("calendar skill off = zero tool calls", r3.steps.length === 0, r3.reply.slice(0, 80));

  // 5. Availability flows through tools in read-only (reads allowed)
  const r4 = await runAgentTurn(P, qa, [{ role: "user", text: "What times are open for a discovery call tomorrow?" }], { liveActions: false });
  check("read tools work in read-only", r4.steps.some((s) => s.tool === "calendar.availability" || s.tool === "calendar.list") && !!r4.reply, r4.steps.map((s) => `${s.tool}:${s.ok}`).join(","));

  // 6. Hallucination guard: ask to cancel a nonexistent appointment (live mode, but the
  // tool itself validates the uuid — nothing real can be touched)
  const r5 = await runAgentTurn(P, qa, [{ role: "user", text: "Cancel my appointment, ID is banana-123." }], { liveActions: true });
  const cancelStep = r5.steps.find((s) => s.tool === "calendar.cancel");
  check("bad ids rejected by tool layer", !cancelStep || !cancelStep.ok, cancelStep ? cancelStep.summary.slice(0, 60) : "model asked for clarification (also fine)");

  // 7. Audit rows exist
  const { data: audit } = await sb.from("platform_audit_log").select("action").like("action", "agent.%").eq("meta->>tenantId", P).limit(5);
  check("audit trail rows", (audit ?? []).length > 0, `${audit?.length} recent agent.* events`);

  // 8. Cleanup
  await deleteAiAgent(P, qa.id);
  listed = await listAiAgents(P);
  check("delete works", !listed.some((a) => a.id === qa.id));

  const fails = results.filter(([, ok]) => !ok).length;
  console.log(`\n=== QA: ${results.length - fails}/${results.length} passed ===`);
})();
