import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { addReview } from "@/lib/reputation";

/** POST /api/reviews/submit — a customer leaves a public review. No send/charge. */
const bodySchema = z.object({
  tenantId: z.string().uuid(),
  author: z.string().max(120).optional(),
  rating: z.number().int().min(1).max(5),
  body: z.string().max(2000).optional(),
});

export async function POST(req: NextRequest) {
  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await req.json());
  } catch {
    return NextResponse.json({ ok: false, error: "Please choose a rating (1–5)." }, { status: 400 });
  }
  const r = await addReview(body.tenantId, { author: body.author, rating: body.rating, body: body.body, source: "website" });
  return NextResponse.json(r, { status: r.ok ? 200 : 500 });
}
