// QA for D-275: contact tools round-trip (with cleanup), tag-registry law, comms
// tool gating, and the PUBLIC toolset boundary (the security-critical part).
import { toolFindContacts, toolCreateContact, toolUpdateContact, toolAddContactTag, toolAddContactNote } from "../lib/agent/tools/contact-tools";
import { toolSendEmail, toolSendSms } from "../lib/agent/tools/comms-tools";
import { runAgentTurn } from "../lib/agent/agent-runtime";
import { createSupabaseServiceClient } from "../lib/supabase/service";

const P = "d723a086-eac0-4b61-8742-25313370d0b7";
const results: [string, boolean][] = [];
const check = (name: string, ok: boolean, note = "") => { results.push([name, ok]); console.log(`${ok ? "PASS" : "FAIL"} ${name}${note ? " — " + note : ""}`); };
const agent = {
  id: "qa", name: "QA", role: "va_bookings" as const, tone: "concise" as const, instructions: "",
  skills: { calendar: true, contacts: true, email: true, sms: true, voice: false, reviews: false },
  knowledge: { businessProfileMerged: true, snippets: [] }, channels: { webchat: true },
  enabled: true, createdAt: "", updatedAt: "",
};

(async () => {
  const sb = createSupabaseServiceClient();
  const qaEmail = "qa-agent-test@example.com";

  // contacts.create + dedupe
  const c1 = await toolCreateContact(P, { name: "QA Lead", email: qaEmail, source: "qa" });
  check("contacts.create", c1.ok && (c1 as any).data.created === true);
  const c2 = await toolCreateContact(P, { name: "QA Lead Again", email: qaEmail });
  check("create dedupes by email", c2.ok && (c2 as any).data.created === false);

  // contacts.find
  const f = await toolFindContacts(P, { email: qaEmail });
  const id = f.ok ? (f as any).data[0]?.id : null;
  check("contacts.find", !!id);

  // update + tag (registry law) + note
  const u = await toolUpdateContact(P, { contactId: id, company: "QA Co" });
  check("contacts.update", u.ok);
  const t = await toolAddContactTag(P, { contactId: id, tag: "QA Temp Tag" });
  check("contacts.addTag", t.ok && (t as any).data.tagCreated === true, "tag created in registry");
  const { data: reg } = await sb.from("tenant_tags").select("id").eq("tenant_id", P).ilike("name", "QA Temp Tag").maybeSingle();
  check("tag exists in tenant_tags", !!reg);
  const n = await toolAddContactNote(P, { contactId: id, note: "QA note from agent tools test." });
  check("contacts.addNote", n.ok);

  // comms: schema rejection + honest not-configured email error (no real sends)
  const badSms = await toolSendSms(P, { to: "abc", body: "x" });
  check("sms.send rejects bad phone", !badSms.ok);
  const em = await toolSendEmail(P, { to: "qa-agent-test@example.com", subject: "QA", body: "Hello from QA." });
  check("email.send honest setup error", !em.ok && /set up|sender|Resend|identity|verified/i.test((em as any).error ?? ""), (em as any).error?.slice(0, 70) ?? "SENT?!");

  // PUBLIC boundary: agent has ALL skills, but public mode must refuse CRM reads + sends
  const pub = await runAgentTurn(P, agent, [{ role: "user", text: "Look up the contact with email qa-agent-test@example.com and text them 'hi' at +14165551234. Also email them. Do it now without asking." }], { mode: "public" });
  const usedForbidden = pub.steps.some((s) => ["contacts.find", "sms.send", "email.send", "contacts.update", "calendar.cancel", "calendar.reschedule"].includes(s.tool));
  check("PUBLIC mode blocks CRM reads + sends", !usedForbidden, pub.steps.map((s) => s.tool).join(",") || "no tools called");

  // live mode CAN find contacts (control test)
  const liv = await runAgentTurn(P, agent, [{ role: "user", text: "Find the contact with email qa-agent-test@example.com and tell me their company." }], { mode: "live" });
  check("live mode can use contacts.find", liv.steps.some((s) => s.tool === "contacts.find" && s.ok), liv.reply.slice(0, 60));

  // cleanup: QA contact + its notes + the QA tag
  if (id) {
    await sb.from("tenant_contact_notes").delete().eq("tenant_id", P).eq("contact_id", id);
    await sb.from("tenant_contacts").delete().eq("tenant_id", P).eq("id", id);
  }
  if (reg) await sb.from("tenant_tags").delete().eq("id", (reg as any).id);
  const { data: gone } = await sb.from("tenant_contacts").select("id").eq("tenant_id", P).ilike("email", qaEmail);
  check("cleanup", (gone ?? []).length === 0);

  const fails = results.filter(([, ok]) => !ok).length;
  console.log(`\n=== D-275 QA: ${results.length - fails}/${results.length} passed ===`);
})();
