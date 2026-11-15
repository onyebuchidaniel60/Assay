# Assay — Reference Asset Register

## Current status

**Operator-supplied UI references received and inspected.** The operator supplied four AVIF images in `design/reference/` and states they are licensed for reference use under the intake's Option A. Exact license text is not present in the repository; record or attach it before redistributing the images outside this project.

These are visual-direction references only. Do not copy the source template's brand name, logo, proprietary copy, or trade dress into Assay. Translate composition, hierarchy, density, typography behavior, color roles, spacing, and interaction patterns into an original Assay interface.

## Inventory

| Asset ID | Exact filename/path | Source / owner | Intended use | Review status |
|---|---|---|---|---|
| UI-REF-01 | `design/reference/assayref1.avif` | Operator-supplied; licensed per Option A (operator assertion) | Dashboard, archive, analysis detail and responsive composition | Inspected |
| UI-REF-02 | `design/reference/assayref2.avif` | Operator-supplied; licensed per Option A (operator assertion) | Sticky-chart / staged-detail interaction and chapter navigation | Inspected |
| UI-REF-03 | `design/reference/assayref3.avif` | Operator-supplied; licensed per Option A (operator assertion) | Analysis index, writer/analyst profile, cards and footer | Inspected |
| UI-REF-04 | `design/reference/assayref4.avif` | Operator-supplied; licensed per Option A (operator assertion) | Home hierarchy, pricing/rate sheet, email capture, mobile | Inspected |

All images are 1600 × 1200 AVIF. The working tree currently has them under `design/reference/`; `design/` is Git-ignored and not redistributed until the exact license text is attached.

## Observed design principles

- High-contrast editorial system: near-black canvas, warm cream/paper surfaces, acid-yellow accent, restrained grayscale typography.
- Strong typographic hierarchy: oversized display headlines paired with compact uppercase labels and quiet metadata.
- Data-first composition: charts, metric cards, archives and tables are the primary visual objects; decoration is minimal.
- Dense but legible information: thin dividers, compact labels, generous section spacing, and clear card boundaries.
- Recurring navigation and action language: small top navigation, pill buttons, chapter/step markers, numbered annotations.
- Responsive intent: desktop layouts with side-by-side chart/annotation panels and a mobile stack with persistent primary action.
- Interaction cues: sticky chart sections, chapter markers, filter chips and tab-like archive controls.

## Required interpretation for Assay

Assay should use the reference's editorial confidence and data density, but adapt it to credit operations:

- Actual and forecast statuses must remain text-labelled and visually distinct; yellow cannot be the only risk signal.
- Compliance, breach, stale, proof, and approval states need their own semantic badges and accessible contrast.
- Evidence citations, financial figures, proof state, and approval controls must be one interaction away from the result.
- Manager and auditor views must remain role-shaped and must not expose raw financial values by default.
- No Carry brand assets, wordmark, copy, or protected trade dress may be reused.

## Inspection checklist

- [x] Exact paths recorded.
- [x] Image dimensions/file type recorded.
- [x] Source/ownership assertion recorded.
- [x] Intended screens recorded.
- [x] Composition, hierarchy, density, typography, color, components and responsive cues inspected.
- [x] Copying restrictions recorded.
- [ ] Exact license text attached to the repository (operator action before external redistribution).
