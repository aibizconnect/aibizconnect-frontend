"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

/**
 * Onboarding wizard — rebuilt to the Claude Design handoff (AIBizConnect.dc.html). Screens:
 * analyzing → profile → offer → goals → style → generating → reveal. Wrapped in `.abc-ds` so it
 * wears the ABC design system. Wired to the real backend (POST /api/onboarding/start →
 * startOnboarding): Category maps to our industry templateKey; businessName + city drive provisioning.
 * Offer/Goals/Style are captured for later wiring (the API strips unknown keys, so passing them is safe).
 */

type TemplateCard = { key: string; label: string; industry: string; tagline: string; pageCount: number; brandHint: { primary: string; accent: string; mood: string } };
type Screen = "analyzing" | "profile" | "offer" | "goals" | "style" | "generating" | "done";

const WIZARD: Screen[] = ["profile", "offer", "goals", "style"];

const ANALYZE = [
  "Reading your website & social profiles",
  "Pulling your logo & brand colors",
  "Identifying services & products",
  "Collecting your best photos & reviews",
  "Drafting your business profile",
];
const GEN = [
  "Designing your homepage",
  "Writing on-brand page copy",
  "Building your online shop & checkout",
  "Creating lead-capture & booking forms",
  "Setting up email + SMS nurture flows",
  "Connecting Instagram & Facebook",
  "Training your 24/7 AI assistant",
];
const GOALS = [
  { id: "leads", t: "Get more leads", d: "Capture & qualify enquiries" },
  { id: "sell", t: "Sell products online", d: "Shop, cart & checkout" },
  { id: "book", t: "Take bookings", d: "Classes & appointments" },
  { id: "social", t: "Grow on social", d: "Auto-draft & schedule posts" },
  { id: "nurture", t: "Nurture & follow up", d: "Email & SMS sequences" },
  { id: "ai", t: "24/7 AI assistant", d: "Answer & qualify visitors" },
];
const THEMES = [
  { name: "Clean", bg: "#F1F2FE", a: "#3D49C4", b: "#090966" },
  { name: "Warm", bg: "#F4ECE3", a: "#A8443A", b: "#3A2E29" },
  { name: "Mono", bg: "#F5F5F4", a: "#1C1C1C", b: "#6B6B6B" },
];
const DEFAULT_OFFERS = ["Consulting", "Services", "Online Shop"];

const sw = (n: number) => n as unknown as number; // CSS var fontWeight helper

export default function OnboardingWizard({ templates, seed }: { templates: TemplateCard[]; defaultEmail?: string; authed?: boolean; seed?: string }) {
  const [screen, setScreen] = useState<Screen>(seed ? "analyzing" : "profile");
  const [analyzeStep, setAnalyzeStep] = useState(0);
  const [genStep, setGenStep] = useState(0);

  const [businessName, setBusinessName] = useState("");
  const [templateKey, setTemplateKey] = useState(templates[0]?.key ?? "");
  const [tagline, setTagline] = useState("");
  const [about, setAbout] = useState("");
  const [city, setCity] = useState("");
  const [offers, setOffers] = useState<string[]>(DEFAULT_OFFERS);
  const [goals, setGoals] = useState<string[]>(["leads", "sell", "book", "social"]);
  const [theme, setTheme] = useState(0);

  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ previewPath: string; dashboardPath: string; launchpadPath?: string; pages: number } | null>(null);
  const posted = useRef(false);

  // Animated "analyzing" intro (only when a seed URL/handle was carried in).
  useEffect(() => {
    if (screen !== "analyzing") return;
    let i = 0;
    const id = setInterval(() => {
      i += 1; setAnalyzeStep(i);
      if (i >= ANALYZE.length) { clearInterval(id); setTimeout(() => setScreen("profile"), 600); }
    }, 720);
    return () => clearInterval(id);
  }, [screen]);

  // Generating: run the step animation AND fire the real provisioning; reveal when the call resolves.
  useEffect(() => {
    if (screen !== "generating") return;
    let i = 0;
    const id = setInterval(() => { i = Math.min(i + 1, GEN.length); setGenStep(i); if (i >= GEN.length) clearInterval(id); }, 620);
    if (!posted.current) {
      posted.current = true;
      (async () => {
        try {
          const r = await fetch("/api/onboarding/start", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ businessName, templateKey, location: { city }, tagline, about, offers, goals, theme: THEMES[theme]?.name }),
          });
          const j = await r.json();
          if (j.status === "ok" && j.result?.ok) {
            setResult({ previewPath: j.result.previewPath, dashboardPath: j.result.dashboardPath, launchpadPath: j.result.launchpadPath, pages: j.result.apply?.pages?.length ?? 0 });
            setTimeout(() => setScreen("done"), 900);
          } else { setError(j.result?.error ?? j.error ?? "Something went wrong."); setScreen("style"); posted.current = false; }
        } catch (e) { setError((e as Error).message); setScreen("style"); posted.current = false; }
      })();
    }
    return () => clearInterval(id);
  }, [screen, businessName, templateKey, city, tagline, about, offers, goals, theme]);

  const wi = WIZARD.indexOf(screen);
  const canContinue = screen === "profile" ? businessName.trim().length >= 2 && !!templateKey : true;

  function next() { if (wi < WIZARD.length - 1) setScreen(WIZARD[wi + 1]); else setScreen("generating"); }
  function back() { if (wi > 0) setScreen(WIZARD[wi - 1]); else setScreen(seed ? "analyzing" : "profile"); }
  function toggleGoal(id: string) { setGoals((g) => (g.includes(id) ? g.filter((x) => x !== id) : [...g, id])); }

  // ── shared styles ──
  const page: React.CSSProperties = { minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", padding: "28px 24px 60px", background: "radial-gradient(120% 80% at 50% -10%, var(--blue-50) 0%, var(--surface-page) 55%)" };
  const wrap: React.CSSProperties = { width: "100%", maxWidth: 720 };
  const eyebrow: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 7, padding: "5px 12px", borderRadius: 999, background: "var(--blue-50)", fontSize: "var(--text-xs)", fontWeight: sw(700), letterSpacing: "var(--tracking-caps)", textTransform: "uppercase", color: "var(--color-primary)", marginBottom: 14 };
  const h1: React.CSSProperties = { fontSize: "var(--text-3xl)", color: "var(--navy-900)", marginBottom: 8 };
  const sub: React.CSSProperties = { fontSize: "var(--text-md)", color: "var(--text-body)", marginBottom: 28 };
  const card: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 18, background: "var(--surface-card)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-xl)", boxShadow: "var(--shadow-sm)", padding: 24 };
  const lab: React.CSSProperties = { display: "block", fontSize: "var(--text-xs)", fontWeight: sw(700), letterSpacing: "var(--tracking-caps)", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 7 };
  const field: React.CSSProperties = { width: "100%", height: 46, padding: "0 14px", border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)", fontFamily: "var(--font-sans)", fontWeight: sw(600), color: "var(--text-strong)", background: "var(--surface-card)", outline: "none" };
  const primaryBtn: React.CSSProperties = { height: 48, padding: "0 28px", border: "none", borderRadius: "var(--radius-md)", background: "var(--color-primary)", color: "#fff", fontFamily: "var(--font-sans)", fontWeight: sw(600), fontSize: "var(--text-base)", cursor: "pointer", boxShadow: "var(--shadow-brand)", display: "inline-flex", alignItems: "center", gap: 9 };
  const ghostBtn: React.CSSProperties = { height: 48, padding: "0 22px", border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)", background: "var(--surface-card)", color: "var(--text-strong)", fontFamily: "var(--font-sans)", fontWeight: sw(600), fontSize: "var(--text-sm)", cursor: "pointer", boxShadow: "var(--shadow-xs)" };

  const Check = ({ s = 13, c = "#fff" }: { s?: number; c?: string }) => (<svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="3"><path d="M20 6L9 17l-5-5" /></svg>);

  function ProgressList({ items, step }: { items: string[]; step: number }) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {items.map((label, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 13, padding: "11px 12px", borderRadius: "var(--radius-md)" }}>
            {i < step ? (
              <span style={{ width: 24, height: 24, borderRadius: "50%", background: "var(--green-100)", display: "flex", alignItems: "center", justifyContent: "center", flex: "none", animation: "abc-pop .3s var(--ease-spring)" }}><Check c="var(--green-600)" /></span>
            ) : i === step ? (
              <span style={{ width: 24, height: 24, borderRadius: "50%", border: "2.5px solid var(--blue-200)", borderTopColor: "var(--color-primary)", flex: "none", animation: "abc-spin .7s linear infinite" }} />
            ) : (
              <span style={{ width: 24, height: 24, borderRadius: "50%", border: "2px solid var(--gray-200)", flex: "none" }} />
            )}
            <span style={{ fontSize: "var(--text-md)", fontWeight: sw(500), color: i <= step ? "var(--text-strong)" : "var(--text-muted)" }}>{label}</span>
          </div>
        ))}
      </div>
    );
  }

  // ── ANALYZING ──
  if (screen === "analyzing") {
    return (
      <div className="abc-ds" style={{ ...page, justifyContent: "center" }}>
        <div style={{ width: "100%", maxWidth: 560, background: "var(--surface-card)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-2xl)", boxShadow: "var(--shadow-xl)", padding: 40 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 8 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/abc/app-icon.png" alt="" style={{ width: 46, height: 46, animation: "abc-float 2.4s var(--ease-in-out) infinite" }} />
            <div>
              <div style={{ fontFamily: "var(--font-display)", fontWeight: sw(600), fontSize: "var(--text-xl)", color: "var(--navy-900)" }}>Reading your business…</div>
              <div style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>{seed ? seed : "This usually takes a few seconds"}</div>
            </div>
          </div>
          <div style={{ height: 6, background: "var(--gray-100)", borderRadius: 999, overflow: "hidden", margin: "22px 0 28px" }}>
            <div style={{ width: `${(analyzeStep / ANALYZE.length) * 100}%`, height: "100%", background: "var(--gradient-brand)", borderRadius: 999, transition: "width var(--dur-base) var(--ease-out)" }} />
          </div>
          <ProgressList items={ANALYZE} step={analyzeStep} />
        </div>
      </div>
    );
  }

  // ── GENERATING ──
  if (screen === "generating") {
    return (
      <div className="abc-ds" style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, background: "linear-gradient(160deg, var(--navy-900) 0%, var(--blue-700) 100%)" }}>
        <div style={{ width: "100%", maxWidth: 540, textAlign: "center", color: "#fff" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/abc/app-icon.png" alt="" style={{ width: 64, height: 64, margin: "0 auto 26px", display: "block", animation: "abc-float 2.4s var(--ease-in-out) infinite", filter: "drop-shadow(0 12px 28px rgba(0,0,0,.45))" }} />
          <h1 style={{ color: "#fff", fontSize: "var(--text-3xl)", marginBottom: 10 }}>Building your platform</h1>
          <p style={{ color: "var(--blue-200)", fontSize: "var(--text-md)", marginBottom: 30 }}>{genStep} of {GEN.length} systems ready</p>
          <div style={{ height: 8, background: "rgba(255,255,255,.14)", borderRadius: 999, overflow: "hidden", marginBottom: 30 }}>
            <div style={{ width: `${(genStep / GEN.length) * 100}%`, height: "100%", background: "var(--gradient-brand)", borderRadius: 999, transition: "width var(--dur-base) var(--ease-out)" }} />
          </div>
          <div style={{ textAlign: "left", background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.12)", borderRadius: "var(--radius-xl)", padding: 14, display: "flex", flexDirection: "column", gap: 3 }}>
            {GEN.map((label, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 13, padding: "9px 10px" }}>
                {i < genStep ? (
                  <span style={{ width: 22, height: 22, borderRadius: "50%", background: "rgba(31,157,107,.25)", display: "flex", alignItems: "center", justifyContent: "center", flex: "none", animation: "abc-pop .3s var(--ease-spring)" }}><Check s={13} c="#5be0a8" /></span>
                ) : i === genStep ? (
                  <span style={{ width: 22, height: 22, borderRadius: "50%", border: "2.5px solid rgba(255,255,255,.25)", borderTopColor: "#fff", flex: "none", animation: "abc-spin .7s linear infinite" }} />
                ) : (
                  <span style={{ width: 22, height: 22, borderRadius: "50%", border: "2px solid rgba(255,255,255,.18)", flex: "none" }} />
                )}
                <span style={{ fontSize: "var(--text-md)", fontWeight: sw(500), color: "#fff", opacity: i <= genStep ? 1 : 0.6 }}>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── DONE / REVEAL ──
  if (screen === "done" && result) {
    return (
      <div className="abc-ds" style={{ ...page, justifyContent: "center" }}>
        <div style={{ width: "100%", maxWidth: 560, background: "var(--surface-card)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-2xl)", boxShadow: "var(--shadow-xl)", padding: 40, textAlign: "center", animation: "abc-pop .4s var(--ease-spring)" }}>
          <span style={{ width: 56, height: 56, borderRadius: "50%", background: "var(--green-100)", display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 18 }}><Check s={26} c="var(--green-600)" /></span>
          <h1 style={{ fontSize: "var(--text-3xl)", color: "var(--navy-900)", marginBottom: 10 }}>Your platform is ready</h1>
          <p style={{ fontSize: "var(--text-md)", color: "var(--text-body)", marginBottom: 28 }}>
            We generated {result.pages} on-brand page{result.pages === 1 ? "" : "s"} for <strong style={{ color: "var(--text-strong)" }}>{businessName}</strong>, plus your CRM, funnels and AI assistant. It&apos;s a private draft — review, then publish when it&apos;s perfect.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <Link href={result.launchpadPath || result.dashboardPath} style={{ ...primaryBtn, textDecoration: "none" }}>Go to your dashboard →</Link>
            <a href={result.previewPath} target="_blank" rel="noreferrer" style={{ ...ghostBtn, height: 48, display: "inline-flex", alignItems: "center", textDecoration: "none" }}>Preview my site ↗</a>
          </div>
        </div>
      </div>
    );
  }

  // ── WIZARD (profile / offer / goals / style) ──
  return (
    <div className="abc-ds" style={page}>
      <div style={wrap}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 9, textDecoration: "none" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/abc/app-icon.png" alt="" style={{ width: 28, height: 28 }} />
            <span style={{ fontFamily: "var(--font-display)", fontWeight: sw(600), fontSize: "var(--text-md)", color: "var(--navy-900)" }}>AIBiz<span style={{ color: "var(--color-primary)" }}>Connect</span></span>
          </Link>
          <span style={{ fontSize: "var(--text-sm)", fontWeight: sw(600), color: "var(--text-muted)" }}>Step {wi + 1} of 4</span>
        </div>
        <div style={{ height: 6, background: "var(--gray-100)", borderRadius: 999, overflow: "hidden", marginBottom: 34 }}>
          <div style={{ width: `${((wi + 1) / 4) * 100}%`, height: "100%", background: "var(--gradient-brand)", borderRadius: 999, transition: "width var(--dur-slow) var(--ease-out)" }} />
        </div>

        {screen === "profile" && (
          <div style={{ animation: "abc-fade .4s var(--ease-out)" }}>
            <div style={eyebrow}>✨ {seed ? "Pre-filled from your site" : "Tell us about you"}</div>
            <h1 style={h1}>{seed ? "Here's what we found. Look right?" : "Let's set up your business"}</h1>
            <p style={sub}>Tweak anything — these become your homepage and listings.</p>
            <div style={card}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
                <div>
                  <label style={lab}>Business name</label>
                  <input value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="e.g. Marisol Ceramics" style={field} />
                </div>
                <div>
                  <label style={lab}>Category</label>
                  <select value={templateKey} onChange={(e) => setTemplateKey(e.target.value)} style={field}>
                    {templates.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label style={lab}>Tagline ✨</label>
                <input value={tagline} onChange={(e) => setTagline(e.target.value)} placeholder="Handmade, by hand." style={field} />
              </div>
              <div>
                <label style={lab}>About ✨</label>
                <textarea value={about} onChange={(e) => setAbout(e.target.value)} placeholder="A sentence or two about what you do and who you help." style={{ ...field, height: "auto", minHeight: 84, padding: "12px 14px", fontWeight: sw(400), lineHeight: 1.55, resize: "vertical" }} />
              </div>
              <div>
                <label style={lab}>City / Area</label>
                <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. Richmond Hill" style={field} />
              </div>
            </div>
          </div>
        )}

        {screen === "offer" && (
          <div style={{ animation: "abc-fade .4s var(--ease-out)" }}>
            <div style={eyebrow}>✨ Detected from your content</div>
            <h1 style={h1}>What do you offer?</h1>
            <p style={sub}>We&apos;ll turn each of these into a page, a shop listing, or a booking form.</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
              {offers.map((o, i) => (
                <div key={i} style={{ display: "inline-flex", alignItems: "center", gap: 9, padding: "13px 18px", borderRadius: "var(--radius-pill)", background: "var(--surface-card)", border: "1.5px solid var(--color-primary)", color: "var(--navy-900)", fontWeight: sw(600), boxShadow: "var(--shadow-xs)" }}>
                  <Check c="var(--color-primary)" />{o}
                  <span onClick={() => setOffers((arr) => arr.filter((_, j) => j !== i))} style={{ cursor: "pointer", color: "var(--text-muted)", marginLeft: 2 }}>×</span>
                </div>
              ))}
              <button onClick={() => { const v = typeof window !== "undefined" ? window.prompt("Add an offer") : ""; if (v) setOffers((a) => [...a, v]); }} style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "13px 18px", borderRadius: "var(--radius-pill)", background: "transparent", border: "1.5px dashed var(--border-strong)", color: "var(--text-muted)", fontWeight: sw(600), cursor: "pointer" }}>+ Add another</button>
            </div>
          </div>
        )}

        {screen === "goals" && (
          <div style={{ animation: "abc-fade .4s var(--ease-out)" }}>
            <h1 style={h1}>What should your platform do for you?</h1>
            <p style={sub}>Pick your goals — we&apos;ll switch on the right tools. You can change these anytime.</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              {GOALS.map((g) => {
                const sel = goals.includes(g.id);
                return (
                  <button key={g.id} onClick={() => toggleGoal(g.id)} style={{ display: "flex", flexDirection: "column", gap: 6, textAlign: "left", padding: 18, borderRadius: "var(--radius-lg)", cursor: "pointer", background: "var(--surface-card)", transition: "all var(--dur-base) var(--ease-out)", border: `1.5px solid ${sel ? "var(--color-primary)" : "var(--border-subtle)"}`, boxShadow: sel ? "var(--shadow-md)" : "var(--shadow-xs)", fontFamily: "var(--font-sans)" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
                      <span style={{ fontFamily: "var(--font-display)", fontWeight: sw(600), fontSize: "var(--text-md)", color: "var(--navy-900)" }}>{g.t}</span>
                      {sel && <span style={{ width: 22, height: 22, borderRadius: "50%", background: "var(--color-primary)", display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}><Check /></span>}
                    </div>
                    <span style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>{g.d}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {screen === "style" && (
          <div style={{ animation: "abc-fade .4s var(--ease-out)" }}>
            <h1 style={h1}>Pick a look.</h1>
            <p style={sub}>We matched these to your logo and photos. The AI uses your real content either way.</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14 }}>
              {THEMES.map((t, i) => {
                const sel = i === theme;
                return (
                  <div key={t.name} onClick={() => setTheme(i)} style={{ cursor: "pointer", borderRadius: "var(--radius-lg)", overflow: "hidden", background: "var(--surface-card)", transition: "all var(--dur-base) var(--ease-out)", border: `1.5px solid ${sel ? "var(--color-primary)" : "var(--border-subtle)"}`, boxShadow: sel ? "var(--shadow-md)" : "var(--shadow-xs)" }}>
                    <div style={{ height: 120, padding: 14, display: "flex", flexDirection: "column", justifyContent: "flex-end", gap: 7, background: t.bg }}>
                      <div style={{ width: 38, height: 38, borderRadius: 9, background: t.a }} />
                      <div style={{ height: 7, width: "70%", borderRadius: 4, background: t.b, opacity: 0.85 }} />
                      <div style={{ height: 6, width: "50%", borderRadius: 4, background: t.b, opacity: 0.4 }} />
                    </div>
                    <div style={{ padding: "12px 14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ fontWeight: sw(600), color: "var(--text-strong)", fontSize: "var(--text-sm)" }}>{t.name}</span>
                      {sel && <span style={{ width: 20, height: 20, borderRadius: "50%", background: "var(--color-primary)", display: "flex", alignItems: "center", justifyContent: "center" }}><Check s={12} /></span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {error && <p style={{ marginTop: 16, fontSize: "var(--text-sm)", color: "var(--danger)" }}>{error}</p>}

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 34 }}>
          <button onClick={back} style={ghostBtn}>Back</button>
          <button onClick={next} disabled={!canContinue} style={{ ...primaryBtn, opacity: canContinue ? 1 : 0.4, cursor: canContinue ? "pointer" : "not-allowed" }}>
            {screen === "style" ? "✨ Generate my platform" : <>Continue <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4"><path d="M5 12h14M13 6l6 6-6 6" /></svg></>}
          </button>
        </div>
      </div>
    </div>
  );
}
