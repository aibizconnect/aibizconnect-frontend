import { runAI } from "../runAI";
import { enqueueTask } from "../../tasks/taskQueue";

export async function runToolformer(provider: string, prompt: string) {
  const result = await runAI(
    provider,
    `You may call tools using the format:\n<tool name="task">\ncommand: ...\n</tool>\n\nUser prompt:\n${prompt}`
  );

  const match = result?.content?.match(/<tool name="task">([\s\S]*?)<\/tool>/);

  if (match) {
    const command = match[1].trim();
    enqueueTask({ command });
  }

  return result;
}
