"use client";

import { useMemo } from "react";
import { parseDataCs } from "@/lib/sites/style-capture";
import type { ImportedPatch } from "@/lib/sites/lossless-importer";
import type { NodeFacts } from "@/lib/sections/node-projection";

/**
 * Attributes panel for an imported CONTAINER node (Box/Grid — no native element projection).
 * Ali: every node in the Layers tree must expose ITS OWN attributes — not its parent's, not its
 * children's. Edits write style patches against the node's uid; the original HTML never mutates.
 */
export default function ImportedBoxInspector({ facts, onPatch }: {
  facts: NodeFacts;
  onPatch: (p: ImportedPatch) => void;
}) {
  const { style, typo } = useMemo(() => parseDataCs(facts.dataCs), [facts.dataCs]);
  const uid = facts.uid;
  const setStyle = (key: string, value: string) => onPatch({ op: "style", uid, style: { [key]: value } });

  const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <label className="flex items-center justify-between gap-2 py-1">
      <span className="text-sm text-slate-600">{label}</span>
      {children}
    </label>
  );

  return (
    <div className="space-y-1">
      <div className="mb-2 rounded bg-slate-50 px-2 py-1.5 text-xs text-slate-500">
        Box (<code className="text-[11px]">{facts.tag}</code>) — container attributes. Its contents are separate elements below it in the tree.
      </div>
      <Row label="Background">
        <input type="color" defaultValue={(style.bg as string) || "#ffffff"} className="h-7 w-10 cursor-pointer border-0 bg-transparent p-0"
          onChange={(e) => setStyle("background-color", e.target.value)} />
      </Row>
      <Row label="Text color">
        <input type="color" defaultValue={(typo.color as string) || "#111827"} className="h-7 w-10 cursor-pointer border-0 bg-transparent p-0"
          onChange={(e) => setStyle("color", e.target.value)} />
      </Row>
      <Row label="Corner radius">
        <input type="number" min={0} max={120} defaultValue={(style.radius as number) ?? 0} className="w-20 rounded border border-gray-300 px-2 py-1 text-sm"
          onChange={(e) => setStyle("border-radius", `${Number(e.target.value) || 0}px`)} />
      </Row>
      <Row label="Padding (px)">
        <input type="number" min={0} max={200} defaultValue={(style.pt as number) ?? 0} className="w-20 rounded border border-gray-300 px-2 py-1 text-sm"
          onChange={(e) => setStyle("padding", `${Number(e.target.value) || 0}px`)} />
      </Row>
      <Row label="Max width (px)">
        <input type="number" min={0} max={1600} placeholder="auto" className="w-20 rounded border border-gray-300 px-2 py-1 text-sm"
          onChange={(e) => { const v = Number(e.target.value); if (v > 0) setStyle("max-width", `${v}px`); }} />
      </Row>
      <Row label="Min height (px)">
        <input type="number" min={0} max={1200} placeholder="auto" className="w-20 rounded border border-gray-300 px-2 py-1 text-sm"
          onChange={(e) => { const v = Number(e.target.value); if (v > 0) setStyle("min-height", `${v}px`); }} />
      </Row>
      <p className="pt-1 text-[11px] text-slate-400">
        Move / duplicate / hide / remove this box from the Actions bar above. Every change is a
        revertible edit in the band&apos;s Edits list.
      </p>
    </div>
  );
}
