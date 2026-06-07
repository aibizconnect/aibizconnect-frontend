import fs from "fs";
import path from "path";
import { runAgentCommand } from "./agent";

const LOG_DIR = path.join(process.cwd(), "ai-agent-logs");
const APPROVAL_QUEUE_FILE = path.join(LOG_DIR, "approval-queue.json");

async function main() {
  if (!fs.existsSync(APPROVAL_QUEUE_FILE)) {
    console.log("No approval queue found.");
    return;
  }

  const queue = JSON.parse(fs.readFileSync(APPROVAL_QUEUE_FILE, "utf8") || "[]");

  if (queue.length === 0) {
    console.log("Approval queue is empty.");
    return;
  }

  for (const item of queue) {
    console.log("\n====================================");
    console.log("Command ID:", item.id);
    console.log("Command:", item.command);
    console.log("Reason:", item.meta?.reason || "N/A");
    console.log("Impact:", item.meta?.impact || "N/A");
    console.log("Alternatives:", item.meta?.alternatives || "N/A");
    console.log("====================================\n");

    const input = await new Promise<string>(resolve => {
      process.stdout.write("Approve this command? (y/n): ");
      process.stdin.once("data", data => resolve(data.toString().trim()));
    });

    if (input.toLowerCase() === "y") {
      console.log("Executing...");
      const result = await runAgentCommand(item);
      console.log(result);
    } else {
      console.log("Rejected.");
    }
  }

  fs.writeFileSync(APPROVAL_QUEUE_FILE, "[]", "utf8");
  console.log("\nApproval queue cleared.");
}

main();
