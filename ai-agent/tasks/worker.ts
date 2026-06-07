import { dequeueTask, completeTask, failTask } from "./taskQueue";
import { runAgentCommand } from "../agent";

export async function runTaskWorker() {
  const task = dequeueTask();
  if (!task) return;

  try {
    const result = await runAgentCommand({
      id: task.id,
      command: task.command,
      cwd: task.cwd,
      meta: task.meta
    });

    completeTask(task.id, result);
  } catch (err: any) {
    failTask(task.id, err.message || "Unknown error");
  }
}

if (require.main === module) {
  setInterval(() => {
    runTaskWorker();
  }, 3000);
}
