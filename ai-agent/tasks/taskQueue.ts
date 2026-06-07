import fs from "fs";
import path from "path";

const QUEUE_PATH = path.join(process.cwd(), "ai-agent-logs/task-queue.json");

export function loadQueue() {
  if (!fs.existsSync(QUEUE_PATH)) return [];
  try {
    return JSON.parse(fs.readFileSync(QUEUE_PATH, "utf8"));
  } catch {
    return [];
  }
}

export function saveQueue(queue: any[]) {
  fs.writeFileSync(QUEUE_PATH, JSON.stringify(queue, null, 2), "utf8");
}

export function enqueueTask(task: any) {
  const queue = loadQueue();
  queue.push({
    id: task.id || `task_${Date.now()}`,
    command: task.command,
    cwd: task.cwd || process.cwd(),
    meta: task.meta || null,
    status: "PENDING",
    createdAt: new Date().toISOString()
  });
  saveQueue(queue);
}

export function dequeueTask() {
  const queue = loadQueue();
  const next = queue.find((t: any) => t.status === "PENDING");
  if (!next) return null;
  next.status = "RUNNING";
  saveQueue(queue);
  return next;
}

export function completeTask(id: string, result: any) {
  const queue = loadQueue();
  const task = queue.find((t: any) => t.id === id);
  if (task) {
    task.status = "COMPLETED";
    task.completedAt = new Date().toISOString();
    task.result = result;
    saveQueue(queue);
  }
}

export function failTask(id: string, error: any) {
  const queue = loadQueue();
  const task = queue.find((t: any) => t.id === id);
  if (task) {
    task.status = "FAILED";
    task.error = error;
    task.failedAt = new Date().toISOString();
    saveQueue(queue);
  }
}
