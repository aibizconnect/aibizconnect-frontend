"use client";

import type { Config } from "@measured/puck";
import { DropZone } from "@measured/puck";

/**
 * Puck prototype config — a handful of nicely-styled, fully-editable blocks in the
 * Contemporary Luxury direction. Demonstrates a mature, maintained drag-and-drop editor
 * (drag from the left, edit fields on the right, nested columns) running inside our app.
 */

const LX = { ink: "#1A1714", body: "#5C544B", gold: "#B08D57", ivory: "#F7F4EF", white: "#FFFFFF", panel: "#F1EADD", hair: "#E4DCCE" };
const serif = "'Playfair Display', serif";
const sans = "'Inter', sans-serif";

type Props = {
  Header: { brand: string; links: string; cta: string };
  Hero: { eyebrow: string; title: string; subtitle: string; cta1: string; cta2: string; bg: "ivory" | "white" | "ink"; image: string };
  Heading: { text: string; level: "h1" | "h2" | "h3"; align: "left" | "center" | "right" };
  Text: { text: string; align: "left" | "center" | "right" };
  Button: { label: string; variant: "solid" | "outline"; align: "left" | "center" | "right" };
  Stat: { value: string; label: string };
  Feature: { icon: string; title: string; body: string };
  Features3: { eyebrow: string; title: string; cards: { icon: string; title: string; body: string }[] };
  Stats3: { stats: { value: string; label: string }[] };
  Testimonial: { quote: string; author: string };
  CTA: { title: string; body: string; button: string; bg: "panel" | "ink" };
  Image: { url: string; align: "left" | "center" | "right"; maxWidth: number; fade: number; rounded: number; height: number; padY: number };
  Footer: { brand: string; links: string; copyright: string };
  Spacer: { height: number };
  TwoColumns: { gap: number };
  ThreeColumns: { gap: number };
  Section: { bg: "ivory" | "white" | "ink" | "panel"; padY: number };
};

const ALIGN = (a: string) => ({ textAlign: a as any });

export const config: Config<Props> = {
  categories: {
    structure: { title: "Structure", components: ["Header", "Footer"] },
    layout: { title: "Layout", components: ["Section", "TwoColumns", "ThreeColumns", "Spacer"] },
    sections: { title: "Sections", components: ["Hero", "Features3", "Stats3", "Testimonial", "CTA"] },
    content: { title: "Content", components: ["Heading", "Text", "Button", "Stat", "Feature", "Image"] },
  },
  components: {
    Header: {
      label: "Header / Nav",
      fields: { brand: { type: "text" }, links: { type: "text", label: "Links (comma-separated)" }, cta: { type: "text", label: "Button" } },
      defaultProps: { brand: "Aurelia & Co.", links: "Home, Services, Portfolio, About, Contact", cta: "Login" },
      render: ({ brand, links, cta }) => (
        <div style={{ background: LX.ivory, borderBottom: `1px solid ${LX.hair}`, padding: "20px 24px" }}>
          <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ fontFamily: serif, fontSize: 24, fontWeight: 600, color: LX.ink }}>{brand}</div>
            <div style={{ display: "flex", gap: 28, fontFamily: sans, fontSize: 15, fontWeight: 500, color: LX.ink }}>
              {links.split(",").map((l, i) => <span key={i}>{l.trim()}</span>)}
            </div>
            <span style={{ border: `1px solid ${LX.ink}`, color: LX.ink, font: `600 13px/1 ${sans}`, letterSpacing: 0.5, textTransform: "uppercase", padding: "10px 22px" }}>{cta}</span>
          </div>
        </div>
      ),
    },
    Footer: {
      label: "Footer",
      fields: { brand: { type: "text" }, links: { type: "text", label: "Links" }, copyright: { type: "text" } },
      defaultProps: { brand: "Aurelia & Co.", links: "Home, Services, About, Contact, Privacy", copyright: "© Aurelia & Co. — All rights reserved." },
      render: ({ brand, links, copyright }) => (
        <div style={{ background: LX.ink, color: "#CFC7BB", padding: "56px 24px", textAlign: "center" }}>
          <div style={{ fontFamily: serif, fontSize: 22, fontWeight: 600, color: LX.ivory, marginBottom: 10 }}>{brand}</div>
          <div style={{ fontFamily: sans, fontSize: 14, marginBottom: 18 }}>{links.split(",").map((l) => l.trim()).join("   ·   ")}</div>
          <div style={{ width: 50, height: 1, background: "#3A352F", margin: "0 auto 18px" }} />
          <div style={{ fontFamily: sans, fontSize: 13, color: "#8A8278" }}>{copyright}</div>
        </div>
      ),
    },
    Spacer: {
      label: "Spacer", fields: { height: { type: "number", label: "Height (px)" } }, defaultProps: { height: 48 },
      render: ({ height }) => <div style={{ height }} />,
    },
    Feature: {
      label: "Feature card",
      fields: { icon: { type: "text", label: "Icon (emoji)" }, title: { type: "text" }, body: { type: "textarea" } },
      defaultProps: { icon: "◇", title: "Full-service design", body: "From first sketch to final styling — a single, coherent vision." },
      render: ({ icon, title, body }) => (
        <div style={{ background: LX.white, border: `1px solid ${LX.hair}`, padding: "36px 30px", height: "100%" }}>
          <div style={{ fontSize: 26, color: LX.gold, marginBottom: 18 }}>{icon}</div>
          <div style={{ fontFamily: serif, fontSize: 22, fontWeight: 600, color: LX.ink, marginBottom: 10 }}>{title}</div>
          <div style={{ fontFamily: sans, fontSize: 15.5, lineHeight: 1.7, color: LX.body }}>{body}</div>
        </div>
      ),
    },
    Testimonial: {
      label: "Testimonial",
      fields: { quote: { type: "textarea" }, author: { type: "text" } },
      defaultProps: { quote: "They understood the home before we could describe it. The result is quiet, warm, and unmistakably ours.", author: "A private residence, Mayfair" },
      render: ({ quote, author }) => (
        <div style={{ background: LX.white, padding: "116px 24px" }}>
          <div style={{ textAlign: "center", maxWidth: 760, margin: "0 auto" }}>
            <div style={{ fontFamily: serif, fontSize: 25, fontStyle: "italic", lineHeight: 1.5, color: LX.ink }}>{`“${quote}”`}</div>
            <div style={{ fontFamily: sans, fontSize: 14, letterSpacing: 1.4, textTransform: "uppercase", color: LX.gold, marginTop: 22 }}>{`— ${author}`}</div>
          </div>
        </div>
      ),
    },
    Features3: {
      label: "Features (3-up band)",
      fields: {
        eyebrow: { type: "text" }, title: { type: "text" },
        cards: { type: "array", arrayFields: { icon: { type: "text" }, title: { type: "text" }, body: { type: "textarea" } },
          defaultItemProps: { icon: "◇", title: "Feature", body: "Describe this feature." } },
      },
      defaultProps: { eyebrow: "What we offer", title: "A practice built on detail", cards: [
        { icon: "◇", title: "Full-service design", body: "From first sketch to final styling — a single, coherent vision." },
        { icon: "❖", title: "Material curation", body: "Natural stone, aged brass, hand-finished timber, sourced for warmth." },
        { icon: "✦", title: "Project stewardship", body: "Discreet, precise management so the experience feels as refined as the result." },
      ] },
      render: ({ eyebrow, title, cards }) => (
        <div style={{ background: LX.ivory, padding: "112px 24px" }}>
          <div style={{ maxWidth: 1100, margin: "0 auto", textAlign: "center" }}>
            <div style={{ font: `600 13px/1 ${sans}`, letterSpacing: 2.2, textTransform: "uppercase", color: LX.gold, marginBottom: 14 }}>{eyebrow}</div>
            <h2 style={{ fontFamily: serif, fontSize: 40, fontWeight: 600, color: LX.ink, margin: "0 0 56px" }}>{title}</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 30, textAlign: "left" }}>
              {(cards || []).map((c, i) => (
                <div key={i} style={{ background: LX.white, border: `1px solid ${LX.hair}`, padding: "36px 30px" }}>
                  <div style={{ fontSize: 26, color: LX.gold, marginBottom: 18 }}>{c.icon}</div>
                  <div style={{ fontFamily: serif, fontSize: 22, fontWeight: 600, color: LX.ink, marginBottom: 10 }}>{c.title}</div>
                  <div style={{ fontFamily: sans, fontSize: 15.5, lineHeight: 1.7, color: LX.body }}>{c.body}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ),
    },
    Stats3: {
      label: "Stats (band)",
      fields: { stats: { type: "array", arrayFields: { value: { type: "text" }, label: { type: "text" } }, defaultItemProps: { value: "100+", label: "Metric" } } },
      defaultProps: { stats: [{ value: "120+", label: "Residences" }, { value: "18", label: "Years of craft" }, { value: "100%", label: "Bespoke" }] },
      render: ({ stats }) => (
        <div style={{ background: LX.ivory, borderTop: `1px solid ${LX.hair}`, borderBottom: `1px solid ${LX.hair}`, padding: "92px 24px" }}>
          <div style={{ maxWidth: 1100, margin: "0 auto", display: "grid", gridTemplateColumns: `repeat(${(stats || []).length || 3},1fr)`, gap: 24 }}>
            {(stats || []).map((s, i) => (
              <div key={i} style={{ textAlign: "center" }}>
                <div style={{ fontFamily: serif, fontSize: 58, fontWeight: 600, color: LX.ink }}>{s.value}</div>
                <div style={{ fontFamily: sans, fontSize: 14, letterSpacing: 1.5, textTransform: "uppercase", color: LX.body, marginTop: 8 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      ),
    },
    CTA: {
      label: "Call to action",
      fields: { title: { type: "text" }, body: { type: "textarea" }, button: { type: "text" }, bg: { type: "select", options: [{ label: "Panel", value: "panel" }, { label: "Ink (dark)", value: "ink" }] } },
      defaultProps: { title: "Begin your commission", body: "A limited number of projects each season, given the attention each deserves.", button: "Enquire now", bg: "panel" },
      render: ({ title, body, button, bg }) => {
        const dark = bg === "ink";
        return (
          <div style={{ background: dark ? LX.ink : LX.panel, borderTop: `1px solid ${LX.hair}`, borderBottom: `1px solid ${LX.hair}`, padding: "120px 24px", textAlign: "center" }}>
            <div style={{ width: 54, height: 2, background: LX.gold, margin: "0 auto 26px" }} />
            <div style={{ fontFamily: serif, fontSize: 40, fontWeight: 600, color: dark ? LX.ivory : LX.ink, marginBottom: 14 }}>{title}</div>
            <div style={{ fontFamily: sans, fontSize: 18, color: dark ? "#CFC7BB" : LX.body, maxWidth: 540, margin: "0 auto 30px" }}>{body}</div>
            <span style={{ background: LX.gold, color: "#fff", font: `600 14px/1 ${sans}`, letterSpacing: 0.6, textTransform: "uppercase", padding: "15px 34px", display: "inline-block" }}>{button}</span>
          </div>
        );
      },
    },
    Image: {
      label: "Image",
      fields: {
        url: { type: "text", label: "Image URL" },
        align: { type: "radio", label: "Align", options: [{ label: "Left", value: "left" }, { label: "Center", value: "center" }, { label: "Right", value: "right" }] },
        maxWidth: { type: "number", label: "Max width (px, 0 = full)" },
        fade: { type: "number", label: "Fade (0–100%)", min: 0, max: 100 },
        rounded: { type: "number", label: "Corner radius (px)" },
        height: { type: "number", label: "Height (px, 0 = auto)" },
        padY: { type: "number", label: "Vertical padding (px)" },
      },
      defaultProps: { url: "https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=1200&q=70", align: "center", maxWidth: 800, fade: 0, rounded: 8, height: 360, padY: 24 },
      render: ({ url, align, maxWidth, fade, rounded, height, padY }) => (
        <div style={{ textAlign: align as any, paddingTop: padY, paddingBottom: padY, paddingLeft: 24, paddingRight: 24 }}>
          <img src={url} alt="" style={{
            width: "100%", maxWidth: maxWidth ? maxWidth : "100%", height: height ? height : "auto",
            objectFit: "cover", borderRadius: rounded, opacity: 1 - (Math.max(0, Math.min(100, fade || 0)) / 100),
            display: "inline-block", verticalAlign: "top",
          }} />
        </div>
      ),
    },
    ThreeColumns: {
      label: "Three Columns",
      fields: { gap: { type: "number", label: "Gap (px)" } },
      defaultProps: { gap: 30 },
      render: ({ gap }) => (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap, alignItems: "stretch" }}>
          <div><DropZone zone="c1" /></div><div><DropZone zone="c2" /></div><div><DropZone zone="c3" /></div>
        </div>
      ),
    },
    Section: {
      label: "Section (band)",
      fields: {
        bg: { type: "select", options: [
          { label: "Ivory", value: "ivory" }, { label: "White", value: "white" }, { label: "Panel", value: "panel" }, { label: "Ink (dark)", value: "ink" },
        ] },
        padY: { type: "number", label: "Vertical padding (px)" },
      },
      defaultProps: { bg: "ivory", padY: 96 },
      render: ({ bg, padY }) => {
        const map: any = { ivory: LX.ivory, white: LX.white, panel: LX.panel, ink: LX.ink };
        return (
          <div style={{ background: map[bg], paddingTop: padY, paddingBottom: padY, paddingLeft: 24, paddingRight: 24 }}>
            <div style={{ maxWidth: 1100, margin: "0 auto" }}><DropZone zone="content" /></div>
          </div>
        );
      },
    },
    TwoColumns: {
      label: "Two Columns",
      fields: { gap: { type: "number", label: "Gap (px)" } },
      defaultProps: { gap: 40 },
      render: ({ gap }) => (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap, alignItems: "center" }}>
          <div><DropZone zone="left" /></div>
          <div><DropZone zone="right" /></div>
        </div>
      ),
    },
    Hero: {
      label: "Hero",
      fields: {
        eyebrow: { type: "text" }, title: { type: "textarea" }, subtitle: { type: "textarea" },
        cta1: { type: "text", label: "Primary button" }, cta2: { type: "text", label: "Secondary button" },
        bg: { type: "select", options: [{ label: "Ivory", value: "ivory" }, { label: "White", value: "white" }, { label: "Ink (dark)", value: "ink" }] },
        image: { type: "text", label: "Background image URL (optional)" },
      },
      defaultProps: { eyebrow: "Bespoke Atelier", title: "Spaces composed with intention.", subtitle: "A considered approach — where material, light and proportion meet restraint.", cta1: "Book a consultation", cta2: "View portfolio", bg: "ivory", image: "" },
      render: ({ eyebrow, title, subtitle, cta1, cta2, bg, image }) => {
        const dark = bg === "ink";
        const back = bg === "ink" ? LX.ink : bg === "white" ? LX.white : LX.ivory;
        const text = dark ? LX.ivory : LX.ink;
        const sub = dark ? "#CFC7BB" : LX.body;
        const bgStyle = image
          ? { backgroundImage: `linear-gradient(rgba(255,255,255,.5),rgba(255,255,255,.5)), url(${image})`, backgroundSize: "cover", backgroundPosition: "center" }
          : { background: back };
        return (
          <div style={{ ...bgStyle, padding: "140px 24px", textAlign: "center" }}>
            <div style={{ maxWidth: 820, margin: "0 auto" }}>
              <div style={{ font: `600 13px/1 ${sans}`, letterSpacing: 2.2, textTransform: "uppercase", color: LX.gold, marginBottom: 18 }}>{eyebrow}</div>
              <h1 style={{ fontFamily: serif, fontSize: 60, fontWeight: 600, lineHeight: 1.05, letterSpacing: -0.6, color: text, margin: 0 }}>{title}</h1>
              <p style={{ fontFamily: sans, fontSize: 20, fontWeight: 300, lineHeight: 1.6, color: sub, maxWidth: 600, margin: "24px auto 36px" }}>{subtitle}</p>
              <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
                <span style={{ background: LX.ink, color: LX.ivory, font: `600 14px/1 ${sans}`, letterSpacing: 0.6, textTransform: "uppercase", padding: "15px 34px" }}>{cta1}</span>
                {cta2 && <span style={{ border: `1px solid ${text}`, color: text, font: `600 14px/1 ${sans}`, letterSpacing: 0.6, textTransform: "uppercase", padding: "15px 34px" }}>{cta2}</span>}
              </div>
            </div>
          </div>
        );
      },
    },
    Heading: {
      label: "Heading",
      fields: {
        text: { type: "text" },
        level: { type: "select", options: [{ label: "H1", value: "h1" }, { label: "H2", value: "h2" }, { label: "H3", value: "h3" }] },
        align: { type: "radio", options: [{ label: "Left", value: "left" }, { label: "Center", value: "center" }, { label: "Right", value: "right" }] },
      },
      defaultProps: { text: "A practice built on detail", level: "h2", align: "center" },
      render: ({ text, level, align }) => {
        const size = level === "h1" ? 56 : level === "h2" ? 40 : 26;
        return <div style={{ fontFamily: serif, fontSize: size, fontWeight: 600, letterSpacing: -0.4, color: LX.ink, ...ALIGN(align), margin: "0 0 8px" }}>{text}</div>;
      },
    },
    Text: {
      label: "Paragraph",
      fields: { text: { type: "textarea" }, align: { type: "radio", options: [{ label: "Left", value: "left" }, { label: "Center", value: "center" }, { label: "Right", value: "right" }] } },
      defaultProps: { text: "From first sketch to final styling — a single, coherent vision carried through every room.", align: "center" },
      render: ({ text, align }) => <p style={{ fontFamily: sans, fontSize: 17, lineHeight: 1.75, color: LX.body, ...ALIGN(align), margin: "0 0 8px" }}>{text}</p>,
    },
    Button: {
      label: "Button",
      fields: {
        label: { type: "text" },
        variant: { type: "radio", options: [{ label: "Solid", value: "solid" }, { label: "Outline", value: "outline" }] },
        align: { type: "radio", options: [{ label: "Left", value: "left" }, { label: "Center", value: "center" }, { label: "Right", value: "right" }] },
      },
      defaultProps: { label: "Enquire now", variant: "solid", align: "center" },
      render: ({ label, variant, align }) => (
        <div style={{ ...ALIGN(align) }}>
          <span style={variant === "solid"
            ? { background: LX.gold, color: "#fff", font: `600 14px/1 ${sans}`, letterSpacing: 0.6, textTransform: "uppercase", padding: "14px 32px", display: "inline-block" }
            : { border: `1px solid ${LX.ink}`, color: LX.ink, font: `600 14px/1 ${sans}`, letterSpacing: 0.6, textTransform: "uppercase", padding: "14px 32px", display: "inline-block" }}>{label}</span>
        </div>
      ),
    },
    Stat: {
      label: "Stat",
      fields: { value: { type: "text" }, label: { type: "text" } },
      defaultProps: { value: "120+", label: "Residences" },
      render: ({ value, label }) => (
        <div style={{ textAlign: "center" }}>
          <div style={{ fontFamily: serif, fontSize: 58, fontWeight: 600, color: LX.ink }}>{value}</div>
          <div style={{ fontFamily: sans, fontSize: 14, letterSpacing: 1.5, textTransform: "uppercase", color: LX.body, marginTop: 8 }}>{label}</div>
        </div>
      ),
    },
  },
};

export const initialData = {
  root: {},
  zones: {},
  content: [
    { type: "Header", props: { id: "hdr-1", brand: "Aurelia & Co.", links: "Home, Services, Portfolio, About, Contact", cta: "Login" } },
    { type: "Hero", props: { id: "hero-1", eyebrow: "Bespoke Atelier", title: "Spaces composed with intention, crafted to endure.", subtitle: "A considered approach — where material, light and proportion meet restraint. Built for those who value the quiet confidence of timeless design.", cta1: "Book a consultation", cta2: "View portfolio", bg: "ivory", image: "https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=1600&q=70" } },
    { type: "Features3", props: { id: "feat-1", eyebrow: "What we offer", title: "A practice built on detail", cards: [
      { icon: "◇", title: "Full-service design", body: "From first sketch to final styling — a single, coherent vision carried through every room." },
      { icon: "❖", title: "Material curation", body: "Natural stone, aged brass, hand-finished timber. Sourced for warmth and longevity." },
      { icon: "✦", title: "Project stewardship", body: "Discreet, precise project management so the experience feels as refined as the result." },
    ] } },
    { type: "Stats3", props: { id: "stats-1", stats: [{ value: "120+", label: "Residences" }, { value: "18", label: "Years of craft" }, { value: "100%", label: "Bespoke" }] } },
    { type: "Testimonial", props: { id: "test-1", quote: "They understood the home before we could describe it. The result is quiet, warm, and unmistakably ours.", author: "A private residence, Mayfair" } },
    { type: "CTA", props: { id: "cta-1", title: "Begin your commission", body: "A limited number of projects each season, given the attention each deserves.", button: "Enquire now", bg: "panel" } },
    { type: "Footer", props: { id: "ftr-1", brand: "Aurelia & Co.", links: "Home, Services, About, Contact, Privacy", copyright: "© Aurelia & Co. — All rights reserved." } },
  ],
};
