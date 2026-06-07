import React from "react";

/**
 * Renders a string, wrapping every standalone occurrence of the brand name
 * ("AI Biz Connect" / "AIBizConnect", any spacing/case) in the MontserratAlt1
 * SemiBold wordmark font (.abc-wordmark). Everything else renders unchanged.
 */
const SPLIT_RE = /(AI\s?Biz\s?Connect)/gi;
const MATCH_RE = /^AI\s?Biz\s?Connect$/i;

export function BrandText({ children }: { children?: string | null }) {
  if (!children) return null;
  const parts = children.split(SPLIT_RE);
  return (
    <>
      {parts.map((part, i) =>
        MATCH_RE.test(part) ? (
          <span key={i} className="abc-wordmark">
            {part}
          </span>
        ) : (
          <React.Fragment key={i}>{part}</React.Fragment>
        )
      )}
    </>
  );
}
