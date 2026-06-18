"use client";

import { useState } from "react";
import { v, btnPrimary } from "./Shell";

const PLATFORM_TENANT = "d723a086-eac0-4b61-8742-25313370d0b7";
const inp: React.CSSProperties = { width: "100%", height: 46, border: `1px solid ${v("--border-default")}`, borderRadius: v("--radius-md"), padding: "0 14px", fontSize: v("--text-sm"), color: v("--text-strong"), background: v("--surface-card") };
const lbl: React.CSSProperties = { fontSize: v("--text-xs"), fontWeight: 600, color: v("--text-body"), marginBottom: 6, display: "block" };

/** Functional marketing contact form → POST /api/leads/submit (platform tenant CRM). */
export default function ContactForm() {
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [form, setForm] = useState({ name: "", email: "", phone: "", business: "", message: "" });
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email && !form.phone) { setState("error"); return; }
    setState("sending");
    try {
      const res = await fetch("/api/leads/submit", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId: PLATFORM_TENANT, name: form.name, email: form.email, phone: form.phone, message: form.message, source: "aibizconnect.app contact", fields: { business: form.business } }),
      });
      const j = await res.json().catch(() => ({ ok: false }));
      setState(j.ok ? "done" : "error");
    } catch { setState("error"); }
  };

  if (state === "done") {
    return (
      <div style={{ background: v("--surface-card"), border: `1px solid ${v("--border-subtle")}`, borderRadius: v("--radius-xl"), boxShadow: v("--shadow-sm"), padding: 36, textAlign: "center" }}>
        <div style={{ display: "grid", placeItems: "center", width: 56, height: 56, margin: "0 auto", borderRadius: 999, background: v("--green-100"), color: v("--green-600"), fontSize: 26 }}>✓</div>
        <h3 style={{ marginTop: 16, fontSize: v("--text-xl"), color: v("--text-strong") }}>Thanks — we've got it.</h3>
        <p style={{ marginTop: 8, fontSize: v("--text-sm"), color: v("--text-body") }}>Our team will be in touch shortly. Want to get started now? You can build your platform free.</p>
        <a href="/start" style={{ ...btnPrimary, marginTop: 20, display: "inline-flex" }}>Start free</a>
      </div>
    );
  }

  return (
    <form onSubmit={submit} style={{ background: v("--surface-card"), border: `1px solid ${v("--border-subtle")}`, borderRadius: v("--radius-xl"), boxShadow: v("--shadow-sm"), padding: 28 }}>
      <div className="grid gap-4 sm:grid-cols-2">
        <label><span style={lbl}>Name</span><input style={inp} value={form.name} onChange={set("name")} placeholder="Your name" /></label>
        <label><span style={lbl}>Business</span><input style={inp} value={form.business} onChange={set("business")} placeholder="Company" /></label>
        <label><span style={lbl}>Email</span><input style={inp} type="email" value={form.email} onChange={set("email")} placeholder="you@business.com" /></label>
        <label><span style={lbl}>Phone</span><input style={inp} value={form.phone} onChange={set("phone")} placeholder="(555) 555-5555" /></label>
      </div>
      <label style={{ display: "block", marginTop: 16 }}><span style={lbl}>How can we help?</span>
        <textarea value={form.message} onChange={set("message")} placeholder="Tell us about your business…" style={{ ...inp, height: 120, padding: "12px 14px", resize: "vertical" }} /></label>
      {state === "error" && <p style={{ marginTop: 12, fontSize: v("--text-sm"), color: v("--danger") }}>Please add an email or phone so we can reach you.</p>}
      <button type="submit" disabled={state === "sending"} style={{ ...btnPrimary, marginTop: 18, width: "100%", opacity: state === "sending" ? 0.6 : 1 }}>
        {state === "sending" ? "Sending…" : "Send message"}
      </button>
      <p style={{ marginTop: 12, fontSize: v("--text-xs"), color: v("--text-muted"), textAlign: "center" }}>We'll never share your details. Prefer to dive in? <a href="/start" style={{ color: v("--color-primary"), fontWeight: 600 }}>Start free →</a></p>
    </form>
  );
}
