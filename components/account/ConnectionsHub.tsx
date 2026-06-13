"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { saveImapAction, deleteConnectionAction } from "@/app/tenants/[tenantId]/account/connections/actions";
import type { UserConnectionView } from "@/lib/server/user-connections";

/**
 * Per-seat "My Connections" hub (D-337..341). Each user connects THEIR OWN email / calendar /
 * drive — only they can see or manage these. Email uses a universal IMAP/SMTP form (covers
 * Gmail, Outlook, iCloud/iOS Mail, and any provider via an app-password). Calendar links to the
 * Calendars area where OAuth lives today; Drive/OneDrive/Dropbox are honest "soon".
 */

const EMAIL_PRESETS: Record<string, { label: string; imapHost: string; imapPort: number; smtpHost: string; smtpPort: number; note: string }> = {
  gmail: { label: "Gmail", imapHost: "imap.gmail.com", imapPort: 993, smtpHost: "smtp.gmail.com", smtpPort: 587, note: "Use a Google App Password (Account → Security → App passwords), not your normal password." },
  outlook: { label: "Outlook / Microsoft 365", imapHost: "outlook.office365.com", imapPort: 993, smtpHost: "smtp.office365.com", smtpPort: 587, note: "If 2FA is on, create an app password." },
  icloud: { label: "iCloud / iOS Mail", imapHost: "imap.mail.me.com", imapPort: 993, smtpHost: "smtp.mail.me.com", smtpPort: 587, note: "Generate an app-specific password at appleid.apple.com." },
  yahoo: { label: "Yahoo", imapHost: "imap.mail.yahoo.com", imapPort: 993, smtpHost: "smtp.mail.yahoo.com", smtpPort: 587, note: "Use a Yahoo app password." },
  other: { label: "Other (IMAP)", imapHost: "", imapPort: 993, smtpHost: "", smtpPort: 587, note: "Enter your provider's IMAP & SMTP settings." },
};

const inp = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#1e3a8a] focus:outline-none focus:ring-1 focus:ring-[#1e3a8a]";

function StatusDot({ ok }: { ok: boolean }) {
  return <span className={`inline-block h-2 w-2 rounded-full ${ok ? "bg-emerald-500" : "bg-slate-300"}`} />;
}

export default function ConnectionsHub({ tenantId, initial }: { tenantId: string; initial: UserConnectionView[] }) {
  const [conns, setConns] = useState<UserConnectionView[]>(initial);
  const [emailOpen, setEmailOpen] = useState(false);
  const emailConns = useMemo(() => conns.filter((c) => c.provider === "imap_smtp"), [conns]);

  async function disconnect(id: string) {
    if (!confirm("Disconnect this account?")) return;
    setConns(await deleteConnectionAction(tenantId, id));
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900">My Connections</h1>
      <p className="mb-6 text-sm text-slate-500">Connect your own email, calendar and files. These are personal to you — only you can see or use them. (Company-wide integrations like Twilio or Stripe live in Settings.)</p>

      {/* ── Email ── */}
      <section className="mb-6">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">Email</h2>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          {emailConns.length > 0 && (
            <div className="mb-3 space-y-2">
              {emailConns.map((c) => (
                <div key={c.id} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2">
                  <div className="flex items-center gap-2 text-sm"><StatusDot ok={c.status === "connected"} /><span className="font-medium text-slate-800">{c.accountEmail}</span><span className="text-xs text-slate-400">IMAP/SMTP</span></div>
                  <button onClick={() => disconnect(c.id)} className="rounded-md px-2 py-1 text-xs text-red-500 hover:bg-red-50">Disconnect</button>
                </div>
              ))}
            </div>
          )}
          {!emailOpen ? (
            <button onClick={() => setEmailOpen(true)} className="rounded-lg bg-[#1e3a8a] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#1b337a]">+ Connect an email account</button>
          ) : (
            <EmailForm tenantId={tenantId} onClose={() => setEmailOpen(false)} onSaved={(list) => { setConns(list); setEmailOpen(false); }} />
          )}
          <p className="mt-2 text-xs text-slate-400">Works with Gmail, Outlook/Microsoft 365, iCloud (iOS Mail) and any IMAP provider — using an app-password. Credentials are encrypted.</p>
        </div>
      </section>

      {/* ── Calendar ── */}
      <section className="mb-6">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">Calendar</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <ProviderCard label="Google Calendar" sub="Sync availability & bookings" accent="#4285F4">
            <Link href={`/tenants/${tenantId}/calendars`} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-[#1e3a8a] hover:bg-slate-50">Connect →</Link>
          </ProviderCard>
          <ProviderCard label="Microsoft / Outlook Calendar" sub="Sync availability & bookings" accent="#0078D4">
            <Link href={`/tenants/${tenantId}/calendars`} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-[#1e3a8a] hover:bg-slate-50">Connect →</Link>
          </ProviderCard>
        </div>
        <p className="mt-1 text-xs text-slate-400">Calendar connections (Google & Microsoft) are set up in the Calendars area.</p>
      </section>

      {/* ── Files / Drive ── */}
      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">Files</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <ProviderCard label="Google Drive" sub="Attach & import files" accent="#0F9D58" soon />
          <ProviderCard label="OneDrive" sub="Attach & import files" accent="#0078D4" soon />
          <ProviderCard label="Dropbox" sub="Attach & import files" accent="#0061FF" soon />
        </div>
      </section>
    </div>
  );
}

function ProviderCard({ label, sub, accent, soon, children }: { label: string; sub: string; accent: string; soon?: boolean; children?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center gap-3">
        <span className="grid h-9 w-9 place-items-center rounded-lg text-sm font-bold text-white" style={{ background: accent }}>{label[0]}</span>
        <div><div className="text-sm font-semibold text-slate-800">{label}</div><div className="text-xs text-slate-400">{sub}</div></div>
      </div>
      {soon ? <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-400">soon</span> : children}
    </div>
  );
}

function EmailForm({ tenantId, onClose, onSaved }: { tenantId: string; onClose: () => void; onSaved: (list: UserConnectionView[]) => void }) {
  const [preset, setPreset] = useState("gmail");
  const p = EMAIL_PRESETS[preset];
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [imapHost, setImapHost] = useState(p.imapHost);
  const [imapPort, setImapPort] = useState(p.imapPort);
  const [smtpHost, setSmtpHost] = useState(p.smtpHost);
  const [smtpPort, setSmtpPort] = useState(p.smtpPort);
  const [adv, setAdv] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function applyPreset(key: string) {
    setPreset(key); const x = EMAIL_PRESETS[key];
    setImapHost(x.imapHost); setImapPort(x.imapPort); setSmtpHost(x.smtpHost); setSmtpPort(x.smtpPort);
  }
  async function save() {
    if (!email || !password || !imapHost) { setErr("Email, host and app-password are required."); return; }
    setBusy(true); setErr(null);
    try {
      const r = await saveImapAction(tenantId, { email, imapHost, imapPort, imapUser: email, imapPass: password, smtpHost: smtpHost || imapHost, smtpPort, smtpUser: email, smtpPass: password });
      if (!r.ok) setErr(r.error ?? "Could not save."); else onSaved(r.connections);
    } finally { setBusy(false); }
  }

  return (
    <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
      <label className="block text-sm"><span className="mb-1 block text-xs text-slate-500">Provider</span>
        <select value={preset} onChange={(e) => applyPreset(e.target.value)} className={inp}>{Object.entries(EMAIL_PRESETS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select>
      </label>
      <div className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">{p.note}</div>
      <div className="grid grid-cols-2 gap-2">
        <label className="block text-sm"><span className="mb-1 block text-xs text-slate-500">Email address</span><input value={email} onChange={(e) => setEmail(e.target.value.trim())} className={inp} placeholder="you@gmail.com" /></label>
        <label className="block text-sm"><span className="mb-1 block text-xs text-slate-500">App password</span><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className={inp} placeholder="app-specific password" /></label>
      </div>
      <button onClick={() => setAdv((a) => !a)} className="text-xs font-medium text-[#1e3a8a] hover:underline">{adv ? "Hide" : "Advanced (host/port)"}</button>
      {adv && (
        <div className="grid grid-cols-2 gap-2">
          <label className="block text-xs"><span className="mb-1 block text-slate-500">IMAP host</span><input value={imapHost} onChange={(e) => setImapHost(e.target.value.trim())} className={inp} /></label>
          <label className="block text-xs"><span className="mb-1 block text-slate-500">IMAP port</span><input type="number" value={imapPort} onChange={(e) => setImapPort(Number(e.target.value))} className={inp} /></label>
          <label className="block text-xs"><span className="mb-1 block text-slate-500">SMTP host</span><input value={smtpHost} onChange={(e) => setSmtpHost(e.target.value.trim())} className={inp} /></label>
          <label className="block text-xs"><span className="mb-1 block text-slate-500">SMTP port</span><input type="number" value={smtpPort} onChange={(e) => setSmtpPort(Number(e.target.value))} className={inp} /></label>
        </div>
      )}
      {err && <div className="rounded-md bg-rose-50 px-3 py-1.5 text-xs text-rose-700">{err}</div>}
      <div className="flex justify-end gap-2">
        <button onClick={onClose} className="rounded-lg px-3 py-1.5 text-sm text-slate-500 hover:text-slate-800">Cancel</button>
        <button onClick={save} disabled={busy} className="rounded-lg bg-[#1e3a8a] px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50">{busy ? "Saving…" : "Connect"}</button>
      </div>
    </div>
  );
}
