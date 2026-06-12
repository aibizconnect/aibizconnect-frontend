import { runAgentTurn } from "../lib/agent/agent-runtime";
const P = "d723a086-eac0-4b61-8742-25313370d0b7";
const agent = {
  id: "test", name: "Booking Assistant", role: "va_bookings" as const, tone: "friendly" as const,
  instructions: "Help people book appointments.",
  skills: { calendar: true, contacts: false, email: false, sms: false, voice: false, reviews: false },
  knowledge: { businessProfileMerged: true, snippets: [{ id: "1", content: "We offer free 30-minute discovery calls.", source: "manual" }] },
  enabled: true, createdAt: "", updatedAt: "",
};
(async () => {
  const r1 = await runAgentTurn(P, agent, [{ role: "user", text: "Hi! What can I book with you?" }], { liveActions: false });
  console.log("TURN 1 steps:", r1.steps.map((s) => `${s.tool}:${s.ok}`).join(", ") || "none");
  console.log("TURN 1 reply:", r1.reply.slice(0, 300), r1.error ?? "");
  const r2 = await runAgentTurn(P, agent, [
    { role: "user", text: "Hi! What can I book with you?" },
    { role: "agent", text: r1.reply },
    { role: "user", text: "What times are open for a discovery call in the next few days?" },
  ], { liveActions: false });
  console.log("\nTURN 2 steps:", r2.steps.map((s) => `${s.tool}:${s.ok}`).join(", ") || "none");
  console.log("TURN 2 reply:", r2.reply.slice(0, 400), r2.error ?? "");
})();
