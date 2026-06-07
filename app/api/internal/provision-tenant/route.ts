import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { provisionTenant } from "@/lib/onboarding";

/**
 * POST /api/internal/provision-tenant — onboarding hook. Call right after a tenant is
 * created (signup / createTenant) to seed default entitlement policies + auto-provision
 * a free subdomain. Idempotent. Internal/service use.
 */
const bodySchema = z.object({
  tenantId: z.string().uuid(),
  subdomain: z.string().optional(),
  ownerUserId: z.string().uuid().optional(),
});

export async function POST(req: NextRequest) {
  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await req.json());
  } catch (e: unknown) {
    return NextResponse.json({ status: "error", error: "Invalid body", detail: (e as Error).message }, { status: 400 });
  }
  const result = await provisionTenant({ tenantId: body.tenantId, subdomain: body.subdomain, ownerUserId: body.ownerUserId ?? null });
  return NextResponse.json({ status: result.ok ? "provisioned" : "partial", result }, { status: result.ok ? 200 : 207 });
}
