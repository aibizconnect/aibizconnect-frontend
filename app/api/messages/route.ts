import { NextResponse } from "next/server";

/**
 * DISABLED (D-300). This was an early scaffold that inserted arbitrary unauthenticated rows
 * into a `messages` table — a security hole, and unreferenced anywhere in the app. The unified
 * Conversations inbox replaces it: inbound SMS arrives via /api/webhooks/twilio/sms (signature
 * verified, tenant-scoped) and messages are written through lib/server/conversations.ts.
 */
export async function POST() {
  return NextResponse.json({ success: false, error: "Endpoint removed — use the Conversations inbox." }, { status: 410 });
}
