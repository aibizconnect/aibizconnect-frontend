import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { startOnboarding } from "@/lib/onboarding-start";

/**
 * POST /api/onboarding/start — Branch B "Generate my site" (v1). Creates a soft tenant,
 * provisions it, and generates a pre-branded DRAFT site from the chosen industry template.
 * DRAFTS ONLY — never publishes/sends/charges. Full signup deferred to publish.
 */
const bodySchema = z.object({
  businessName: z.string().min(2),
  email: z.string().email(),
  templateKey: z.string().min(1),
  location: z
    .object({ country: z.string().optional(), region: z.string().optional(), city: z.string().optional(), area: z.string().optional() })
    .optional(),
  // D-270 (Ali's law): tenant creation requires the user's explicit confirmation —
  // the signup button passes true; anything else is refused downstream and audited.
  userConfirmedNewWorkspace: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await req.json());
  } catch (e: unknown) {
    return NextResponse.json({ status: "error", error: "Invalid input", detail: (e as Error).message }, { status: 400 });
  }
  const result = await startOnboarding(body);
  return NextResponse.json({ status: result.ok ? "ok" : "error", result }, { status: result.ok ? 200 : 400 });
}
