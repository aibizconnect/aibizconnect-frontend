import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .limit(1);

    if (error) {
      return NextResponse.json({ connected: false, error });
    }

    return NextResponse.json({
      connected: true,
      sample: data
    });
  } catch (err: any) {
    return NextResponse.json({ connected: false, error: err.message });
  }
}
