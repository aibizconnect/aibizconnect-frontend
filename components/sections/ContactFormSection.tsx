"use client";

import { useState } from "react";
import type { ContactFormContent } from "@/lib/sections/schemas";
import { DEFAULT_THEME, type ThemeTokens } from "@/lib/sections/theme";

export default function ContactFormSection({
  content,
  theme = DEFAULT_THEME,
}: {
  content: ContactFormContent;
  theme?: ThemeTokens;
}) {
  const [submitted, setSubmitted] = useState(false);
  const successMessage = (content as any).successMessage as string | undefined;
  return (
    <section
      style={{
        padding: `${theme.spacing.lg}px ${theme.spacing.md}px`,
        backgroundColor: theme.colors.background,
        color: theme.colors.text,
        fontFamily: theme.fonts.body,
      }}
    >
      <div className="mx-auto max-w-xl">
        <h2
          className="text-3xl font-bold"
          style={{ color: theme.colors.primary, fontFamily: theme.fonts.heading }}
        >
          {content.heading}
        </h2>
        {content.subheading && (
          <p className="mt-2 opacity-80">{content.subheading}</p>
        )}
        {/* On submit, show the configured success message (client-side). Real delivery
            wiring is a separate backend concern; this makes successMessage live. */}
        {submitted ? (
          <div
            role="status"
            className="mt-8 rounded-lg px-4 py-3 text-sm font-medium"
            style={{ background: `${theme.colors.accent}1a`, color: theme.colors.text, borderRadius: theme.radii.md }}
          >
            {successMessage || "Thanks! Your message has been received — we'll be in touch shortly."}
          </div>
        ) : (
        <form
          className="mt-8 flex flex-col"
          style={{ gap: theme.spacing.sm }}
          onSubmit={(e) => { e.preventDefault(); setSubmitted(true); }}
        >
          {content.fields.map((field) => (
            <label key={field.name} className="flex flex-col gap-1">
              <span className="text-sm font-medium">{field.label}</span>
              {field.type === "textarea" ? (
                <textarea
                  name={field.name}
                  rows={4}
                  className="border border-gray-300 px-3 py-2"
                  style={{ borderRadius: theme.radii.sm }}
                />
              ) : (
                <input
                  type={field.type}
                  name={field.name}
                  className="border border-gray-300 px-3 py-2"
                  style={{ borderRadius: theme.radii.sm }}
                />
              )}
            </label>
          ))}
          <button
            type="submit"
            className="mt-2 self-start px-5 py-2.5 font-medium text-white"
            style={{
              backgroundColor: theme.colors.accent,
              borderRadius: theme.radii.md,
            }}
          >
            {content.submitLabel}
          </button>
        </form>
        )}
      </div>
    </section>
  );
}
