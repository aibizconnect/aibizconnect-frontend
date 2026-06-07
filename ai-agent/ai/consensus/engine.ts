import { runAI } from "../runAI";
import { DebateSession } from "../debate/session";

export async function runConsensus(session: DebateSession) {
  const transcript = session.messages
    .map(m => `[${m.provider}][${m.role}][Round ${m.round}]: ${m.content}`)
    .join("\n\n");

  const result = await runAI(
    "openai",
    `You are an AI consensus engine.\nTopic: ${session.topic}\n\nTranscript:\n${transcript}\n\nProvide:\n1. A consensus answer\n2. A reasoning summary\n3. A confidence score (0-100)\n4. A list of contradictions found`
  );

  return result;
}
