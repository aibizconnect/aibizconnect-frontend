"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";

/**
 * Self-service password change for the signed-in user. Uses the Supabase browser session
 * (auth.updateUser), so it always targets YOUR real account — even if you're impersonating
 * someone (impersonation is app-level only and never touches the Supabase session).
 */
export default function ChangePassword() {
  const supabase = createClient();
  const [email, setEmail] = useState<string | null>(null);
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (pw.length < 8) { setMsg({ kind: "err", text: "Password must be at least 8 characters." }); return; }
    if (pw !== confirm) { setMsg({ kind: "err", text: "Passwords don't match." }); return; }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) { setMsg({ kind: "err", text: error.message }); return; }
    setPw(""); setConfirm("");
    setMsg({ kind: "ok", text: "Password updated. Use it next time you sign in." });
  }

  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Account</h1>
      {email
        ? <p className="mt-1 text-sm text-slate-500">Signed in as <b>{email}</b></p>
        : <p className="mt-1 text-sm text-amber-600">No active session — sign in first.</p>}

      <form onSubmit={submit} className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-slate-800">Change password</h2>
        <label className="mb-1 block text-xs font-medium text-slate-500">New password</label>
        <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password"
          className="mb-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="At least 8 characters" />
        <label className="mb-1 block text-xs font-medium text-slate-500">Confirm new password</label>
        <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password"
          className="mb-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Re-enter password" />
        {msg && <p className={`mb-3 text-xs ${msg.kind === "ok" ? "text-emerald-600" : "text-rose-600"}`}>{msg.text}</p>}
        <button type="submit" disabled={busy || !email}
          className="rounded-lg bg-[#1e3a8a] px-4 py-2 text-sm font-medium text-white hover:bg-[#1e40af] disabled:opacity-50">
          {busy ? "Updating…" : "Update password"}
        </button>
      </form>
    </div>
  );
}
