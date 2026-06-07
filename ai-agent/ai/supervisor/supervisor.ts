import { runAI } from "../runAI";

export async function superviseOutput(output: string) {
  return runAI(
    "claude",
    `You are an AI supervisor.\nReview the following output for:\n- reasoning errors\n- contradictions\n- hallucinations\n- unsafe commands\n\nOutput:\n${output}\n\nProvide corrections and a safety rating (0-100).`
  );
}
