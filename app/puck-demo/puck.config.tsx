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
  Hero: { eyebrow: string; title: string; subtitle: string; cta1: string; cta2: string; bg: "ivory" | "white" | "ink" };
  Heading: { text: string; level: "h1" | "h2" | "h3"; align: "left" | "center" | "right" };
  Text: { text: string; align: "left" | "center" | "right" };
  Button: { label: string; variant: "solid" | "outline"; align: "left" | "center" | "right" };
  Stat: { value: string; label: string };
  TwoColumns: { gap: number };
  Section: { bg: "ivory" | "white" | "ink" | "panel"; padY: number };
};

const ALIGN = (a: string) => ({ textAlign: a as any });

export const config: Config<Props> = {
  categories: {
    layout: { title: "Layout", components: ["Section", "TwoColumns"] },
    content: { title: "Content", components: ["Hero", "Heading", "Text", "Button", "Stat"] },
  },
  components: {
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
      },
      defaultProps: { eyebrow: "Bespoke Atelier", title: "Spaces composed with intention.", subtitle: "A considered approach — where material, light and proportion meet restraint.", cta1: "Book a consultation", cta2: "View portfolio", bg: "ivory" },
      render: ({ eyebrow, title, subtitle, cta1, cta2, bg }) => {
        const dark = bg === "ink";
        const back = bg === "ink" ? LX.ink : bg === "white" ? LX.white : LX.ivory;
        const text = dark ? LX.ivory : LX.ink;
        const sub = dark ? "#CFC7BB" : LX.body;
        return (
          <div style={{ background: back, padding: "130px 24px", textAlign: "center" }}>
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
  content: [
    { type: "Hero", props: { id: "hero-1", eyebrow: "Bespoke Atelier", title: "Spaces composed with intention, crafted to endure.", subtitle: "A considered approach — where material, light and proportion meet restraint.", cta1: "Book a consultation", cta2: "View portfolio", bg: "ivory" } },
  ],
  root: {},
  zones: {},
};
