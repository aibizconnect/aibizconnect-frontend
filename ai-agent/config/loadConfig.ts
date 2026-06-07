import fs from "fs";
import path from "path";

export function loadAgentConfig() {
  const configPath = path.join(process.cwd(), "ai-agent/config/agent.config.json");

  if (!fs.existsSync(configPath)) {
    throw new Error("Missing agent.config.json");
  }

  const raw = fs.readFileSync(configPath, "utf8");
  return JSON.parse(raw);
}
