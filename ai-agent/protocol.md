# Claude Protocol for AI DevOps Agent

This document defines how Claude must interact with the AI DevOps Agent.

---

## 1. SAFE COMMAND FORMAT

Claude must send commands to the agent using the following JSON structure:

{
  "id": "cmd_<unique>",
  "command": "<shell command>",
  "cwd": "<optional working directory>",
  "meta": null
}

Example:

{
  "id": "cmd_001",
  "command": "npm run build"
}

---

## 2. DESTRUCTIVE ACTION REQUEST FORMAT

If Claude wants to perform a destructive action (Hybrid Mode), it MUST wrap the request in a `DESTRUCTIVE_ACTION_REQUEST` block:

DESTRUCTIVE_ACTION_REQUEST
{
  "id": "cmd_002",
  "command": "DELETE FROM websites WHERE status = 'draft'",
  "meta": {
    "reason": "Remove all draft websites from the database to clear stale data.",
    "impact": "Permanently deletes all draft-status records from the websites table.",
    "alternatives": [
      "Archive instead of delete",
      "Add a scheduled cleanup instead"
    ]
  }
}
END_DESTRUCTIVE_ACTION_REQUEST

---

## 3. BLOCKED COMMANDS

Claude must NEVER send the following types of commands:

- DROP DATABASE
- rm -rf /
- rm -rf .git
- Any command that destroys root-level file systems

If Claude is asked to perform these, it must respond:

"This action is BLOCKED by the AI DevOps Agent policy and cannot be executed."

---

## 4. HTTP ENDPOINT CONTRACT

The agent accepts POST requests at:

/api/agent

Request body:

{
  "command": "<shell command>",
  "id": "<optional>",
  "cwd": "<optional>",
  "meta": "<optional>"
}

Response:

{
  "success": true,
  "result": {
    "id": "cmd_xxx",
    "status": "EXECUTED | REVIEW_REQUIRED | BLOCKED | ERROR",
    "classification": "SAFE | REVIEW | BLOCKED",
    "output": "...",
    "error": "..."
  }
}

---

## 5. APPROVAL QUEUE HANDLING

When Claude receives a REVIEW_REQUIRED response, it must:

1. Inform Ali that the command is pending approval.
2. Output the exact command and its meta context.
3. Wait for explicit approval before any retry.

Claude must NOT retry REVIEW_REQUIRED commands automatically.

---

## 6. LOGGING CONTRACT

Claude must always pass an `id` field when calling the agent.

If no `id` is passed, the agent generates one automatically.

All agent actions are logged in:

- ai-agent-logs/commands.log
- ai-agent-logs/approvals.log
- ai-agent-logs/approval-queue.json

---

## 7. CLAUDE BEHAVIOR RULES

- Claude MUST NOT execute shell commands directly.
- Claude MUST route ALL commands through the agent.
- Claude MUST include meta context for all destructive actions.
- Claude MUST inform Ali when a command is BLOCKED or REVIEW_REQUIRED.
- Claude MUST NOT retry blocked commands.
