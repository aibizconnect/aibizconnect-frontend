import { scrapeUrlToSnippet, draftAgentInstructions } from "../lib/agent/agent-knowledge";
import { upsertConversation, listConversations, getConversation } from "../lib/agent/conversations-store";
import { toolCreateContact, toolAddContactNote } from "../lib/agent/tools/contact-tools";
import { runAgentTurn } from "../lib/agent/agent-runtime";
import { createSupabaseServiceClient } from "../lib/supabase/service";
const P = "d723a086-eac0-4b61-8742-25313370d0b7";
const results: [string, boolean][] = [];
const check = (n: string, ok: boolean, note = "") => { results.push([n, ok]); console.log(`${ok ? "PASS" : "FAIL"} ${n}${note ? " — " + note : ""}`); };

(async () => {
  const sb = createSupabaseServiceClient();

  // 1. URL scrape
  const s = await scrapeUrlToSnippet("https://example.com");
  check("URL scrape", s.ok && (s as any).content.length > 50, s.ok ? `"${(s as any).title}" ${(s as any).content.length} chars` : (s as any).error);

  // 2. AI assist instructions (Ali's exact wish)
  const ins = await draftAgentInstructions(P, "Virtual Assistant — Bookings",
    "Engage with the visitor, find out their contact information, their pain-point and what they might need, then book a discovery appointment with one of the staff using the calendar.");
  check("AI-assist instructions", !!ins && /goal/i.test(ins) && ins.length > 200, ins ? `${ins.length} chars` : "null");

  // 3. contacts.create returns contactId; addNote works with it
  const c = await toolCreateContact(P, { name: "QA Visitor", email: "qa-visitor@example.com" });
  const cid = c.ok ? (c as any).data.contactId : null;
  check("create returns contactId", !!cid, cid ?? "null");
  const n = await toolAddContactNote(P, { contactId: cid, note: "Pain point: drowning in spreadsheets, wants automation." });
  check("note on new contact", n.ok);

  // 4. PUBLIC mode now allows addNote, still blocks find/sends
  const agent = { id: "qa-loop", name: "QA", role: "va_bookings" as const, tone: "friendly" as const,
    instructions: ins ?? "", skills: { calendar: true, contacts: true, email: true, sms: true, voice: false, reviews: false },
    knowledge: { businessProfileMerged: true, snippets: [] }, channels: { webchat: true },
    widget: { position: "bottom-right" as const, color: "", greeting: "", size: "standard" as const },
    lastTestedAt: null, enabled: true, createdAt: "", updatedAt: "" };
  const pub = await runAgentTurn(P, agent, [
    { role: "user", text: "Hi, I'm QA Visitor Two, qa-visitor2@example.com. My problem is I lose track of leads. Save a note about that for me please." },
  ], { mode: "public" });
  const usedNote = pub.steps.some((s) => s.tool === "contacts.addNote");
  const usedCreate = pub.steps.some((s) => s.tool === "contacts.create" && s.ok);
  const usedForbidden = pub.steps.some((s) => ["contacts.find", "email.send", "sms.send"].includes(s.tool));
  check("public: created lead", usedCreate, pub.steps.map((x) => x.tool).join(","));
  check("public: noted pain point", usedNote);
  check("public: forbidden still blocked", !usedForbidden);

  // 5. conversation storage round-trip (fallback store)
  const sid = crypto.randomUUID();
  await upsertConversation(P, { sessionId: sid, agentId: "qa-loop", channel: "webchat", contactEmail: "qa-visitor2@example.com",
    messages: [{ role: "user", text: "hi" }, { role: "agent", text: pub.reply || "hello" }], toolEvents: pub.steps.map((x) => x.tool),
    startedAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
  const got = await getConversation(P, sid);
  check("conversation stored + readable", !!got && got.contactEmail === "qa-visitor2@example.com" && got.messages.length === 2);
  const all = await listConversations(P);
  check("conversation listed", all.some((x) => x.sessionId === sid));

  // cleanup
  await sb.from("tenant_settings").delete().eq("tenant_id", P).eq("setting_key", `agent_convo:${sid}`);
  await sb.from("tenant_agent_conversations").delete().eq("tenant_id", P).eq("id", sid);
  for (const em of ["qa-visitor@example.com", "qa-visitor2@example.com"]) {
    const { data: row } = await sb.from("tenant_contacts").select("id").eq("tenant_id", P).ilike("email", em).maybeSingle();
    if (row) { await sb.from("tenant_contact_notes").delete().eq("tenant_id", P).eq("contact_id", (row as any).id); await sb.from("tenant_contacts").delete().eq("id", (row as any).id); }
  }
  const { count } = await sb.from("tenant_contacts").select("*", { count: "exact", head: true }).eq("tenant_id", P).ilike("email", "qa-visitor%");
  check("cleanup", (count ?? 0) === 0);

  const fails = results.filter(([, ok]) => !ok).length;
  console.log(`\n=== D-281 QA: ${results.length - fails}/${results.length} passed ===`);
})();
