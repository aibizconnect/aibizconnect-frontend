"use client";

import { useEffect, useState } from "react";
import InfoTip from "@/components/ui/InfoTip";
import RichTextEditor from "@/components/ui/RichTextEditor";
import MediaLibraryRoot from "@/components/media/MediaLibraryRoot";
import {
  getBrandingBundle, saveWorkspaceBranding, saveWorkspacePolicy, saveMyBranding, sendBrandingTest,
} from "./branding-actions";
import type { EmailBranding, EmailBrandingPolicy, MemberEmailBranding, SocialLink } from "@/lib/server/email-branding";

/**
 * Settings → Email Branding (D-404). One screen, two scopes:
 *   • Workspace defaults (owner/admin) — header image, social links, signature, footer image, plus a
 *     per-field LOCK that forces the header / footer / social onto every member.
 *   • My email identity (every user) — their own From, signature, and any field not locked.
 * Applies to outgoing email. The forced unsubscribe (marketing) is added separately at send time.
 */

const lbl = "mb-1 block text-sm font-medium text-slate-700";
const inp = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a]";

const SOCIAL: { value: string; label: string; accent: string }[] = [
  { value: "facebook", label: "Facebook", accent: "#1877F2" },
  { value: "instagram", label: "Instagram", accent: "#E1306C" },
  { value: "linkedin", label: "LinkedIn", accent: "#0A66C2" },
  { value: "youtube", label: "YouTube", accent: "#FF0000" },
  { value: "tiktok", label: "TikTok", accent: "#111111" },
  { value: "x", label: "X", accent: "#111111" },
  { value: "whatsapp", label: "WhatsApp", accent: "#25D366" },
  { value: "website", label: "Website", accent: "#1e3a8a" },
];
const accentOf = (p: string) => SOCIAL.find((s) => s.value === p)?.accent ?? "#475569";
const labelOf = (p: string) => SOCIAL.find((s) => s.value === p)?.label ?? p.replace(/^\w/, (c) => c.toUpperCase());

const imgSrc = (html: string) => html.match(/<img[^>]+src=["']([^"']+)["']/i)?.[1] || "";
const linkHref = (html: string) => html.match(/<a[^>]+href=["']([^"']+)["']/i)?.[1] || "";
const buildImg = (url: string, link: string) => {
  if (!url) return "";
  const img = `<img src="${url}" alt="" style="max-width:100%;display:block;border:0"/>`;
  return link.trim() ? `<a href="${link.trim()}">${img}</a>` : img;
};

type PickTarget = "ws-header" | "ws-footer" | "me-header" | "me-footer" | null;

export default function EmailBrandingSection({ tenantId, onGoEmail }: { tenantId: string; onGoEmail?: () => void }) {
  const [loading, setLoading] = useState(true);
  const [canEdit, setCanEdit] = useState(false);
  const [verifiedSender, setVerifiedSender] = useState<{ email: string; name: string } | null>(null);
  const [verifiedDomain, setVerifiedDomain] = useState<string | null>(null);

  const [ws, setWs] = useState<EmailBranding>({ header: "", signature: "", signatureText: "", footer: "", social: [] });
  const [policy, setPolicy] = useState<EmailBrandingPolicy>({ lockHeader: false, lockFooter: false, lockSocial: false });
  const [me, setMe] = useState<MemberEmailBranding>({ fromName: "", fromEmail: "", header: "", footer: "", signature: "", signatureText: "", social: [] });

  const [pick, setPick] = useState<PickTarget>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [testTo, setTestTo] = useState("");

  useEffect(() => {
    let live = true;
    getBrandingBundle(tenantId).then((b) => {
      if (!live) return;
      setCanEdit(b.canEditWorkspace);
      setWs({ ...b.workspace, social: b.workspace.social ?? [] });
      setPolicy(b.policy);
      setMe(b.member);
      setVerifiedSender(b.verifiedSenderEmail ? { email: b.verifiedSenderEmail, name: b.verifiedSenderName ?? "" } : null);
      setVerifiedDomain(b.verifiedDomain);
      setTestTo(b.myEmail ?? b.verifiedSenderEmail ?? "");
      setLoading(false);
    }).catch(() => { if (live) { setNotice("Could not load email branding."); setLoading(false); } });
    return () => { live = false; };
  }, [tenantId]);

  const flash = (m: string) => { setNotice(m); window.setTimeout(() => setNotice((n) => (n === m ? null : n)), 6000); };

  const applyPick = (url: string) => {
    if (pick === "ws-header") setWs((p) => ({ ...p, header: buildImg(url, linkHref(p.header)) }));
    else if (pick === "ws-footer") setWs((p) => ({ ...p, footer: buildImg(url, linkHref(p.footer)) }));
    else if (pick === "me-header") setMe((p) => ({ ...p, header: buildImg(url, linkHref(p.header)) }));
    else if (pick === "me-footer") setMe((p) => ({ ...p, footer: buildImg(url, linkHref(p.footer)) }));
    setPick(null);
  };

  async function saveWorkspace() {
    setBusy("ws");
    try {
      const r1 = await saveWorkspaceBranding(tenantId, { header: ws.header, signature: ws.signature, signatureText: ws.signatureText, footer: ws.footer, social: ws.social });
      const r2 = await saveWorkspacePolicy(tenantId, policy);
      flash(r1.ok && r2.ok ? "Workspace email branding saved ✓" : (r1.message || r2.message || "Could not save."));
    } finally { setBusy(null); }
  }
  async function saveMine() {
    setBusy("me");
    try {
      const r = await saveMyBranding(tenantId, me);
      flash(r.ok ? (r.message || "Your email identity saved ✓") : (r.message || "Could not save."));
    } finally { setBusy(null); }
  }
  async function sendTest() {
    setBusy("test");
    try { const r = await sendBrandingTest(tenantId, testTo); flash(r.message || (r.ok ? "Sent." : "Could not send.")); }
    finally { setBusy(null); }
  }

  if (loading) return <p className="py-10 text-center text-sm text-slate-400">Loading email branding…</p>;

  // Effective branding for the live preview (member over workspace, honouring locks).
  const eff = {
    header: policy.lockHeader ? ws.header : (me.header.trim() ? me.header : ws.header),
    footer: policy.lockFooter ? ws.footer : (me.footer.trim() ? me.footer : ws.footer),
    signature: me.signature.trim() ? me.signature : ws.signature,
    social: policy.lockSocial ? (ws.social ?? []) : (me.social.length ? me.social : (ws.social ?? [])),
    fromName: me.fromName.trim() || verifiedSender?.name || "",
    fromEmail: (me.fromEmail.trim() && me.fromEmail.split("@")[1]?.toLowerCase() === verifiedDomain ? me.fromEmail : verifiedSender?.email) || "",
  };

  return (
    <div className="max-w-3xl space-y-6">
      <p className="text-sm text-slate-500">
        Branding for your outgoing emails. Set <b>workspace defaults</b> once, optionally <b>lock</b> the header,
        footer and social links so every teammate sends a consistent look — while each person keeps their own
        signature and “From”. <InfoTip title="How this works" align="left">
          The <b>workspace defaults</b> apply to everyone. If you turn on a <b>🔒 lock</b> for the header, footer or
          social links, members can’t change that piece — it’s forced. The <b>signature</b> and <b>From</b> are always
          each member’s own. At send time every email is assembled as: header → message → signature → social links → footer.
        </InfoTip>
      </p>

      {!verifiedSender && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <span>Email sending isn’t verified yet, so branding can’t be sent. Add &amp; verify a sender first.</span>
          {onGoEmail && <button onClick={onGoEmail} className="shrink-0 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-medium text-white">Email Services →</button>}
        </div>
      )}

      {notice && <div className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-700">{notice}</div>}

      {/* ─────────────── Workspace defaults (owner/admin) ─────────────── */}
      {canEdit && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-1 flex items-center gap-2">
            <h2 className="text-base font-semibold text-slate-900">Workspace defaults</h2>
            <span className="rounded-full bg-[#1e3a8a]/10 px-2 py-0.5 text-[11px] font-medium text-[#1e3a8a]">Owner / Admin</span>
          </div>
          <p className="mb-4 text-xs text-slate-500">These apply to everyone on the team. Use the 🔒 locks to force a piece on all members.</p>

          <div className="space-y-5">
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 text-sm text-slate-600">
              <div className="flex items-center gap-2 font-medium text-slate-700">Default “From” identity
                <InfoTip title="From address" align="left">The workspace “From” is your <b>verified sender</b>. Add or change it in <b>Settings → Email Services</b>. Each member can set their own “From” name below; a member’s custom From <b>email</b> only sends if it’s on the same verified domain.</InfoTip>
              </div>
              {verifiedSender
                ? <p className="mt-1">{verifiedSender.name ? `${verifiedSender.name} · ` : ""}<span className="font-mono text-xs">{verifiedSender.email}</span></p>
                : <p className="mt-1 text-amber-700">No verified sender yet — set one in Email Services.</p>}
            </div>

            <ImageField label="Header image" target="ws-header" html={ws.header} disabled={false}
              onChoose={() => setPick("ws-header")} onLink={(l) => setWs((p) => ({ ...p, header: buildImg(imgSrc(p.header), l) }))}
              onHtml={(h) => setWs((p) => ({ ...p, header: h }))} onRemove={() => setWs((p) => ({ ...p, header: "" }))}
              lock={<LockToggle on={policy.lockHeader} set={(v) => setPolicy((p) => ({ ...p, lockHeader: v }))} />} />

            <div>
              <span className={lbl}>Default signature</span>
              <RichTextEditor value={ws.signature} onChange={(h) => setWs((p) => ({ ...p, signature: h }))} placeholder="Jane Agent — Broker, ABC Realty · (416) 555-1234" />
              <details className="mt-2 text-xs text-slate-500"><summary className="cursor-pointer">Plain-text version (for apps that block HTML)</summary>
                <textarea value={ws.signatureText} onChange={(e) => setWs((p) => ({ ...p, signatureText: e.target.value }))} rows={3} className={`${inp} mt-2`} placeholder={"Jane Agent\nBroker, ABC Realty\n(416) 555-1234"} />
              </details>
            </div>

            <SocialField links={ws.social ?? []} disabled={false} onChange={(s) => setWs((p) => ({ ...p, social: s }))}
              lock={<LockToggle on={policy.lockSocial} set={(v) => setPolicy((p) => ({ ...p, lockSocial: v }))} />} />

            <ImageField label="Footer image" target="ws-footer" html={ws.footer} disabled={false}
              onChoose={() => setPick("ws-footer")} onLink={(l) => setWs((p) => ({ ...p, footer: buildImg(imgSrc(p.footer), l) }))}
              onHtml={(h) => setWs((p) => ({ ...p, footer: h }))} onRemove={() => setWs((p) => ({ ...p, footer: "" }))}
              lock={<LockToggle on={policy.lockFooter} set={(v) => setPolicy((p) => ({ ...p, lockFooter: v }))} />} />

            <button onClick={saveWorkspace} disabled={busy === "ws"} className="rounded-lg bg-[#1e3a8a] px-5 py-2 text-sm font-medium text-white disabled:opacity-50">{busy === "ws" ? "Saving…" : "Save workspace defaults"}</button>
          </div>
        </section>
      )}

      {/* ─────────────── My email identity (every member) ─────────────── */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-1 text-base font-semibold text-slate-900">My email identity</h2>
        <p className="mb-4 text-xs text-slate-500">Your personal signature and “From”. Where your workspace hasn’t locked a piece, you can set your own too.</p>

        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block"><span className={lbl}>From name</span>
              <input value={me.fromName} onChange={(e) => setMe((p) => ({ ...p, fromName: e.target.value }))} className={inp} placeholder={verifiedSender?.name || "Jane Agent"} /></label>
            <label className="block"><span className="mb-1 flex items-center gap-1.5 text-sm font-medium text-slate-700">From email
              <InfoTip title="From email" align="right">Optional. To send from your own address it must be on the verified domain{verifiedDomain ? <> <b>@{verifiedDomain}</b></> : null} (e.g. <span className="font-mono">you@{verifiedDomain || "yourdomain.com"}</span>). Otherwise we keep the verified workspace sender and just use your name.</InfoTip></span>
              <input value={me.fromEmail} onChange={(e) => setMe((p) => ({ ...p, fromEmail: e.target.value }))} className={inp} placeholder={verifiedDomain ? `you@${verifiedDomain}` : "you@yourdomain.com"} /></label>
          </div>

          <LockableImage label="Header image" locked={policy.lockHeader} wsHtml={ws.header} myHtml={me.header}
            onChoose={() => setPick("me-header")} onLink={(l) => setMe((p) => ({ ...p, header: buildImg(imgSrc(p.header), l) }))}
            onHtml={(h) => setMe((p) => ({ ...p, header: h }))} onRemove={() => setMe((p) => ({ ...p, header: "" }))} />

          <div>
            <span className={lbl}>My signature</span>
            <RichTextEditor value={me.signature} onChange={(h) => setMe((p) => ({ ...p, signature: h }))} placeholder={ws.signature ? "Leave blank to use the workspace default" : "Your name, title, phone…"} />
            <details className="mt-2 text-xs text-slate-500"><summary className="cursor-pointer">Plain-text version</summary>
              <textarea value={me.signatureText} onChange={(e) => setMe((p) => ({ ...p, signatureText: e.target.value }))} rows={3} className={`${inp} mt-2`} placeholder={"Your name\nTitle\nPhone"} />
            </details>
          </div>

          <LockableSocial locked={policy.lockSocial} wsLinks={ws.social ?? []} myLinks={me.social} onChange={(s) => setMe((p) => ({ ...p, social: s }))} />

          <LockableImage label="Footer image" locked={policy.lockFooter} wsHtml={ws.footer} myHtml={me.footer}
            onChoose={() => setPick("me-footer")} onLink={(l) => setMe((p) => ({ ...p, footer: buildImg(imgSrc(p.footer), l) }))}
            onHtml={(h) => setMe((p) => ({ ...p, footer: h }))} onRemove={() => setMe((p) => ({ ...p, footer: "" }))} />

          <button onClick={saveMine} disabled={busy === "me"} className="rounded-lg bg-[#1e3a8a] px-5 py-2 text-sm font-medium text-white disabled:opacity-50">{busy === "me" ? "Saving…" : "Save my email identity"}</button>
        </div>
      </section>

      {/* ─────────────── Live preview + test ─────────────── */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-base font-semibold text-slate-900">Preview</h2>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="mx-auto max-w-[600px] rounded-lg bg-white p-4 shadow-sm">
            <p className="mb-2 text-[11px] text-slate-400">From: {eff.fromName || "—"} &lt;{eff.fromEmail || "verified sender"}&gt;</p>
            {eff.header && <div className="mb-3 border-b border-slate-100 pb-3" dangerouslySetInnerHTML={{ __html: eff.header }} />}
            <p className="text-sm text-slate-700">This is how your outgoing emails will look. The pieces below come from your settings above.</p>
            {eff.signature && <div className="mt-3 border-t border-slate-100 pt-3 text-sm text-slate-600" dangerouslySetInnerHTML={{ __html: eff.signature }} />}
            {eff.social.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {eff.social.filter((s) => s.platform && s.url).map((s, i) => (
                  <span key={i} className="rounded-md px-2.5 py-1 text-[11px] font-semibold text-white" style={{ background: accentOf(s.platform) }}>{labelOf(s.platform)}</span>
                ))}
              </div>
            )}
            <div className="mt-3 border-t border-slate-100 pt-2 text-[11px] text-slate-400">Unsubscribe (added automatically on marketing emails)</div>
            {eff.footer && <div className="mt-2 text-[11px] text-slate-400" dangerouslySetInnerHTML={{ __html: eff.footer }} />}
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-end gap-2">
          <label className="block flex-1 min-w-[220px]"><span className={lbl}>Send a test to</span>
            <input value={testTo} onChange={(e) => setTestTo(e.target.value)} className={inp} placeholder="you@example.com" /></label>
          <button onClick={sendTest} disabled={busy === "test" || !verifiedSender} className="rounded-lg border border-[#1e3a8a] px-4 py-2 text-sm font-medium text-[#1e3a8a] hover:bg-[#1e3a8a]/5 disabled:opacity-50">{busy === "test" ? "Sending…" : "Send me a preview"}</button>
        </div>
        {!verifiedSender && <p className="mt-1 text-xs text-slate-400">Verify a sender in Email Services to enable test sends.</p>}
      </section>

      {/* Media picker modal */}
      {pick && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4" onClick={() => setPick(null)}>
          <div className="flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <span className="text-sm font-semibold text-slate-800">Choose an image</span>
              <button onClick={() => setPick(null)} className="text-slate-400 hover:text-slate-700">✕</button>
            </div>
            <div className="overflow-y-auto p-3">
              <MediaLibraryRoot tenantId={tenantId} mode="insert" onSelect={applyPick} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── helpers ────────────────────────────────────────────────────────────────────
function LockToggle({ on, set }: { on: boolean; set: (v: boolean) => void }) {
  return (
    <button type="button" onClick={() => set(!on)} title={on ? "Locked — forced on all members" : "Unlocked — members can override"}
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium transition ${on ? "bg-[#1e3a8a] text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}>
      {on ? "🔒 Forced on all" : "🔓 Members can edit"}
    </button>
  );
}

function ImageField({ label, html, onChoose, onLink, onHtml, onRemove, lock, disabled }: {
  label: string; target: string; html: string; disabled: boolean;
  onChoose: () => void; onLink: (l: string) => void; onHtml: (h: string) => void; onRemove: () => void; lock?: React.ReactNode;
}) {
  const src = imgSrc(html);
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-sm font-medium text-slate-700">{label}
          <InfoTip title={label} align="left">Pick an image from your Media Library (a Canva banner exported as PNG/JPG works great). Recommended width ~600px. Optionally add a click-through link.</InfoTip>
        </span>
        {lock}
      </div>
      {html ? (
        <div className="rounded-lg border border-slate-200 p-2">
          <div className="overflow-hidden rounded bg-slate-50" dangerouslySetInnerHTML={{ __html: html }} />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button type="button" onClick={onChoose} disabled={disabled} className="rounded-md border border-slate-300 px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-50">Replace</button>
            <button type="button" onClick={onRemove} disabled={disabled} className="rounded-md border border-slate-300 px-2.5 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50">Remove</button>
            {src && <input defaultValue={linkHref(html)} onBlur={(e) => onLink(e.target.value)} placeholder="Click-through link (optional)" className="flex-1 min-w-[180px] rounded-md border border-slate-300 px-2 py-1 text-xs outline-none focus:border-[#1e3a8a]" />}
          </div>
        </div>
      ) : (
        <button type="button" onClick={onChoose} disabled={disabled} className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-300 py-6 text-sm text-slate-500 hover:border-[#1e3a8a] hover:text-[#1e3a8a] disabled:opacity-50">
          🖼 Choose {label.toLowerCase()}
        </button>
      )}
      <details className="mt-1.5 text-xs text-slate-400"><summary className="cursor-pointer">Edit HTML directly</summary>
        <textarea value={html} onChange={(e) => onHtml(e.target.value)} disabled={disabled} rows={2} className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 font-mono text-[11px] outline-none focus:border-[#1e3a8a] disabled:bg-slate-50" placeholder='<img src="https://…/banner.png" style="max-width:100%"/>' />
      </details>
    </div>
  );
}

/** Member-side image field: shows a read-only forced preview when the workspace has locked it. */
function LockableImage({ label, locked, wsHtml, myHtml, onChoose, onLink, onHtml, onRemove }: {
  label: string; locked: boolean; wsHtml: string; myHtml: string;
  onChoose: () => void; onLink: (l: string) => void; onHtml: (h: string) => void; onRemove: () => void;
}) {
  if (locked) {
    return (
      <div>
        <div className="mb-1 flex items-center gap-2"><span className="text-sm font-medium text-slate-700">{label}</span>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500">🔒 Set by your workspace</span></div>
        {wsHtml ? <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50 p-2" dangerouslySetInnerHTML={{ __html: wsHtml }} />
          : <p className="text-xs text-slate-400">None.</p>}
      </div>
    );
  }
  return <ImageField label={label} target="" html={myHtml} disabled={false} onChoose={onChoose} onLink={onLink} onHtml={onHtml} onRemove={onRemove} />;
}

function SocialField({ links, onChange, lock, disabled }: { links: SocialLink[]; onChange: (s: SocialLink[]) => void; lock?: React.ReactNode; disabled: boolean }) {
  const update = (i: number, patch: Partial<SocialLink>) => onChange(links.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  const add = () => onChange([...links, { platform: "facebook", url: "" }]);
  const remove = (i: number) => onChange(links.filter((_, j) => j !== i));
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-sm font-medium text-slate-700">Social links
          <InfoTip title="Social links" align="left">Add the social profiles to show as a button row in your emails. Paste each full URL (e.g. https://instagram.com/yourbiz).</InfoTip>
        </span>
        {lock}
      </div>
      <div className="space-y-2">
        {links.map((l, i) => (
          <div key={i} className="flex items-center gap-2">
            <select value={l.platform} onChange={(e) => update(i, { platform: e.target.value })} disabled={disabled} className="rounded-lg border border-slate-300 px-2 py-2 text-sm outline-none focus:border-[#1e3a8a] disabled:bg-slate-50">
              {SOCIAL.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
            <input value={l.url} onChange={(e) => update(i, { url: e.target.value })} disabled={disabled} placeholder="https://…" className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#1e3a8a] disabled:bg-slate-50" />
            <button type="button" onClick={() => remove(i)} disabled={disabled} className="rounded-md px-2 py-1 text-slate-400 hover:text-red-600 disabled:opacity-50" title="Remove">✕</button>
          </div>
        ))}
        {!disabled && <button type="button" onClick={add} className="rounded-lg border border-dashed border-slate-300 px-3 py-1.5 text-sm text-slate-500 hover:border-[#1e3a8a] hover:text-[#1e3a8a]">+ Add social link</button>}
      </div>
    </div>
  );
}

/** Member-side social field: read-only forced row when locked. */
function LockableSocial({ locked, wsLinks, myLinks, onChange }: { locked: boolean; wsLinks: SocialLink[]; myLinks: SocialLink[]; onChange: (s: SocialLink[]) => void }) {
  if (locked) {
    return (
      <div>
        <div className="mb-1 flex items-center gap-2"><span className="text-sm font-medium text-slate-700">Social links</span>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500">🔒 Set by your workspace</span></div>
        {wsLinks.length ? (
          <div className="flex flex-wrap gap-1.5">{wsLinks.map((s, i) => <span key={i} className="rounded-md px-2.5 py-1 text-[11px] font-semibold text-white" style={{ background: accentOf(s.platform) }}>{labelOf(s.platform)}</span>)}</div>
        ) : <p className="text-xs text-slate-400">None.</p>}
      </div>
    );
  }
  return <SocialField links={myLinks} onChange={onChange} disabled={false} />;
}
