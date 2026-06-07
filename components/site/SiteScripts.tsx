"use client";

import { useEffect, useRef } from "react";

/**
 * Site-wide tracking/integration injector (public route). Renders the tenant's analytics
 * & custom scripts so they actually EXECUTE — React's dangerouslySetInnerHTML does not run
 * <script> tags, so we build real <script> elements on mount and append them to head/body.
 *
 * Convenience IDs (GA4 / GTM / Meta Pixel) auto-expand to their standard snippets; the raw
 * head/footer boxes inject anything custom. Runs once per mount, after hydration.
 *
 * Trust model: these are the TENANT's own scripts for the TENANT's own published site
 * (standard website-builder behavior, like GHL/Wix). They are not third-party/user content.
 */
export interface SiteScriptsProps {
  ga4Id?: string;
  gtmId?: string;
  metaPixelId?: string;
  headScripts?: string;
  footerScripts?: string;
}

const cleanId = (v?: string) => (v ?? "").trim().replace(/[^A-Za-z0-9_-]/g, "");

/** Append HTML to a target, rebuilding <script> tags so the browser executes them. */
function injectHtml(target: HTMLElement, html: string) {
  if (!html.trim()) return;
  const tpl = document.createElement("template");
  tpl.innerHTML = html;
  tpl.content.querySelectorAll("script").forEach((old) => {
    const sc = document.createElement("script");
    for (const a of Array.from(old.attributes)) sc.setAttribute(a.name, a.value);
    sc.textContent = old.textContent;
    old.replaceWith(sc);
  });
  target.appendChild(tpl.content);
}

export default function SiteScripts(props: SiteScriptsProps) {
  const done = useRef(false);
  useEffect(() => {
    if (done.current) return; done.current = true;

    const head: string[] = [];
    const body: string[] = [];

    const ga = cleanId(props.ga4Id);
    if (ga) head.push(
      `<script async src="https://www.googletagmanager.com/gtag/js?id=${ga}"></script>`,
      `<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${ga}');</script>`,
    );

    const gtm = cleanId(props.gtmId);
    if (gtm) {
      head.push(`<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${gtm}');</script>`);
      body.push(`<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=${gtm}" height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>`);
    }

    const px = cleanId(props.metaPixelId);
    if (px) {
      head.push(`<script>!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${px}');fbq('track','PageView');</script>`);
    }

    if (props.headScripts) head.push(props.headScripts);
    if (props.footerScripts) body.push(props.footerScripts);

    if (head.length) injectHtml(document.head, head.join("\n"));
    if (body.length) injectHtml(document.body, body.join("\n"));
  }, [props]);

  return null;
}
