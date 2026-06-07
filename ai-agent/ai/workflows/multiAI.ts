import { runDistributedDebate } from "../debate/distributed";
import { superviseOutput } from "../supervisor/supervisor";
import { crossCheckSafety } from "../safety/crosscheck";
import { collaborate } from "../collaboration/protocol";

export async function runMultiAIWorkflow(topic: string) {
  const debate = await runDistributedDebate(topic, ["claude", "openai", "copilot"], 2);
  const supervision = await superviseOutput(debate.moderated.final);
  const safety = await crossCheckSafety(debate.moderated.final);
  const collaboration = await collaborate(["claude", "openai", "copilot"], topic);

  return {
    debate,
    supervision,
    safety,
    collaboration
  };
}
