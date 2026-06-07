// ai-agent/agent.ts

import { exec } from "child_process";
import fs from "fs";
import path from "path";
import util from "util";

const asyncExec = util.promisify(exec);

type CommandType = "SAFE" | "REVIEW" | "BLOCKED";

interface DestructiveActionMeta {
  reason: string;
  impact: string;
  alternatives?: string[];
}

interface AgentCommand {
  id: string;
  command: string;
  cwd?: string;
  meta?: DestructiveActionMeta;
}

interface AgentResult {
  id: string;
  status: "EXECUTED" | "REVIEW_REQUIRED" | "BLOCKED" | "ERROR";
  output?: string;
  error?: string;
  classification: CommandType;
}

const LOG_DIR = path.join(process.cwd(), "ai-agent-logs");
const APPROVAL_QUEUE_FILE = path.join(LOG_DIR, "approval-queue.json");

function ensureLogDir() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
}

function logEvent(file: string, data: any) {
  ensureLogDir();
  const fullPath = path.join(LOG_DIR, file);
  const line = JSON.stringify({ ts: new Date().toISOString(), ...data }) + "\n";
  fs.appendFileSync(fullPath, line, "utf8");
}

// --- HYBRID MODE POLICY ENGINE ---

function classifyCommand(cmd: string): CommandType {
  const lower = cmd.toLowerCase().trim();

  // Hard-blocked patterns (never allowed)
  const blockedPatterns = [
    "drop database",
    "rm -rf /",
    "rm -rf .git",
  ];
  if (blockedPatterns.some(p => lower.includes(p))) {
    return "BLOCKED";
  }

  // Review-required patterns (need Ali's approval)
  const reviewPatterns = [
    "drop table",
    "truncate",
    "alter table",
    "drop column",
    "rename column",
    "delete from",
    "update ",
    "supabase db reset",
  ];
  if (reviewPatterns.some(p => lower.includes(p))) {
    return "REVIEW";
  }

  // Safe patterns (auto-execute)
  const safePatterns = [
    "npm run lint",
    "npm run build",
    "npm run test",
    "pnpm ",
    "yarn ",
    "git status",
    "git diff",
    "git log",
    "ls",
    "pwd",
    "cat ",
    "node ",
  ];
  if (safePatterns.some(p => lower.startsWith(p))) {
    return "SAFE";
  }

  // Default: treat unknown commands as REVIEW to be safe
  return "REVIEW";
}

function enqueueForApproval(cmd: AgentCommand) {
  ensureLogDir();
  let queue: AgentCommand[] = [];
  if (fs.existsSync(APPROVAL_QUEUE_FILE)) {
    queue = JSON.parse(fs.readFileSync(APPROVAL_QUEUE_FILE, "utf8") || "[]");
  }
  queue.push(cmd);
  fs.writeFileSync(APPROVAL_QUEUE_FILE, JSON.stringify(queue, null, 2), "utf8");

  logEvent("approvals.log", {
    type: "REVIEW_REQUIRED",
    commandId: cmd.id,
    command: cmd.command,
    meta: cmd.meta || null,
  });
}

export async function runAgentCommand(cmd: AgentCommand): Promise<AgentResult> {
  const classification = classifyCommand(cmd.command);

  if (classification === "BLOCKED") {
    logEvent("commands.log", {
      type: "BLOCKED",
      commandId: cmd.id,
      command: cmd.command,
    });

    return {
      id: cmd.id,
      status: "BLOCKED",
      classification,
      error: "Command blocked by policy (Hybrid Mode).",
    };
  }

  if (classification === "REVIEW") {
    enqueueForApproval(cmd);

    return {
      id: cmd.id,
      status: "REVIEW_REQUIRED",
      classification,
      error: "Command requires Ali's approval before execution.",
    };
  }

  // SAFE → execute
  try {
    const { stdout, stderr } = await asyncExec(cmd.command, {
      cwd: cmd.cwd || process.cwd(),
    });

    logEvent("commands.log", {
      type: "EXECUTED",
      commandId: cmd.id,
      command: cmd.command,
      stdout,
      stderr,
    });

    return {
      id: cmd.id,
      status: "EXECUTED",
      classification,
      output: stdout || stderr,
    };
  } catch (err: any) {
    logEvent("commands.log", {
      type: "ERROR",
      commandId: cmd.id,
      command: cmd.command,
      error: err.message,
    });

    return {
      id: cmd.id,
      status: "ERROR",
      classification,
      error: err.message,
    };
  }
}

// --- SIMPLE CLI INTERFACE FOR NOW ---

if (require.main === module) {
  const [, , ...args] = process.argv;
  const command = args.join(" ");

  if (!command) {
    console.error("Usage: ts-node ai-agent/agent.ts \"<command>\"");
    process.exit(1);
  }

  const id = `cmd_${Date.now()}`;

  runAgentCommand({ id, command }).then(res => {
    console.log(JSON.stringify(res, null, 2));
  });
}
