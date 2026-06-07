"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { checkSubdomain, createWebsiteFromWizard, enrichFromPresence } from "@/app/tenants/[tenantId]/website/wizard-actions";
import {
  normalizeSubdomain, SUBDOMAIN_BASE, BRAND_TONES, TEMPLATE_FAMILIES, FAMILY_THEME, COUNTRIES,
  audienceSuggestionsFor, plannedPages,
  type WizardPayload, type SubdomainCheck, type EnrichedProfile,
} from "@/lib/sites/wizard-shared";

/** GHL-style onboarding wizard. DRAFT-ONLY — creates a website, no publish/DNS/charge. */

const STEPS = ["Start", "Basics", "Design & Plan", "Subdomain", "Review"] as const;

const TONE_LABEL: Record<string, string> = {
  professional: "Professional", friendly: "Friendly", luxury: "Luxury", bold: "Bold", minimal: "Minimal",
};
const FAMILY_LABEL: Record<string, string> = {
  realtor: "Real Estate", agency: "Agency", "local-service": "Local Service",
  portfolio: "Portfolio", startup: "Startup",
};
const PLAN_KIND_LABEL: Record<string, string> = { core: "Core", seo: "SEO", funnel: "Funnel" };
const PLAN_KIND_CLS: Record<string, string> = {
  core: "bg-[#1e3a8a]/10 text-[#1e3a8a]", seo: "bg-emerald-100 text-emerald-700", funnel: "bg-amber-100 text-amber-700",
};

const input = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#1e3a8a] focus:ring-1 focus:ring-[#1e3a8a]";
const label = "mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500";

export default function WebsiteWizard({ tenantId }: { tenantId: string }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Form state.
  const [businessName, setBusinessName] = useState("");
  const [industry, setIndustry] = useState("");
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [audience, setAudience] = useState("");
  const [services, setServices] = useState("");
  const [businessDescription, setBusinessDescription] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const audienceSuggestions = audienceSuggestionsFor(industry, businessDescription, services);

  const [existingUrl, setExistingUrl] = useState("");
  const [existingBlog, setExistingBlog] = useState("");
  const [socialLinks, setSocialLinks] = useState<string[]>([""]);
  const [analyzing, setAnalyzing] = useState(false);
  const [enrich, setEnrich] = useState<EnrichedProfile | null>(null);

  const [tone, setTone] = useState<string>("professional");
  const [aiConsent, setAiConsent] = useState(true);
  const [templateFamily, setTemplateFamily] = useState<string>("realtor");
  const fam = FAMILY_THEME[templateFamily as keyof typeof FAMILY_THEME] ?? FAMILY_THEME.realtor;
  const [primaryColor, setPrimaryColor] = useState(FAMILY_THEME.realtor.primary);
  const [makePublicNow, setMakePublicNow] = useState(false);

  const [subdomainRaw, setSubdomainRaw] = useState("");
  const [check, setCheck] = useState<SubdomainCheck | null>(null);
  const [checking, setChecking] = useState(false);
  const normalized = normalizeSubdomain(subdomainRaw);

  // Upfront enrichment: read the existing site, then PRE-FILL the whole wizard (description, socials,
  // logo, name, industry, services, audience, brand color, tone, template).
  const analyze = () => {
    setAnalyzing(true); setEnrich(null);
    start(async () => {
      try {
        const p = await enrichFromPresence(tenantId, { websiteUrl: existingUrl, blogUrl: existingBlog, socialLinks: socialLinks.filter((s) => s.trim()), businessDescription: businessDescription.trim() || undefined });
        setEnrich(p);
        if (p.businessName) setBusinessName(p.businessName);
        if (p.description) setBusinessDescription(p.description);
        if (p.industry) setIndustry(p.industry);
        if (p.services) setServices(p.services);
        if (p.audience) setAudience(p.audience);
        if (p.country) setCountry(p.country);
        if (p.city) setCity(p.city);
        if (p.tone) setTone(p.tone);
        if (p.logoUrl) setLogoUrl(p.logoUrl);
        if (p.socialLinks?.length) setSocialLinks(p.socialLinks);
        if (p.templateFamily) setTemplateFamily(p.templateFamily);
        if (p.primaryColor && /^#[0-9a-fA-F]{6}$/.test(p.primaryColor)) setPrimaryColor(p.primaryColor);
      } finally { setAnalyzing(false); }
    });
  };

  const toggleAudience = (a: string) => {
    const parts = audience.split(",").map((x) => x.trim()).filter(Boolean);
    const has = parts.some((p) => p.toLowerCase() === a.toLowerCase());
    setAudience((has ? parts.filter((p) => p.toLowerCase() !== a.toLowerCase()) : [...parts, a]).join(", "));
  };
  const audienceHas = (a: string) => audience.toLowerCase().includes(a.toLowerCase());

  const runCheck = () => {
    setChecking(true);
    start(async () => {
      try { setCheck(await checkSubdomain(subdomainRaw)); }
      finally { setChecking(false); }
    });
  };

  const canNext = (): boolean => {
    switch (step) {
      case 0: return !!businessDescription.trim(); // need a couple sentences to tailor everything
      case 1: return !!businessName.trim() && !!industry.trim() && !!country.trim();
      case 3: return !!check?.available && check.normalized === normalized && normalized.length >= 3;
      default: return true;
    }
  };

  const submit = () => {
    setError(null);
    const payload: WizardPayload = {
      businessName, industry, country, city, audience, services,
      businessDescription: businessDescription.trim() || undefined,
      logoUrl: logoUrl.trim() || undefined,
      tone: tone as WizardPayload["tone"],
      hasWebsite: !!existingUrl.trim(), existingUrl, existingBlog,
      socialLinks: socialLinks.filter((s) => s.trim()),
      aiConsent,
      subdomain: normalized,
      templateFamily: templateFamily as WizardPayload["templateFamily"],
      primaryColor, makePublicNow,
    };
    start(async () => {
      const res = await createWebsiteFromWizard(tenantId, payload);
      if (!res.ok || !res.websiteId) { setError(res.error || "Could not create website."); return; }
      router.push(`/tenants/${tenantId}/website/${res.websiteId}`);
    });
  };

  const plan = plannedPages();

  return (
    <div className="mx-auto max-w-2xl">
      {/* Stepper */}
      <ol className="mb-8 flex items-center gap-2 text-xs">
        {STEPS.map((s, i) => (
          <li key={s} className="flex flex-1 items-center gap-2">
            <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full font-semibold ${
              i < step ? "bg-[#1e3a8a] text-white" : i === step ? "bg-[#1e3a8a]/10 text-[#1e3a8a] ring-1 ring-[#1e3a8a]" : "bg-slate-100 text-slate-400"}`}>
              {i < step ? "✓" : i + 1}
            </span>
            <span className={`hidden sm:block ${i === step ? "font-semibold text-slate-800" : "text-slate-400"}`}>{s}</span>
            {i < STEPS.length - 1 && <span className="h-px flex-1 bg-slate-200" />}
          </li>
        ))}
      </ol>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        {/* STEP 0 — Start: existing presence FIRST → AI pre-fills everything */}
        {step === 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-900">Let&apos;s start with what you already have</h2>
            <p className="text-sm text-slate-500">Drop your website (or blog) and hit <strong>Analyze</strong> — our AI reads it and fills in your description, socials, logo, colors, and the rest of this wizard. <strong>No website yet?</strong> Just type a couple sentences below and continue.</p>
            <div>
              <label className={label}>Existing website</label>
              <div className="flex items-stretch gap-2">
                <input className={input} value={existingUrl} onChange={(e) => { setExistingUrl(e.target.value); setEnrich(null); }} placeholder="https://yourbusiness.com" />
                <button type="button" onClick={analyze} disabled={analyzing || (!existingUrl.trim() && !existingBlog.trim())}
                  className="flex-none rounded-lg bg-[#1e3a8a] px-4 text-sm font-semibold text-white hover:bg-[#1e3a8a]/90 disabled:opacity-50">
                  {analyzing ? "Analyzing…" : "✨ Analyze"}
                </button>
              </div>
              {enrich && (
                <p className={`mt-2 rounded-lg px-3 py-2 text-xs ${enrich.found ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{enrich.notes}</p>
              )}
            </div>
            <div>
              <label className={label}>Existing blog <span className="font-normal text-slate-400">(optional)</span></label>
              <input className={input} value={existingBlog} onChange={(e) => setExistingBlog(e.target.value)} placeholder="https://yourbusiness.com/blog" />
            </div>

            <div className="border-t border-slate-100 pt-4">
              <label className={label}>What does your business do? *</label>
              <textarea className={input} rows={3} value={businessDescription} onChange={(e) => setBusinessDescription(e.target.value)}
                placeholder="e.g. We help small businesses automate operations and capture leads with AI and done-for-you GoHighLevel systems." />
              <p className="mt-1 text-xs text-slate-400">{enrich?.description ? "✨ Pre-filled from your site — edit anything." : "We use this to tailor your industry, audience suggestions, and AI copy."}</p>
            </div>

            <div>
              <label className={label}>Social media {enrich?.socialLinks?.length ? <span className="font-normal text-emerald-600">✨ found on your site</span> : null}</label>
              {socialLinks.map((lnk, i) => (
                <div key={i} className="mb-2 flex gap-2">
                  <input className={input} value={lnk}
                    onChange={(e) => setSocialLinks(socialLinks.map((s, j) => (j === i ? e.target.value : s)))}
                    placeholder="https://instagram.com/…" />
                  {socialLinks.length > 1 && (
                    <button type="button" onClick={() => setSocialLinks(socialLinks.filter((_, j) => j !== i))}
                      className="rounded-lg border border-slate-300 px-3 text-slate-500 hover:bg-slate-50">×</button>
                  )}
                </div>
              ))}
              <button type="button" onClick={() => setSocialLinks([...socialLinks, ""])} className="text-sm font-medium text-[#1e3a8a]">＋ Add another</button>
            </div>
          </div>
        )}

        {/* STEP 1 — Basics (pre-filled by analyze when available) */}
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-900">Tell us about your business</h2>
            {enrich?.found && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700">✨ We pre-filled these from your site — edit anything.</p>}
            <div>
              <label className={label}>Business name *</label>
              <input className={input} value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="Ali Realty Group" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={label}>Industry *</label>
                <input className={input} value={industry} onChange={(e) => setIndustry(e.target.value)} placeholder="Real estate" />
              </div>
              <div>
                <label className={label}>Country *</label>
                <select className={input} value={country} onChange={(e) => setCountry(e.target.value)}>
                  <option value="">Select a country…</option>
                  {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className={label}>City</label>
                <input className={input} value={city} onChange={(e) => setCity(e.target.value)} placeholder="Toronto" />
              </div>
              <div>
                <label className={label}>Brand tone</label>
                <select className={input} value={tone} onChange={(e) => setTone(e.target.value)}>
                  {BRAND_TONES.map((t) => <option key={t} value={t}>{TONE_LABEL[t]}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className={label}>Target audience</label>
              <input className={input} value={audience} onChange={(e) => setAudience(e.target.value)} placeholder="Who do you serve? (pick below or type your own)" />
              <div className="mt-2 flex flex-wrap gap-1.5">
                {audienceSuggestions.map((a) => {
                  const on = audienceHas(a);
                  return (
                    <button key={a} type="button" onClick={() => toggleAudience(a)}
                      className={`rounded-full border px-2.5 py-1 text-xs transition ${on ? "border-[#1e3a8a] bg-[#1e3a8a]/10 text-[#1e3a8a]" : "border-slate-300 text-slate-600 hover:border-slate-400"}`}>
                      {on ? "✓ " : "+ "}{a}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <label className={label}>Services / what you offer</label>
              <textarea className={input} rows={2} value={services} onChange={(e) => setServices(e.target.value)} placeholder="Buyer representation, listings, valuations…" />
            </div>
          </div>
        )}

        {/* STEP 2 — Design & Plan: brand choices + the build plan, then AI builds */}
        {step === 2 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Your design &amp; build plan</h2>
              <p className="text-sm text-slate-500">Here&apos;s what the AI will build. Adjust the brand below, then continue.</p>
            </div>

            {/* Brand identity */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={label}>Full business name</label>
                <input className={input} value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="Your business, LLC" />
              </div>
              <div>
                <label className={label}>Logo URL <span className="font-normal text-slate-400">(important)</span></label>
                <input className={input} value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://…/logo.png" />
              </div>
            </div>
            {logoUrl.trim() && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="Logo preview" className="h-12 w-auto rounded border border-slate-200 bg-white object-contain p-1" />
            )}

            {/* Template family / palette */}
            <div>
              <label className={label}>Starting look</label>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {TEMPLATE_FAMILIES.map((f) => {
                  const ft = FAMILY_THEME[f];
                  return (
                    <button key={f} type="button" onClick={() => { setTemplateFamily(f); setPrimaryColor(ft.primary); }}
                      className={`rounded-xl border p-3 text-left text-sm transition ${templateFamily === f ? "border-[#1e3a8a] ring-1 ring-[#1e3a8a]" : "border-slate-200 hover:border-slate-300"}`}>
                      <span className="mb-2 flex h-8 w-full overflow-hidden rounded">
                        <span className="flex-1" style={{ background: ft.primary }} />
                        <span className="flex-1" style={{ background: ft.secondary }} />
                        <span className="flex-1" style={{ background: ft.accent }} />
                      </span>
                      <span className="block font-semibold text-slate-800">{ft.label}</span>
                      <span className="block text-[11px] text-slate-400">{ft.headingFont} · {ft.bodyFont}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Primary color + font preview */}
            <div className="rounded-xl border border-slate-200 p-4">
              <div className="mb-2 text-2xl font-bold" style={{ color: primaryColor, fontFamily: `'${fam.headingFont}', serif` }}>
                {businessName || "Your Business"}
              </div>
              <div className="text-sm text-slate-500" style={{ fontFamily: `'${fam.bodyFont}', sans-serif` }}>
                Headings in <strong>{fam.headingFont}</strong>, body in <strong>{fam.bodyFont}</strong> — from the {fam.themeName} palette.
              </div>
              <div className="mt-3 flex items-center gap-3">
                <label className={label + " mb-0"}>Primary color</label>
                <input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="h-9 w-14 cursor-pointer rounded border border-slate-300" />
                <code className="text-xs text-slate-500">{primaryColor}</code>
              </div>
            </div>

            {/* The plan */}
            <div className="rounded-xl border border-[#1e3a8a]/20 bg-[#1e3a8a]/[0.03] p-4">
              <p className="text-sm text-slate-700">
                Building <strong>{businessName || "your business"}</strong>{industry ? <> — a <strong>{industry}</strong> site</> : null} with <strong>{plan.length} pages</strong>
                {enrich?.imageCount ? <>, reusing <strong>{enrich.imageCount} images</strong> found on your site</> : null}.
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {plan.map((p) => (
                  <span key={p.title} className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs ${PLAN_KIND_CLS[p.kind]}`}>
                    {p.title}<span className="opacity-60">· {PLAN_KIND_LABEL[p.kind]}</span>
                  </span>
                ))}
              </div>
              <p className="mt-3 text-xs text-slate-500">Colors: <span className="font-medium" style={{ color: primaryColor }}>{primaryColor}</span> · {fam.secondary} · {fam.accent}. Fonts: {fam.headingFont} / {fam.bodyFont}. You can refine every page, image, and color in the editor after this.</p>
            </div>

            <label className="flex items-center gap-2 rounded-lg border border-slate-200 p-3 text-sm text-slate-700">
              <input type="checkbox" checked={aiConsent} onChange={(e) => setAiConsent(e.target.checked)} />
              Yes, use AI to draft my pages from this plan (everything stays a draft until you publish)
            </label>
          </div>
        )}

        {/* STEP 3 — Subdomain */}
        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-900">Choose your address</h2>
            <div>
              <label className={label}>Subdomain</label>
              <div className="flex items-stretch gap-2">
                <div className="flex flex-1 items-center rounded-lg border border-slate-300 focus-within:border-[#1e3a8a] focus-within:ring-1 focus-within:ring-[#1e3a8a]">
                  <input className="flex-1 rounded-l-lg px-3 py-2 text-sm outline-none"
                    value={subdomainRaw} onChange={(e) => { setSubdomainRaw(e.target.value); setCheck(null); }} placeholder="ali-realty" />
                  <span className="select-none px-3 text-sm text-slate-400">.{SUBDOMAIN_BASE}</span>
                </div>
                <button type="button" onClick={runCheck} disabled={checking || normalized.length < 3}
                  className="rounded-lg bg-[#1e3a8a] px-4 text-sm font-semibold text-white hover:bg-[#1e3a8a]/90 disabled:opacity-50">
                  {checking ? "Checking…" : "Check"}
                </button>
              </div>
              {normalized && <p className="mt-1 text-xs text-slate-400">Will be: <code>{normalized}.{SUBDOMAIN_BASE}</code></p>}
              {check && check.normalized === normalized && (
                <p className={`mt-2 text-sm ${check.available ? "text-emerald-600" : "text-rose-600"}`}>
                  {check.available ? "✓ Available" : `✗ Not available${check.reason ? ` (${check.reason})` : ""}`}
                </p>
              )}
            </div>
            <p className="text-xs text-slate-400">We reserve this address now. Your site stays a private draft — public DNS is only set up when you publish.</p>
          </div>
        )}

        {/* STEP 4 — Review */}
        {step === 4 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-900">Review &amp; create</h2>
            <dl className="divide-y divide-slate-100 rounded-lg border border-slate-200 text-sm">
              {[
                ["Business", businessName],
                ["Industry", industry],
                ["Location", [city, country].filter(Boolean).join(", ")],
                ["Logo", logoUrl ? "Provided" : "—"],
                ["Tone", TONE_LABEL[tone]],
                ["Address", `${normalized}.${SUBDOMAIN_BASE}`],
                ["Template", FAMILY_LABEL[templateFamily]],
                ["Pages planned", String(plan.length)],
                ["AI drafting", aiConsent ? "On" : "Off"],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between px-3 py-2">
                  <dt className="text-slate-400">{k}</dt><dd className="font-medium text-slate-700">{v || "—"}</dd>
                </div>
              ))}
            </dl>
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input type="checkbox" checked={makePublicNow} onChange={(e) => setMakePublicNow(e.target.checked)} />
              Request to make publicly accessible after creation (still a draft until you publish)
            </label>
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">This creates a <strong>draft</strong> website. Nothing is published, charged, or sent.</p>
            {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
          </div>
        )}

        {/* Footer nav */}
        <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4">
          <button onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0 || pending}
            className="rounded-lg px-4 py-2 text-sm font-medium text-slate-500 hover:bg-slate-50 disabled:opacity-40">
            ← Back
          </button>
          {step < STEPS.length - 1 ? (
            <button onClick={() => setStep(step + 1)} disabled={!canNext()}
              className="rounded-lg bg-[#1e3a8a] px-5 py-2 text-sm font-semibold text-white hover:bg-[#1e3a8a]/90 disabled:opacity-50">
              Next →
            </button>
          ) : (
            <button onClick={submit} disabled={pending}
              className="rounded-lg bg-[#1e3a8a] px-5 py-2 text-sm font-semibold text-white hover:bg-[#1e3a8a]/90 disabled:opacity-60">
              {pending ? "Creating…" : "Confirm & Create"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
