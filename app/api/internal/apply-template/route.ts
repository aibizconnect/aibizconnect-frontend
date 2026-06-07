import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { applyTemplate } from "@/lib/templates-apply";

/**
 * POST /api/internal/apply-template — Start-from-Template. Generates a DRAFT site for a
 * tenant from an industry template. Internal/service use (the in-app picker uses the
 * server action). DRAFTS ONLY — never publishes, sends, or spends.
 */
const bodySchema = z.object({
  tenantId: z.string().uuid(),
  templateKey: z.string().min(1),
  businessName: z.string().min(2),
  applyBrand: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await req.json());
  } catch (e: unknown) {
    return NextResponse.json({ status: "error", error: "Invalid body", detail: (e as Error).message }, { status: 400 });
  }
  const result = await applyTemplate(body);
  return NextResponse.json({ status: result.ok ? "ok" : "error", result }, { status: result.ok ? 200 : 400 });
}
