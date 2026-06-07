import { runAI } from "./runAI";

export async function routeAI(task: string, prompt: string) {
  switch (task) {
    case "code":
      return runAI("claude", prompt);
    case "analysis":
      return runAI("openai", prompt);
    case "summarize":
      return runAI("copilot", prompt);
    default:
      return runAI("claude", prompt);
  }
}
