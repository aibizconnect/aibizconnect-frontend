import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { startOnboarding } from "@/lib/onboarding-start";
import { getCurrentUser, getCurrentUserId } from "@/lib/auth/platform-admin";

/**
 * POST /api/onboarding/start — the authenticated create-workspace step (D-378). Requires a signed-in
 * account: the tenant is created TIED to that account (tenant_users owner row) and provisioned with
 * the canonical blueprint. No anonymous provisioning. DRAFTS ONLY — never publishes/sends/charges.
 */
const bodySchema = z.object({
  businessName: z.string().min(2),
  templateKey: z.string().min(1),
  location: z
    .object({ country: z.string().optional(), region: z.string().optional(), city: z.string().optional(), area: z.string().optional() })
    .optional(),
});

export async function POST(req: NextRequest) {
  // Must be signed in — the account owns the workspace.
  const [ownerUserId, user] = await Promise.all([getCurrentUserId(), getCurrentUser()]);
  if (!ownerUserId || !user?.email) {
    return NextResponse.json({ status: "error", error: "Please sign in to create a workspace." }, { status: 401 });
  }

  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await req.json());
  } catch (e: unknown) {
    return NextResponse.json({ status: "error", error: "Invalid input", detail: (e as Error).message }, { status: 400 });
  }
  const result = await startOnboarding({
    businessName: body.businessName,
    templateKey: body.templateKey,
    location: body.location,
    email: user.email,            // the account's email — not a free-typed field
    ownerUserId,
    userConfirmedNewWorkspace: true, // the authenticated submit IS the explicit confirmation
  });
  return NextResponse.json({ status: result.ok ? "ok" : "error", result }, { status: result.ok ? 200 : 400 });
}
