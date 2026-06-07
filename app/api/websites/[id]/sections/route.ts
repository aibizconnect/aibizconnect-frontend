import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("website_sections")
    .select("*")
    .eq("website_id", id)
    .order("position", { ascending: true });

  if (error) {
    return NextResponse.json({ success: false, error });
  }

  return NextResponse.json({ success: true, data });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const body = await req.json();

  const { section_type, content, position } = body;

  const { data, error } = await supabase
    .from("website_sections")
    .insert({
      website_id: id,
      section_type,
      content,
      position,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ success: false, error });
  }

  return NextResponse.json({ success: true, data });
}
