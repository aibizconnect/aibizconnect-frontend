import { listCampaigns, saveCampaign, deleteCampaign, resolveAudience, draftCampaign, sendCampaign, sendCampaignTest, type EmailCampaign } from "../lib/server/email-campaigns";
import { createSupabaseServiceClient } from "../lib/supabase/service";
const P = "d723a086-eac0-4b61-8742-25313370d0b7";
const results: [string, boolean][] = [];
const check = (n: string, ok: boolean, note = "") => { results.push([n, ok]); console.log(`${ok ? "PASS" : "FAIL"} ${n}${note ? " — " + note : ""}`); };

(async () => {
  const sb = createSupabaseServiceClient();
  // seed 4 QA contacts: clean+Buyer, clean no-tag, Unsubscribed, dnd
  const mk = (name: string, email: string, tags: string[], dnd = false) => ({ tenant_id: P, name, email, tags, dnd, source: "qa" });
  await sb.from("tenant_contacts").insert([
    mk("QA Buyer", "qa-buyer@example.com", ["Buyer"]),
    mk("QA Plain", "qa-plain@example.com", []),
    mk("QA Unsub", "qa-unsub@example.com", ["Buyer", "Unsubscribed"]),
    mk("QA DND", "qa-dnd@example.com", ["Buyer"], true),
  ]);

  const all = await resolveAudience(P, { mode: "all", tags: [] });
  const emails = all.map((r) => r.email);
  check("audience ALL includes clean", emails.includes("qa-buyer@example.com") && emails.includes("qa-plain@example.com"));
  check("guard tag excluded ALWAYS", !emails.includes("qa-unsub@example.com"));
  check("dnd excluded ALWAYS", !emails.includes("qa-dnd@example.com"));

  const buyers = await resolveAudience(P, { mode: "tags", tags: ["Buyer"] });
  check("tag audience filters", buyers.length === 1 && buyers[0].email === "qa-buyer@example.com", `${buyers.length} buyers`);

  const d = await draftCampaign(P, "Invite past clients to a free 30-minute AI strategy session next week. Friendly, one booking CTA.");
  check("AI draft works", !!d?.subject && !!d?.body, d ? `"${d.subject.slice(0, 50)}"` : "null");

  const camp: EmailCampaign = {
    id: crypto.randomUUID(), name: "QA Campaign", subject: d?.subject ?? "QA", preheader: d?.preheader ?? "", body: d?.body ?? "Hello.",
    audience: { mode: "tags", tags: ["Buyer"] }, status: "draft", stats: { recipients: 0, sent: 0, failed: 0 }, log: [],
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), sentAt: null,
  };
  await saveCampaign(P, camp);
  const listed = await listCampaigns(P);
  check("campaign save+list (fallback store)", listed.some((c) => c.id === camp.id));

  const t = await sendCampaignTest(P, camp, "qa@example.com");
  check("test-send gated on sender identity", !t.ok && /set up|sender|verified/i.test(t.error ?? ""), t.error?.slice(0, 60) ?? "SENT?!");
  const s = await sendCampaign(P, camp.id);
  check("real send gated on sender identity", !s.ok && /set up|sender|verified/i.test(s.error ?? ""), s.error?.slice(0, 60) ?? "SENT?!");

  await deleteCampaign(P, camp.id);
  check("campaign delete", !(await listCampaigns(P)).some((c) => c.id === camp.id));
  await sb.from("tenant_contacts").delete().eq("tenant_id", P).eq("source", "qa");
  const { count } = await sb.from("tenant_contacts").select("*", { count: "exact", head: true }).eq("tenant_id", P).eq("source", "qa");
  check("cleanup", (count ?? 0) === 0);

  const fails = results.filter(([, ok]) => !ok).length;
  console.log(`\n=== D-280 QA: ${results.length - fails}/${results.length} passed ===`);
})();
