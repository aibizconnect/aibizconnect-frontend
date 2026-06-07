import { runDebate } from "./engine";
import { moderateDebate } from "./moderator";
import { runConsensus } from "../consensus/engine";

export async function runDistributedDebate(topic: string, providers: string[], rounds = 2) {
  const session = await runDebate(topic, providers, rounds);
  const moderated = await moderateDebate(session);
  const consensus = await runConsensus(session);

  return {
    session,
    moderated,
    consensus
  };
}
