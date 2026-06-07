import { runAI } from "../runAI";
import { DebateSession } from "./session";

export async function moderateDebate(session: DebateSession) {
  const transcript = session.messages
    .map(m => `[${m.provider}][${m.role}][Round ${m.round}]: ${m.content}`)
    .join("\n\n");

  const final = await runAI(
    "claude",
    `You are the debate moderator.\nTopic: ${session.topic}\n\nTranscript:\n${transcript}\n\nProvide:\n1. A final synthesized answer\n2. A reasoning summary\n3. A confidence score (0-100)`
  );

  return {
    sessionId: session.id,
    topic: session.topic,
    transcript,
    final
  };
}
