---
name: aibizconnect-design
description: Use this skill to generate well-branded interfaces and assets for AIBizConnect / ABC SalesMaster (an all-in-one CRM, marketing automation, website builder, and analytics platform for small business professionals), either for production or throwaway prototypes/mocks/etc. Contains essential design guidelines, colors, type, fonts, assets, and UI kit components for prototyping.
user-invocable: true
---

Read the `readme.md` file within this skill, and explore the other available files.

If creating visual artifacts (slides, mocks, throwaway prototypes, etc), copy assets out and
create static HTML files for the user to view. Link `styles.css` to inherit all design tokens
(colors, type, spacing, shadows). Reusable React primitives live in `components/` and are bundled
into `_ds_bundle.js` under `window.AIBizConnectDesignSystem_d948fa`; full product recreations live
in `ui_kits/` (web app, marketing site, mobile app). The icon set is Lucide line icons, exposed via
`ui_kits/web-app/Icons.jsx` (`window.ABCIcons.Icon`).

If working on production code, copy assets and read the rules in `readme.md` (CONTENT FUNDAMENTALS,
VISUAL FOUNDATIONS, ICONOGRAPHY) to become an expert in designing with this brand.

If the user invokes this skill without any other guidance, ask them what they want to build or
design, ask some questions, and act as an expert designer who outputs HTML artifacts _or_
production code, depending on the need.

Brand in one line: confident, plain-spoken, outcome-focused SaaS for solo professionals —
royal-blue (`#3D49C4`) and navy (`#090966`) on bright near-white surfaces, MontserratAlt1/Montserrat
type, soft cool-tinted shadows, friendly rounded cards, Lucide icons, quick springy motion.
