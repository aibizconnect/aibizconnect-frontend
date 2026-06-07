import { runAI } from "../runAI";

export async function crossCheckSafety(output: string) {
  return runAI(
    "copilot",
    `Cross-check the following output for safety:\n${output}\n\nIdentify:\n- unsafe commands\n- hallucinations\n- contradictions\n- missing context`
  );
}
