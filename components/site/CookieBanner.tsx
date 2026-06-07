"use client";

import { useEffect, useState } from "react";

/**
 * Public cookie-consent banner (GDPR/PIPEDA). Shows once until the visitor chooses; the
 * choice is stored in localStorage. Privacy-preserving: non-essential scripts should gate
 * on the stored consent. Decline is a first-class option (not just "accept").
 */
export interface CookieBannerProps {
  message?: string;
  acceptLabel?: string;
  declineLabel?: string;
  policyUrl?: string;
  position?: "bottom" | "bottom-left" | "bottom-right";
}

const KEY = "abc_cookie_consent"; // "accepted" | "declined"

export default function CookieBanner(p: CookieBannerProps) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    try { if (!localStorage.getItem(KEY)) setShow(true); } catch { setShow(true); }
  }, []);
  if (!show) return null;

  const choose = (v: "accepted" | "declined") => {
    try { localStorage.setItem(KEY, v); } catch { /* ignore */ }
    // Expose for scripts that want to gate (e.g. window.__abcConsent).
    (window as any).__abcConsent = v;
    window.dispatchEvent(new CustomEvent("abc:cookie-consent", { detail: v }));
    setShow(false);
  };

  const pos =
    p.position === "bottom-left" ? "left-4 bottom-4 max-w-md"
    : p.position === "bottom-right" ? "right-4 bottom-4 max-w-md"
    : "inset-x-4 bottom-4 mx-auto max-w-3xl";

  return (
    <div className={`fixed z-[2147483000] ${pos} rounded-xl border border-slate-200 bg-white p-4 shadow-2xl`} role="dialog" aria-label="Cookie consent">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-700">
          {p.message || "We use cookies to improve your experience. You can accept or decline non-essential cookies."}
          {p.policyUrl && (
            <> <a href={p.policyUrl} className="underline hover:text-slate-900" target="_blank" rel="noopener noreferrer">Learn more</a>.</>
          )}
        </p>
        <div className="flex shrink-0 gap-2">
          <button onClick={() => choose("declined")} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            {p.declineLabel || "Decline"}
          </button>
          <button onClick={() => choose("accepted")} className="rounded-lg bg-[#1e3a8a] px-4 py-2 text-sm font-medium text-white hover:bg-[#1e3a8a]/90">
            {p.acceptLabel || "Accept"}
          </button>
        </div>
      </div>
    </div>
  );
}
