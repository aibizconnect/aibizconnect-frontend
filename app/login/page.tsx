"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

/**
 * Real authentication (Supabase Auth) — login + signup + password reset.
 *
 * On a successful session we ALSO mirror the Supabase access_token into a
 * non-httpOnly `token` cookie (and localStorage) because the existing backend
 * calls (lib/tenant.ts, WorkflowBuilder) send `Authorization: Bearer <token>`.
 * The backend must be configured to VERIFY this JWT with the Supabase JWT secret
 * (set JWT_PUBLIC_KEY) — see docs/auth-foundation-design.md. Supabase JWTs carry
 * `sub` (user id) and `email`.
 *
 * NOTE: this is the functional auth foundation; visual design comes in the design
 * pass. It does NOT create accounts for you — you sign up here yourself.
 */
function persistToken(accessToken: string | undefined) {
  if (!accessToken) return;
  // 1 week; non-httpOnly so next/headers cookies() (SSR) and the client can read it.
  document.cookie = `token=${accessToken}; path=/; max-age=${60 * 60 * 24 * 7}; samesite=lax`;
  try { localStorage.setItem("token", accessToken); } catch {}
}

export default function LoginPage() {
  const supabase = createClient();
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Where to send the user after auth: honor a safe ?next= (set by middleware on a
  // protected redirect), else the post-login landing (/home resolves the right workspace).
  function destination() {
    if (typeof window !== "undefined") {
      const next = new URLSearchParams(window.location.search).get("next");
      if (next && next.startsWith("/") && !next.startsWith("//")) return next;
    }
    return "/home";
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      if (mode === "signup") {
        // Route the confirmation link through our callback handler (which exchanges the ?code= for a
        // session) instead of the project's Site URL root. Origin-relative so it's correct on both
        // localhost and prod — the matching URLs must also be on Supabase's Redirect-URL allowlist.
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(destination())}` },
        });
        if (error) throw error;
        if (data.session) {
          persistToken(data.session.access_token);
          router.push(destination());
          return;
        }
        setMsg("Check your email to confirm your account, then sign in.");
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        persistToken(data.session?.access_token);
        router.push(destination());
      }
    } catch (err: any) {
      setMsg(err?.message ?? "Authentication failed.");
    } finally {
      setBusy(false);
    }
  }

  async function resetPassword() {
    if (!email) { setMsg("Enter your email first."); return; }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: typeof window !== "undefined" ? `${window.location.origin}/login` : undefined,
    });
    setMsg(error ? error.message : "Password reset email sent.");
  }

  return (
    <main style={{ maxWidth: 380, margin: "10vh auto", fontFamily: "Inter, system-ui, sans-serif" }}>
      <h1 style={{ fontSize: 24, marginBottom: 4 }}>
        {mode === "signin" ? "Sign in" : "Create your account"}
      </h1>
      <p style={{ color: "#666", marginBottom: 20 }}>AIBizConnect</p>
      <form onSubmit={submit} style={{ display: "grid", gap: 12 }}>
        <input type="email" required placeholder="Email" value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ padding: 10, border: "1px solid #ccc", borderRadius: 8 }} />
        <input type="password" required placeholder="Password" value={password}
          onChange={(e) => setPassword(e.target.value)} minLength={8}
          style={{ padding: 10, border: "1px solid #ccc", borderRadius: 8 }} />
        <button type="submit" disabled={busy}
          style={{ padding: 10, background: "#0F62FE", color: "#fff", border: 0, borderRadius: 8, cursor: "pointer" }}>
          {busy ? "…" : mode === "signin" ? "Sign in" : "Sign up"}
        </button>
      </form>
      <div style={{ marginTop: 14, fontSize: 14, display: "flex", justifyContent: "space-between" }}>
        <button onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          style={{ background: "none", border: 0, color: "#0F62FE", cursor: "pointer", padding: 0 }}>
          {mode === "signin" ? "Need an account? Sign up" : "Have an account? Sign in"}
        </button>
        {mode === "signin" && (
          <button onClick={resetPassword}
            style={{ background: "none", border: 0, color: "#666", cursor: "pointer", padding: 0 }}>
            Forgot password?
          </button>
        )}
      </div>
      {msg && <p style={{ marginTop: 16, color: "#393939", fontSize: 14 }}>{msg}</p>}
    </main>
  );
}
