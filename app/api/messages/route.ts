import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const body = await req.json();

    const { data, error } = await supabase
      .from("messages")
      .insert(body)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ success: false, error });
    }

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message });
  }
}
