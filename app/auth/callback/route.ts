import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Auth callback — exchanges the Supabase `?code=` (email confirmation, magic link,
 * OAuth, password reset) for a session, mirrors the access_token into the legacy
 * `token` cookie, then redirects. Without this, confirmation links land on `/`
 * with an unhandled code and error.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (!code) return NextResponse.redirect(`${origin}/login`);

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.session) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(error?.message ?? "confirmation_failed")}`
    );
  }

  const cookieStore = await cookies();
  cookieStore.set({
    name: "token",
    value: data.session.access_token,
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
    sameSite: "lax",
  });

  return NextResponse.redirect(`${origin}${next}`);
}
