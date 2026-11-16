# Design Notes — Reference-led UI

## Status

Reference-led UI implemented in Phases 1–5. The operator supplied four AVIF references under `design/reference/`; `design/` is Git-ignored because exact redistribution license text is still pending. The references informed composition, hierarchy, density, typography behavior, color roles and responsive structure. No reference branding, logo, copy or trade dress is reproduced.

## Design system

- **Canvas:** warm paper (`#F3F0E8`-family) with ink text; near-black navigation and proof surfaces.
- **Accent:** acid yellow used for selection, active navigation and the primary compliance/proof emphasis. Status is never conveyed by color alone: every badge has a text label and a dot.
- **Display type:** large, tight display headings (`display` class) paired with compact uppercase tracking labels and quiet metadata.
- **Surfaces:** thin `line` borders, rounded 2xl/3xl cards, restrained shadows, table rows separated by hairlines.
- **Density:** operational tables and cards carry the information; decoration is minimal.
- **Roles:** analyst views expose evidence, redacted pages, exact figures and proof details. Manager views deliberately omit raw debt/EBITDA, names, agreement text and token maps. Auditor views are evidence-only.
- **Actual vs forecast:** the UI uses `resultCode` for the baseline and a separate scenario band block for stress. Stress never relabels the actual result.

## Route composition

- `/dashboard` — hero, portfolio metrics, needs-attention list, run register, three-step explanation.
- `/borrowers`, `/borrowers/[id]`, `/borrowers/new` — register, facility map, create form.
- `/facilities`, `/facilities/[id]` — facility cards, agreement upload, immutable run creation.
- `/documents/[id]` — analyst-only decrypted text preview, no-store.
- `/analysis-runs`, `/analysis-runs/[id]` — run register and the staged workflow: redaction, attested extraction/terms, financial inputs, scenarios, proof, approval.
- `/approvals` — restricted manager decision queue with risk acknowledgement.
- `/audit` — borrower selector, chain verification, sequence/hash/signature table.
- `/covenants` — confirmed covenant snapshots with threshold and result.
- `/cases` — exception list derived from breach/failed run state; detail redirects to the immutable run.
- `/integrations` — honest provider status, including Reppo LIVE and Kite provider-blocked on both documented testnet endpoints.
- `/settings` — current membership, product identity block/logo, role matrix, sign-out and server-only secret boundary.
- `/evaluations`, `/evaluations/[id]` — real Reppo status, score, decision, confidence, route, rubric/result and errors.

## Responsive and accessibility

- Desktop sidebar, mobile top bar/slide-over navigation, responsive card and table layouts with horizontal table scrolling.
- Skip-to-content link, semantic headings, visible focus styles, labelled forms, `role="alert"`/`role="status"` feedback banners.
- Status badges pair text with a dot; contrast is designed for the paper/ink palette.
- Auto-refresh is announced as a `role="status"` message for background jobs.
- Empty, loading, failure, denied and not-found states are present; no inert primary controls. Disabled controls explain why.

## Reference interpretation

- Editorial confidence: oversized display headings, compact uppercase labels, full-width rules.
- Data-first composition: metric strips, registers and evidence cards are primary objects.
- Sticky/staged detail: the analysis detail page is a vertical stage sequence.
- Color roles: yellow is the product accent, not the sole risk signal.
- Responsive intent: desktop operations density, mobile stacked cards and scrollable tables.

Recorded in `REFERENCE_ASSETS.md`; exact license text remains an operator follow-up before external redistribution of the reference images.

## Logo

The operator supplied a 1254×1254 RGBA logo with a dark navy rounded-square field, cyan/blue growth bars and a green/cyan sweep. It has no separate light/dark variant and no text. It is used unmodified in the navigation, login, footer, settings identity block, favicon, Apple touch icon, manifest and OpenGraph card. The dark field remains legible on both the light paper header and dark sidebar, so no recoloring or background rectangle is needed. Canonical copy: `apps/web/public/brand/assay-logo.png` (optimized 512×512); original 1254×1254 and derived icons are committed alongside it. It did not change the existing acid-yellow/ink palette; it acts as the product mark rather than a color source.

## Phase 6 `stageshow` attempt

`npx skills add benjitaylor/skills --skill stageshow` installed successfully (`.agents/skills/stageshow`; security assessments: Gen Safe, Socket 0 alerts, Snyk Low Risk). The skill targets authored faux product UI/marketing illustrations. Applying it to replace Assay's real authenticated screens would conflict with the project rule that every control performs a real action and provider state is never simulated. Therefore:

- **Applied:** its craft principles — restraint, clear focal hierarchy, hard crops, real words only where meaning matters, motion with a cause, and a poster/first-frame that tells the story.
- **Not applied:** faux windows, fake cursor animations, mock data, or replacing real app screens with simulated product UI.
- **Deviation recorded:** real Playwright capture is used for the demo instead of a stageshow composition.

## Known visual limitations

- Subtitle styling in the demo is intentionally large for readability; it can cover lower content on some frames.
- Render free-tier cold starts can leave a short loading state before content in raw recordings; the demo trims the initial blank period.
- Manager and auditor views are intentionally sparse; this is a data-boundary requirement, not missing design.
