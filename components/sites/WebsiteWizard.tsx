"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { checkSubdomain, createWebsiteFromWizard, enrichFromPresence } from "@/app/tenants/[tenantId]/website/wizard-actions";
import {
  normalizeSubdomain, SUBDOMAIN_BASE, BRAND_TONES, FAMILY_THEME, COUNTRIES,
  audienceSuggestionsFor, plannedPages, WIZARD_PALETTES, subdomainSuggestions,
  type WizardPayload, type SubdomainCheck, type EnrichedProfile, type WizardPalette,
} from "@/lib/sites/wizard-shared";
import FontPicker from "@/components/design/FontPicker";

/** polished onboarding wizard. DRAFT-ONLY — creates a website, no publish/DNS/charge. */

const STEPS = ["Start", "Basics", "Design & Plan", "Subdomain", "Review"] as const;

const TONE_LABEL: Record<string, string> = {
  professional: "Professional", friendly: "Friendly", luxury: "Luxury", bold: "Bold", minimal: "Minimal",
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

  // Editable build plan (add / rename / remove pages) — seeded from the default sitemap.
  const [planPages, setPlanPages] = useState(() => plannedPages());
  const [newPageTitle, setNewPageTitle] = useState("");
  const renamePage = (i: number, title: string) => setPlanPages((ps) => ps.map((p, j) => (j === i ? { ...p, title } : p)));
  const removePage = (i: number) => setPlanPages((ps) => ps.filter((_, j) => j !== i));
  const addPage = () => {
    const t = newPageTitle.trim();
    if (!t) return;
    setPlanPages((ps) => (ps.some((p) => p.title.toLowerCase() === t.toLowerCase()) ? ps : [...ps, { title: t, kind: "core" as const }]));
    setNewPageTitle("");
  };

  const [existingUrl, setExistingUrl] = useState("");
  const [existingBlog, setExistingBlog] = useState("");
  const [socialLinks, setSocialLinks] = useState<string[]>([""]);
  const [analyzing, setAnalyzing] = useState(false);
  const [enrich, setEnrich] = useState<EnrichedProfile | null>(null);

  const [tone, setTone] = useState<string>("professional");
  const [aiConsent, setAiConsent] = useState(true);
  const [importMode, setImportMode] = useState<"rebuild" | "exact">("rebuild");
  const [templateFamily] = useState<string>("agency"); // server fallback only; UI uses palette/fonts
  const [makePublicNow, setMakePublicNow] = useState(false);

  // Brand: palette (named roles) + typography.
  const [paletteName, setPaletteName] = useState<string | null>("Ocean");
  const [primaryColor, setPrimaryColor] = useState(WIZARD_PALETTES[0].primary);
  const [secondaryColor, setSecondaryColor] = useState(WIZARD_PALETTES[0].secondary);
  const [accentColor, setAccentColor] = useState(WIZARD_PALETTES[0].accent);
  const [backgroundColor, setBackgroundColor] = useState(WIZARD_PALETTES[0].background);
  const [textColor, setTextColor] = useState(WIZARD_PALETTES[0].text);
  const [linkColor, setLinkColor] = useState(WIZARD_PALETTES[0].link);
  const [fontHeading, setFontHeading] = useState(FAMILY_THEME.agency.headingFont);
  const [fontBody, setFontBody] = useState(FAMILY_THEME.agency.bodyFont);
  const applyPalette = (p: WizardPalette) => {
    setPaletteName(p.name); setPrimaryColor(p.primary); setSecondaryColor(p.secondary); setAccentColor(p.accent);
    setBackgroundColor(p.background); setTextColor(p.text); setLinkColor(p.link);
  };

  const [subdomainRaw, setSubdomainRaw] = useState("");
  const [subTouched, setSubTouched] = useState(false);
  const [check, setCheck] = useState<SubdomainCheck | null>(null);
  const [checking, setChecking] = useState(false);
  const normalized = normalizeSubdomain(subdomainRaw);
  const subSuggestions = subdomainSuggestions(businessName, industry, city);

  // Pre-fill a good subdomain from the business name (until the user edits it).
  useEffect(() => {
    if (!subTouched && subSuggestions[0] && subSuggestions[0] !== subdomainRaw) setSubdomainRaw(subSuggestions[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessName, industry, city, subTouched]);

  const pickSubdomain = (s: string) => {
    setSubTouched(true); setSubdomainRaw(s); setChecking(true);
    start(async () => { try { setCheck(await checkSubdomain(s)); } finally { setChecking(false); } });
  };

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
        if (p.primaryColor && /^#[0-9a-fA-F]{6}$/.test(p.primaryColor)) { setPrimaryColor(p.primaryColor); setPaletteName(null); }
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
      pages: planPages.map((p) => p.title.trim()).filter(Boolean),
      importMode: existingUrl.trim() ? importMode : undefined,
      tone: tone as WizardPayload["tone"],
      hasWebsite: !!existingUrl.trim(), existingUrl, existingBlog,
      socialLinks: socialLinks.filter((s) => s.trim()),
      aiConsent,
      subdomain: normalized,
      templateFamily: templateFamily as WizardPayload["templateFamily"],
      primaryColor, secondaryColor, accentColor, backgroundColor, textColor, linkColor,
      fontHeading, fontBody, makePublicNow,
    };
    start(async () => {
      const res = await createWebsiteFromWizard(tenantId, payload);
      if (!res.ok || !res.websiteId) { setError(res.error || "Could not create website."); return; }
      router.push(`/tenants/${tenantId}/website/${res.websiteId}`);
    });
  };

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
                placeholder="e.g. We help small businesses automate operations and capture leads with AI and done-for-you marketing systems." />
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
              <p className="text-sm text-slate-500">Here&apos;s what we&apos;ll build. Adjust the brand below, then continue.</p>
            </div>

            {/* How to import the existing site (only when one was provided) */}
            {existingUrl.trim() && (
              <div>
                <label className={label}>How should we copy your existing site?</label>
                <div className="grid gap-2 sm:grid-cols-2">
                  {([["rebuild", "Smart rebuild", "Copy your content, images & structure into editable, on-brand sections you can restyle."], ["exact", "Exact copy", "A pixel-faithful snapshot of each page (your real layout & CSS). Best for keeping it identical."]] as [typeof importMode, string, string][]).map(([k, title, desc]) => (
                    <button key={k} type="button" onClick={() => setImportMode(k)}
                      className={`rounded-xl border p-3 text-left transition ${importMode === k ? "border-[#1e3a8a] ring-1 ring-[#1e3a8a]" : "border-slate-200 hover:border-slate-300"}`}>
                      <div className="text-sm font-semibold text-slate-800">{title}</div>
                      <div className="mt-0.5 text-xs text-slate-500">{desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

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

            {/* Color palette (named roles) */}
            <div>
              <label className={label}>Color palette</label>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {WIZARD_PALETTES.map((p) => (
                  <button key={p.name} type="button" onClick={() => applyPalette(p)}
                    className={`rounded-xl border p-2 text-left transition ${paletteName === p.name ? "border-[#1e3a8a] ring-1 ring-[#1e3a8a]" : "border-slate-200 hover:border-slate-300"}`}>
                    <span className="flex h-10 w-full overflow-hidden rounded" style={{ background: p.background }}>
                      <span className="m-1 flex flex-1 items-center justify-center rounded text-[10px] font-bold" style={{ background: p.primary, color: p.background }}>Aa</span>
                      <span className="my-1 w-3 rounded" style={{ background: p.secondary }} />
                      <span className="my-1 mr-1 w-3 rounded" style={{ background: p.accent }} />
                    </span>
                    <span className="mt-1 block text-xs font-semibold text-slate-700">{p.name}{p.dark ? " (dark)" : ""}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Typography — full font list, same as the editor */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={label}>Heading font</label>
                <div className="flex items-center gap-3">
                  <FontPicker value={fontHeading} onChange={setFontHeading} />
                  <span className="truncate text-lg font-bold text-slate-700" style={{ fontFamily: `'${fontHeading}', sans-serif` }}>{fontHeading}</span>
                </div>
              </div>
              <div>
                <label className={label}>Body font</label>
                <div className="flex items-center gap-3">
                  <FontPicker value={fontBody} onChange={setFontBody} />
                  <span className="truncate text-sm text-slate-600" style={{ fontFamily: `'${fontBody}', sans-serif` }}>{fontBody}</span>
                </div>
              </div>
            </div>

            {/* Fine-tune individual roles */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {([["Primary", primaryColor, setPrimaryColor], ["Background", backgroundColor, setBackgroundColor], ["Text", textColor, setTextColor], ["Links", linkColor, setLinkColor], ["Secondary", secondaryColor, setSecondaryColor], ["Accent", accentColor, setAccentColor]] as [string, string, (v: string) => void][]).map(([roleLabel, val, setVal]) => (
                <label key={roleLabel} className="flex items-center gap-2 rounded-lg border border-slate-200 px-2 py-1.5">
                  <input type="color" value={val} onChange={(e) => { setVal(e.target.value); setPaletteName(null); }} className="h-7 w-8 cursor-pointer rounded border border-slate-200" />
                  <span className="text-xs text-slate-600">{roleLabel}</span>
                </label>
              ))}
            </div>

            {/* Live preview using the chosen palette + fonts */}
            <div className="overflow-hidden rounded-xl border border-slate-200">
              <div className="p-5" style={{ background: backgroundColor, color: textColor }}>
                <div className="mb-1 text-2xl font-bold" style={{ color: primaryColor, fontFamily: `'${fontHeading}', sans-serif` }}>{businessName || "Your Business"}</div>
                <p className="mb-3 text-sm" style={{ fontFamily: `'${fontBody}', sans-serif` }}>
                  This is body text on your background. Here&apos;s a <span style={{ color: linkColor, textDecoration: "underline" }}>link</span> in your link color.
                </p>
                <button type="button" className="rounded-lg px-3 py-1.5 text-sm font-semibold" style={{ background: primaryColor, color: backgroundColor, fontFamily: `'${fontBody}', sans-serif` }}>Primary button</button>
              </div>
            </div>

            {/* The plan — editable pages (add / rename / remove) */}
            <div className="rounded-xl border border-[#1e3a8a]/20 bg-[#1e3a8a]/[0.03] p-4">
              <p className="text-sm text-slate-700">
                Building <strong>{businessName || "your business"}</strong>{industry ? <> — a <strong>{industry}</strong> site</> : null} with <strong>{planPages.length} page{planPages.length === 1 ? "" : "s"}</strong>
                {enrich?.imageCount ? <>, reusing <strong>{enrich.imageCount} images</strong> found on your site</> : null}. Add, rename, or remove pages below.
              </p>
              <div className="mt-3 space-y-1.5">
                {planPages.map((p, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className={`w-14 flex-none rounded-full px-2 py-0.5 text-center text-[10px] font-semibold uppercase ${PLAN_KIND_CLS[p.kind]}`}>{PLAN_KIND_LABEL[p.kind]}</span>
                    <input value={p.title} onChange={(e) => renamePage(i, e.target.value)}
                      className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm focus:border-[#1e3a8a] focus:outline-none" />
                    <button type="button" onClick={() => removePage(i)} title="Remove page"
                      className="flex-none rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-slate-400 hover:border-rose-300 hover:text-rose-500">×</button>
                  </div>
                ))}
              </div>
              <div className="mt-2 flex items-center gap-2">
                <input value={newPageTitle} onChange={(e) => setNewPageTitle(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addPage(); } }}
                  placeholder="Add a page (e.g. Portfolio)…"
                  className="flex-1 rounded-lg border border-dashed border-slate-300 bg-white px-3 py-1.5 text-sm focus:border-[#1e3a8a] focus:outline-none" />
                <button type="button" onClick={addPage} disabled={!newPageTitle.trim()}
                  className="flex-none rounded-lg border border-[#1e3a8a] px-3 py-1.5 text-sm font-medium text-[#1e3a8a] hover:bg-[#1e3a8a]/5 disabled:opacity-40">＋ Add</button>
              </div>
              <p className="mt-3 text-xs text-slate-500">Palette: <span className="font-medium">{paletteName ?? "Custom"}</span> (primary <span className="font-medium" style={{ color: primaryColor }}>{primaryColor}</span>). Fonts: {fontHeading} / {fontBody}. You can refine every page, image, and color in the editor after this.</p>
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
                    value={subdomainRaw} onChange={(e) => { setSubTouched(true); setSubdomainRaw(e.target.value); setCheck(null); }} placeholder={subSuggestions[0] || "your-business"} />
                  <span className="select-none px-3 text-sm text-slate-400">.{SUBDOMAIN_BASE}</span>
                </div>
                <button type="button" onClick={runCheck} disabled={checking || normalized.length < 3}
                  className="rounded-lg bg-[#1e3a8a] px-4 text-sm font-semibold text-white hover:bg-[#1e3a8a]/90 disabled:opacity-50">
                  {checking ? "Checking…" : "Check"}
                </button>
              </div>
              {normalized && <p className="mt-1 text-xs text-slate-400">Will be: <code>{normalized}.{SUBDOMAIN_BASE}</code></p>}
              {subSuggestions.length > 0 && (
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <span className="text-xs text-slate-400">Suggestions:</span>
                  {subSuggestions.map((s) => (
                    <button key={s} type="button" onClick={() => pickSubdomain(s)}
                      className={`rounded-full border px-2.5 py-1 text-xs transition ${normalized === s ? "border-[#1e3a8a] bg-[#1e3a8a]/10 text-[#1e3a8a]" : "border-slate-300 text-slate-600 hover:border-slate-400"}`}>
                      {s}
                    </button>
                  ))}
                </div>
              )}
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
                ["Palette", paletteName ?? "Custom"],
                ["Fonts", `${fontHeading} / ${fontBody}`],
                ["Pages planned", String(planPages.length)],
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
