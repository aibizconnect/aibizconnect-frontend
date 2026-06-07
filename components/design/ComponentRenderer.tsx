import React from "react";
import { COMPONENTS, type ComponentType, type Layout } from "@/lib/design/components";
import { resolveLayout, bandClasses, containerClasses, gridClasses } from "@/lib/design/layout";

/**
 * Token-driven responsive renderer for the design-system component library (DL-2
 * deepening). Given a component type + props (+ optional layout overrides), renders
 * premium, responsive, brand-themed markup. All colors come from --abc-* CSS vars, so
 * a re-theme is a token swap. Unknown/invalid props degrade gracefully (skips).
 */

type AnyProps = Record<string, any>;

const heading = "text-3xl sm:text-4xl font-semibold tracking-tight";
const sub = "mt-3 text-base sm:text-lg opacity-80 max-w-2xl";
const card = "rounded-2xl border border-white/10 bg-white/5 p-6 text-left";
const btnPrimary = "inline-flex items-center justify-center rounded-xl bg-[var(--abc-color-primary,#4f46e5)] text-[var(--abc-color-primaryContrast,#fff)] px-5 py-2.5 text-sm font-medium hover:opacity-90 transition";
const btnGhost = "inline-flex items-center justify-center rounded-xl border border-white/20 px-5 py-2.5 text-sm font-medium hover:bg-white/10 transition";

function Cta({ cta, ghost }: { cta?: { label: string; href: string }; ghost?: boolean }) {
  if (!cta?.label) return null;
  return <a href={cta.href || "#"} className={ghost ? btnGhost : btnPrimary}>{cta.label}</a>;
}

function renderInner(type: ComponentType, p: AnyProps, layout: Required<Layout>): React.ReactNode {
  switch (type) {
    case "hero":
      return (
        <>
          {p.heading && <h1 className="text-4xl sm:text-6xl font-semibold tracking-tight max-w-4xl">{p.heading}</h1>}
          {p.subheading && <p className={sub}>{p.subheading}</p>}
          {(p.primaryCta || p.secondaryCta) && (
            <div className="mt-2 flex flex-wrap gap-3 justify-center">
              <Cta cta={p.primaryCta} />
              <Cta cta={p.secondaryCta} ghost />
            </div>
          )}
        </>
      );
    case "feature-grid":
      return (
        <>
          {p.heading && <h2 className={heading}>{p.heading}</h2>}
          <div className={gridClasses(layout.columns) + " w-full mt-4"}>
            {(p.features ?? []).map((f: AnyProps, i: number) => (
              <div key={i} className={card}>
                {f.icon && <div className="mb-3 text-2xl">{f.icon}</div>}
                <h3 className="text-lg font-medium">{f.title}</h3>
                <p className="mt-2 text-sm opacity-75">{f.description}</p>
              </div>
            ))}
          </div>
        </>
      );
    case "stats":
      return (
        <div className={gridClasses(layout.columns) + " w-full"}>
          {(p.stats ?? []).map((s: AnyProps, i: number) => (
            <div key={i} className="text-center">
              <div className="text-4xl font-semibold text-[var(--abc-color-accent,#22d3ee)]">{s.value}</div>
              <div className="mt-1 text-sm opacity-70">{s.label}</div>
            </div>
          ))}
        </div>
      );
    case "testimonial":
      return (
        <figure className="max-w-2xl">
          <blockquote className="text-xl sm:text-2xl font-medium leading-relaxed">“{p.quote}”</blockquote>
          <figcaption className="mt-4 text-sm opacity-70">{p.author}{p.role ? ` · ${p.role}` : ""}</figcaption>
        </figure>
      );
    case "pricing-table":
      return (
        <>
          {p.heading && <h2 className={heading}>{p.heading}</h2>}
          <div className={gridClasses(layout.columns) + " w-full mt-4"}>
            {(p.tiers ?? []).map((t: AnyProps, i: number) => (
              <div key={i} className={card + (t.highlight ? " ring-2 ring-[var(--abc-color-primary,#4f46e5)]" : "")}>
                <h3 className="text-lg font-medium">{t.name}</h3>
                <div className="mt-2 text-3xl font-semibold">{t.price}</div>
                <ul className="mt-4 space-y-2 text-sm opacity-80">{(t.features ?? []).map((f: string, j: number) => <li key={j}>• {f}</li>)}</ul>
                <div className="mt-5"><Cta cta={t.cta} /></div>
              </div>
            ))}
          </div>
        </>
      );
    case "faq":
      return (
        <>
          {p.heading && <h2 className={heading}>{p.heading}</h2>}
          <div className="w-full max-w-3xl divide-y divide-white/10">
            {(p.items ?? []).map((it: AnyProps, i: number) => (
              <div key={i} className="py-4 text-left">
                <h3 className="font-medium">{it.q}</h3>
                <p className="mt-1 text-sm opacity-75">{it.a}</p>
              </div>
            ))}
          </div>
        </>
      );
    case "cta-banner":
      return (
        <>
          {p.heading && <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight">{p.heading}</h2>}
          {p.subheading && <p className={sub}>{p.subheading}</p>}
          <div className="mt-2"><Cta cta={p.cta} ghost /></div>
        </>
      );
    case "logo-cloud":
      return (
        <>
          {p.heading && <p className="text-sm uppercase tracking-widest opacity-60">{p.heading}</p>}
          <div className="flex flex-wrap items-center justify-center gap-8 opacity-80">
            {(p.logos ?? []).map((l: AnyProps, i: number) => <span key={i} className="text-sm">{l.alt}</span>)}
          </div>
        </>
      );
    case "rich-text":
      return (
        <div className="max-w-2xl text-left">
          {p.heading && <h2 className={heading + " mb-4"}>{p.heading}</h2>}
          <p className="opacity-85 leading-relaxed whitespace-pre-line">{p.body}</p>
        </div>
      );
    case "gallery":
      return (
        <div className={gridClasses(layout.columns) + " w-full"}>
          {(p.images ?? []).map((im: AnyProps, i: number) => (
            <div key={i} className="aspect-video rounded-xl bg-white/10 flex items-center justify-center text-xs opacity-60">{im.alt}</div>
          ))}
        </div>
      );
    case "contact-form":
      return (
        <form className="w-full max-w-lg text-left flex flex-col gap-3">
          {p.heading && <h2 className={heading + " mb-2"}>{p.heading}</h2>}
          {(p.fields ?? []).map((f: AnyProps, i: number) => (
            <label key={i} className="flex flex-col gap-1 text-sm">
              <span className="opacity-75">{f.label}</span>
              {f.type === "textarea"
                ? <textarea name={f.name} className="rounded-lg border border-white/15 bg-black/20 px-3 py-2" rows={4} />
                : <input name={f.name} type={f.type} className="rounded-lg border border-white/15 bg-black/20 px-3 py-2" />}
            </label>
          ))}
          <button type="button" className={btnPrimary + " mt-2 self-start"}>{p.submitLabel ?? "Send"}</button>
        </form>
      );
    case "footer":
      return <div className="w-full text-sm opacity-70">{p.legal ?? ""}</div>;
    default:
      return null;
  }
}

export function ComponentRenderer({ type, props, layoutOverride }: { type: ComponentType; props: AnyProps; layoutOverride?: Partial<Layout> }) {
  const def = COMPONENTS[type];
  if (!def) return null;
  const layout = resolveLayout({ ...def.defaultLayout, ...layoutOverride });
  return (
    <section className={bandClasses(layout)}>
      <div className={containerClasses(layout)}>{renderInner(type, props, layout)}</div>
    </section>
  );
}
