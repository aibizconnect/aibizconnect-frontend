import { runAI } from "../runAI";
import { createDebateSession, addDebateMessage } from "./session";

export async function runDebate(topic: string, providers: string[], rounds = 2) {
  const session = createDebateSession(topic, rounds);

  for (let round = 1; round <= rounds; round++) {
    for (let i = 0; i < providers.length; i++) {
      const current = providers[i];
      const opponent = providers[(i + 1) % providers.length];

      // Argument
      const argument = await runAI(current, `Debate topic: ${topic}\nProvide your argument.`);
      addDebateMessage(session, current, "argument", argument, round);

      // Critique
      const critique = await runAI(
        opponent,
        `Critique the following argument:\n${argument}`
      );
      addDebateMessage(session, opponent, "critique", critique, round);

      // Defense
      const defense = await runAI(
        current,
        `Your opponent critiqued your argument:\n${critique}\nRespond with a defense.`
      );
      addDebateMessage(session, current, "defense", defense, round);
    }
  }

  return session;
}
