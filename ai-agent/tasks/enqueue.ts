import { enqueueTask } from "./taskQueue";

const command = process.argv.slice(2).join(" ");

if (!command) {
  console.log("Usage: ts-node ai-agent/tasks/enqueue.ts \"<command>\"");
  process.exit(1);
}

enqueueTask({ command });

console.log("Task enqueued:", command);
