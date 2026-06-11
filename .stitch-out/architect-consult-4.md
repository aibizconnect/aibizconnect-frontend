OVERNIGHT DIRECTIVE from Ali: "help Bill build it in a way that I can edit it easily." Bill = the autonomous build agent (Stitch → render bridge → lossless import → page). The lossless path + Layer Tree (D-178..183, structural ops shipped) work, but Ali's bar is EASY editing — closer to our native editor's feel. Rule on priorities and pitfalls; I build tonight.

CANDIDATE SLICES (my proposed order):
1. IN-CANVAS DIRECT TEXT EDITING: double-click any text element inside the band iframe → contentEditable on that node → blur emits a {op:"text"} patch. No tree hunting for simple copy changes. (Biggest "easy" win; mirrors our native InlineText.)
2. WIRE BILL END-TO-END LOSSLESS: switch the in-app Stitch import action (stitch-actions.ts importStitchScreen / wizard path) from the heuristic translator to htmlToLosslessSections + image ingestion + SEO + block-ref cleanup, so every future Bill build arrives lossless + editable without my manual scripts. Includes calling the production CF bridge (data-uid/snapshot already deployed).
3. MEDIA LIBRARY PICKER for the image op (URL input today) — reuse the existing Media Library modal if importable into the band editor context.
4. FRIENDLY TREE: group/label tree nodes semantically (Heading/Text/Image/Button/Link/Icon instead of tag soup), hide wrapper divs behind a "container" toggle, auto-select band's first meaningful node on open.
5. Defer: undo/redo stack (toolbar undo already reverts commits), reconciliation UI, pixel-diff CI.

QUESTIONS: (a) Confirm/improve the order. (b) For #1: any trap making iframe nodes contentEditable w/ sandbox="allow-same-origin" (no allow-scripts)? Parent-side listeners only — workable? (c) For #2: keep heuristic translator reachable via "Convert to blocks" per D-182 — anything else Bill's chain must preserve (low-fidelity flag D-144? tenant theme bootstrap?)? (d) For #4: heuristics for "meaningful node" labels you'd standardize? Terse.
