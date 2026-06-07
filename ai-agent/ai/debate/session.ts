export type DebateMessage = {
  provider: string;
  role: "argument" | "critique" | "defense";
  content: string;
  round: number;
};

export type DebateSession = {
  id: string;
  topic: string;
  rounds: number;
  messages: DebateMessage[];
};

export function createDebateSession(topic: string, rounds: number): DebateSession {
  return {
    id: `debate_${Date.now()}`,
    topic,
    rounds,
    messages: []
  };
}

export function addDebateMessage(
  session: DebateSession,
  provider: string,
  role: DebateMessage["role"],
  content: string,
  round: number
) {
  session.messages.push({ provider, role, content, round });
}
