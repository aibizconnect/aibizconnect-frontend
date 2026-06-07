import fs from "fs";
import path from "path";

const MEMORY_PATH = path.join(process.cwd(), "ai-agent-logs/ai-memory.json");

export function loadMemory() {
  if (!fs.existsSync(MEMORY_PATH)) return {};
  return JSON.parse(fs.readFileSync(MEMORY_PATH, "utf8"));
}

export function saveMemory(memory: any) {
  fs.writeFileSync(MEMORY_PATH, JSON.stringify(memory, null, 2), "utf8");
}

export function remember(key: string, value: any) {
  const memory = loadMemory();
  memory[key] = value;
  saveMemory(memory);
}

export function recall(key: string) {
  const memory = loadMemory();
  return memory[key] || null;
}
