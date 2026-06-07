import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { bookAppointment } from "@/lib/calendars";

/**
 * POST /api/book — public appointment booking. A visitor books a slot → appointment +
 * CRM contact created. No send/charge (confirmation emails are a later gated step).
 */
const bodySchema = z.object({
  tenantId: z.string().uuid(),
  calendarId: z.string().uuid(),
  name: z.string().min(1).max(200),
  email: z.string().email(),
  phone: z.string().max(40).optional(),
  startAt: z.string().datetime(),
});

export async function POST(req: NextRequest) {
  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await req.json());
  } catch {
    return NextResponse.json({ ok: false, error: "Please enter your name, a valid email, and pick a time." }, { status: 400 });
  }
  const r = await bookAppointment(body.tenantId, body.calendarId, { name: body.name, email: body.email, phone: body.phone, startAt: body.startAt });
  return NextResponse.json(r, { status: r.ok ? 200 : 409 });
}
