import { runAI } from "../runAI";

export async function collaborate(models: string[], prompt: string) {
  const responses: Record<string, any> = {};

  for (const model of models) {
    responses[model] = await runAI(model, prompt);
  }

  return responses;
}
