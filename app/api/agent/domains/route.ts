import { NextResponse } from "next/server";
import { listDomainSpecs } from "@/lib/agent/domains/registry";

/**
 * GET /api/agent/domains — domain-level liveness for the Agents panel (UI-1).
 * Reports each registered domain's actions, capabilities, liveEnabled, and
 * dryRunProven so the UI can show live / proven / stub status accurately.
 */
export async function GET() {
  return NextResponse.json({ status: "ok", domains: listDomainSpecs() });
}
