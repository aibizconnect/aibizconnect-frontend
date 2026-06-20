"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { listDomains, addCustomDomain, verifyCustomDomain, publishDomainDns, type DomainRow } from "../../settings/domain-actions";
import { getEmailSettings, saveEmailSettings, verifyEmailDns, autoFixEmailDnsOnCloudflare, type EmailSettingsView, type EmailDnsRecord } from "../../settings/email-actions";
import InfoTip from "@/components/ui/InfoTip";

const inp = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#1e3a8a] focus:outline-none";

/** Plain-language "where do I go / what do I do" help for a DNS record, by type. */
function recordHelp(r: { type: string; name: string; value: string }): { title: string; body: ReactNode } {
  const isDkim = /_domainkey/i.test(r.name) || r.value.trim().startsWith("(");
  const isSpf = /spf1/i.test(r.value);
  const isDmarc = /_dmarc/i.test(r.name);
  const where = (
    <>
      <b>Where:</b> wherever your domain&apos;s DNS lives — usually your registrar (GoDaddy, Namecheap) or
      Cloudflare. Open its <b>DNS</b> page and click <b>Add record</b>.<br />
      <b>How:</b> set <b>Type</b>=<code>{r.type}</code>, <b>Name/Host</b>=<code>{r.name}</code>, <b>Value</b>=the
      value shown here (use the copy buttons), then Save. DNS can take a few minutes to a few hours.
    </>
  );
  if (isDkim) return {
    title: "DKIM (value comes from Resend)",
    body: (
      <>
        Proves your email is really from you. It&apos;s a <b>TXT</b> record holding a long public key —
        Resend generates the value:<br />
        1. Open <b>resend.com → Domains</b> and add <b>{r.name.replace(/^resend\._domainkey\./i, "")}</b>.<br />
        2. On that domain open the <b>Records</b> tab, find the <b>DKIM</b> row (<code>resend._domainkey</code>),
        and copy its <b>Value</b> (starts with <code>p=…</code>).<br />
        3. Add a <b>TXT</b> record at your DNS host: Name <code>{r.name}</code>, Value = that.<br />
        4. Come back and click <b>Verify DNS</b>.
      </>
    ),
  };
  if (isSpf) return { title: "SPF record", body: <>Lets Resend send email as your domain (keeps it out of spam).<br />{where}</> };
  if (isDmarc) return { title: "DMARC record", body: <>Tells inboxes how to handle mail that fails checks. <code>p=none</code> only monitors — safe to start with.<br />{where}</> };
  return { title: `${r.type} record`, body: where };
}

function Pill({ status }: { status: string }) {
  const map: Record<string, string> = {
    active: "bg-emerald-100 text-emerald-700", verified: "bg-emerald-100 text-emerald-700",
    pending_verification: "bg-amber-100 text-amber-700", pending: "bg-amber-100 text-amber-700",
    pending_publish: "bg-sky-100 text-sky-700", failed: "bg-red-100 text-red-700",
  };
  return <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${map[status] ?? "bg-slate-100 text-slate-500"}`}>{status.replace(/_/g, " ")}</span>;
}

/** A copyable DNS record line, with an ⓘ that explains where to add it and what to do. */
function DnsRow({ r }: { r: { type: string; name: string; value: string; status?: string } }) {
  const copy = (t: string) => { try { navigator.clipboard?.writeText(t); } catch { /* ignore */ } };
  const help = recordHelp(r);
  return (
    <div className="grid grid-cols-[64px_1fr_auto] items-center gap-2 rounded-md bg-slate-50 px-2 py-1.5 text-xs">
      <span className="font-semibold text-slate-500">{r.type}</span>
      <span className="min-w-0">
        <button type="button" onClick={() => copy(r.name)} title="Copy name" className="block truncate text-left font-mono text-slate-700 hover:underline">{r.name}</button>
        <button type="button" onClick={() => copy(r.value)} title="Copy value" className="block truncate text-left font-mono text-slate-400 hover:underline">{r.value}</button>
      </span>
      <span className="flex items-center gap-1.5">
        {r.status ? <Pill status={r.status} /> : null}
        <InfoTip title={help.title} align="right">{help.body}</InfoTip>
      </span>
    </div>
  );
}

/**
 * Per-website Domain + Email. Domain/email CREDENTIALS are tenant-owned (DNS via the platform
 * Cloudflare account), but the BINDING is per-website — a site needs its own domain + sender.
 * No DNS is created in draft; the custom domain is verified by TXT, then published (admin) at go-live.
 */
export default function DomainEmailSettings({ tenantId, websiteId }: { tenantId: string; websiteId: string }) {
  const [domains, setDomains] = useState<DomainRow[]>([]);
  const [domainInput, setDomainInput] = useState("");
  const [addRecords, setAddRecords] = useState<{ type: string; name: string; value: string }[] | null>(null);
  const [email, setEmail] = useState<EmailSettingsView | null>(null);
  const [senderName, setSenderName] = useState("");
  const [senderEmail, setSenderEmail] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [emailRecords, setEmailRecords] = useState<EmailDnsRecord[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [d, e] = await Promise.all([listDomains(tenantId, websiteId), getEmailSettings(tenantId)]);
    setDomains(d);
    setEmail(e);
    if (e) { setSenderName(e.sender_name); setSenderEmail(e.sender_email); setEmailRecords(e.dns_records_required); }
  }, [tenantId, websiteId]);

  useEffect(() => { load().catch((x) => setErr(x?.message ?? "Could not load.")); }, [load]);

  const addDomain = async () => {
    setBusy("add"); setErr(null); setMsg(null); setAddRecords(null);
    const r = await addCustomDomain(tenantId, websiteId, domainInput);
    setBusy(null);
    if (!r.ok) { setErr(r.message ?? "Could not add domain."); return; }
    setAddRecords(r.records ?? null);
    setDomainInput("");
    await load();
  };
  const verify = async (id: string) => {
    setBusy(id); setErr(null);
    const r = await verifyCustomDomain(tenantId, id);
    setBusy(null);
    setMsg(r.ok ? "Domain verified ✓" : (r.message ?? "Not verified yet."));
    await load();
  };
  const publish = async (id: string) => {
    setBusy(id); setErr(null); setMsg(null);
    const r = await publishDomainDns(tenantId, id);
    setBusy(null);
    if (!r.ok) { setErr(r.message ?? "Could not publish."); return; }
    setMsg("Published — DNS created, site is live on this domain.");
    await load();
  };

  const saveEmail = async () => {
    setBusy("email"); setErr(null); setMsg(null);
    const r = await saveEmailSettings(tenantId, { sender_name: senderName, sender_email: senderEmail, apiKey: apiKey || undefined });
    setBusy(null);
    if (!r.ok) { setErr(r.message ?? "Could not save email."); return; }
    setApiKey("");
    setEmailRecords(r.records ?? null);
    setMsg("Email settings saved — add the DNS records below, then verify.");
    await load();
  };
  const verifyEmail = async () => {
    setBusy("verifyEmail"); setErr(null);
    const r = await verifyEmailDns(tenantId);
    setBusy(null);
    setEmailRecords(r.records);
    setMsg(r.ok ? "Email DNS verified ✓" : "Some records aren't visible yet — DNS can take a few minutes.");
  };
  const autoFixCf = async () => {
    setBusy("cf"); setErr(null); setMsg(null);
    const r = await autoFixEmailDnsOnCloudflare(tenantId);
    setBusy(null);
    if (r.added.length) setMsg(`${r.message}${r.skipped.length ? ` Still manual: ${r.skipped.join("; ")}.` : ""}`);
    else setErr(r.message ?? "Couldn't add automatically.");
    await load();
  };

  return (
    <div className="space-y-6">
      {(msg || err) && <div className={`rounded-lg border px-3 py-2 text-sm ${err ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>{err || msg}</div>}

      {/* Custom domain with verification */}
      <div>
        <h3 className="text-sm font-semibold text-slate-800">Custom domain</h3>
        <p className="mt-0.5 text-xs text-slate-500">Connect a domain you own. Add the records at your registrar, verify ownership, then publish to go live. No DNS changes happen until you publish.</p>

        <div className="mt-3 flex items-stretch gap-2">
          <input className={inp} value={domainInput} onChange={(e) => setDomainInput(e.target.value.trim())} placeholder="www.yourbusiness.com" />
          <button type="button" disabled={!domainInput || busy === "add"} onClick={addDomain}
            className="flex-none rounded-lg bg-[#1e3a8a] px-4 text-sm font-medium text-white disabled:opacity-40">{busy === "add" ? "…" : "Add"}</button>
        </div>

        {addRecords && (
          <div className="mt-3 space-y-1.5 rounded-lg border border-slate-200 p-3">
            <p className="text-xs font-medium text-slate-600">Add these at your registrar, then click Verify:</p>
            {addRecords.map((r, i) => <DnsRow key={i} r={r} />)}
          </div>
        )}

        {domains.length > 0 && (
          <div className="mt-3 space-y-2">
            {domains.map((d) => (
              <div key={d.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-sm font-medium text-slate-700"><span className="truncate">{d.domain_name}</span><Pill status={d.status} /></div>
                  <div className="text-[11px] text-slate-400">{d.type}</div>
                </div>
                <div className="flex flex-none items-center gap-2">
                  {d.type === "custom" && d.status !== "active" && (
                    <button type="button" disabled={busy === d.id} onClick={() => verify(d.id)} className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50 disabled:opacity-40">Verify</button>
                  )}
                  {(d.status === "verified" || d.status === "pending_publish") && (
                    <button type="button" disabled={busy === d.id} onClick={() => publish(d.id)} className="rounded-md bg-[#1e3a8a] px-2 py-1 text-xs font-medium text-white hover:opacity-90 disabled:opacity-40">Publish</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Email sender identity */}
      <div className="border-t border-slate-100 pt-5">
        <h3 className="text-sm font-semibold text-slate-800">Email sending {email && <Pill status={email.status} />}</h3>
        <p className="mt-0.5 text-xs text-slate-500">Send transactional &amp; marketing email from your own domain via Resend. Add your API key, then verify the SPF/DKIM/DMARC records.</p>

        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1"><span className="text-xs font-medium text-slate-600">Sender name</span>
            <input className={inp} value={senderName} onChange={(e) => setSenderName(e.target.value)} placeholder="AI Biz Connect" /></label>
          <label className="flex flex-col gap-1"><span className="text-xs font-medium text-slate-600">Sender email</span>
            <input className={inp} value={senderEmail} onChange={(e) => setSenderEmail(e.target.value.trim())} placeholder="hello@yourbusiness.com" /></label>
        </div>
        <label className="mt-3 flex flex-col gap-1"><span className="text-xs font-medium text-slate-600">Resend API key {email?.hasSecret && <span className="text-emerald-600">· stored ✓</span>}</span>
          <input className={inp} type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder={email?.hasSecret ? "•••••••• (leave blank to keep)" : "re_…"} /></label>

        <div className="mt-3 flex gap-2">
          <button type="button" disabled={!senderEmail || busy === "email"} onClick={saveEmail}
            className="rounded-lg bg-[#1e3a8a] px-4 py-2 text-sm font-medium text-white disabled:opacity-40">{busy === "email" ? "…" : "Save email settings"}</button>
          {email && <button type="button" disabled={busy === "verifyEmail"} onClick={verifyEmail}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-40">{busy === "verifyEmail" ? "…" : "Verify DNS"}</button>}
        </div>

        {emailRecords && emailRecords.length > 0 && (
          <div className="mt-3 space-y-1.5 rounded-lg border border-slate-200 p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="flex items-center gap-1 text-xs font-medium text-slate-600">
                DNS records to add at your domain
                <InfoTip title="Adding DNS records">
                  These three records authenticate your email (SPF, DMARC, DKIM). Add each one at your DNS
                  host, then click <b>Verify DNS</b>. Tap the ⓘ on any row for exact steps. The DKIM value
                  comes from Resend — that row tells you how to get it.
                </InfoTip>
              </p>
              {email?.cloudflareManaged && (
                <button type="button" disabled={busy === "cf"} onClick={autoFixCf}
                  className="flex-none rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-40"
                  title="Your domain is on our Cloudflare — we'll add the records we can for you">
                  {busy === "cf" ? "Adding…" : "⚡ Add to Cloudflare for me"}
                </button>
              )}
            </div>
            {emailRecords.map((r, i) => <DnsRow key={i} r={r} />)}
            {email?.cloudflareManaged && (
              <p className="pt-1 text-[11px] text-slate-400">Your domain runs on our Cloudflare, so we can add SPF/DMARC for you — DKIM still needs its value from Resend (see the ⓘ).</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
