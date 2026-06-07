import { NextResponse } from "next/server";
import { listAgents } from "@/lib/agent/registry";

/**
 * GET /api/agent/agents — the Agent Mesh manifest (role, domain, label, status,
 * capability). Powers UI embedding: surfaces which agents exist and whether each
 * is live or a registered stub.
 */
export async function GET() {
  return NextResponse.json({ status: "ok", agents: listAgents() });
}
