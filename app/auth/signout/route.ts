import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// POST /auth/signout — end the Supabase session and clear the legacy `token` cookie.
export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  const cookieStore = await cookies();
  cookieStore.set({ name: "token", value: "", path: "/", maxAge: 0 });
  return NextResponse.redirect(new URL("/login", request.url), { status: 303 });
}
