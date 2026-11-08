# UI_UX.md — UX architecture and reference-led implementation contract

## Design direction (provisional pending image)
Institutional credit operations software: calm, precise, evidence-forward and data-dense but readable. Provisional tokens: neutral light canvas, deep navy/slate text, restrained blue accent, semantic green/amber/red states, fine dividers and legible data labels. Avoid pure-black canvas, excessive gradients, oversized marketing hero or decorative charts. This is not a substitute for the missing operator reference image; final composition, type, spacing, palette balance and component treatments must be adapted from supplied image(s).

## Main navigation
Desktop left sidebar; mobile drawer: Overview, Borrowers, Facilities, Exceptions, Approvals (roles with action access), Audit Trail (manager/admin/auditor). Header: org name/switcher where relevant, contextual breadcrumbs, user menu and role. No nonfunctional search/notification controls. Footer: verified Documentation and GitHub destinations; never expose a private repo or invent legal/support links.

## Routes and screens

### `/login`
Focused email/password form; show/hide password; submit. States: loading, generic invalid credentials, rate limit, disabled account, network error. Labels, keyboard flow, announced validation. E2E valid/invalid login, protected redirect and logout.

### `/invite/accept`
Single-use invitation acceptance page; reads invitation token from URL fragment, immediately removes it from visible history, then posts token/email/name/password to server. No analytics/third-party scripts on this route; `Referrer-Policy: no-referrer`. States: invalid/expired/revoked/used token, email mismatch, password validation, account already exists, network/rate limit and success redirect to login.

### `/dashboard`
Cards: active facilities, verified compliant, actual breaches, scenario at-risk, open cases, pending approvals. Main attention table: borrower/facility/covenant, actual status, separate scenario badge, test date, owner, next action. Secondary upcoming test and recent activity. Actual count excludes forecasts. Loading, first-use empty, filtered empty, query failure and role-denied states. E2E counts reconcile with DB.

### `/borrowers`
Search/filter/paginated register: legal name, reference, facility count, actual status, open cases, last activity. Create action by role. `/borrowers/new` form; `/borrowers/:id` overview/facilities/documents/activity. Edit only where permitted.

### `/facilities`
Register columns: borrower, facility, reference, currency/commitment, maturity, status, covenant state. `/facilities/:id` header with borrower/facility data and tabs Overview, Covenants, Documents, Cases, Audit. Empty state invites upload agreement.

### `/facilities/:id/documents`
PDF dropzone/file picker, category/period inputs, 25MB max and PDF-only note, clear scanned-PDF limitation. Document list: filename, category, upload date, SHA-256 prefix/copy, version, status, page count, uploader. Status progression uploaded/scanning/extracting/review/processed/failed. Detail drawer shows page-linked extracted text and errors. E2E valid upload, invalid type/size, status polling and unauthorized read.

### `/facilities/:id/covenants`
Register: covenant label/type, formula threshold/operator, next test, definition state, latest actual status and last verification. Candidate review CTA; never allow activation before manager approval.

### `/covenants/:id`
Contract definition/source clause, formula breakdown, active version, latest actual assessment, separate scenario panel, evidence table, history and cases. Run Assessment action confirms test date/evidence snapshot. Scenario action accepts forecast inputs and states explicitly “Scenario — not actual covenant result”. Persistent STALE warning blocks memo/approval actions. E2E formula/source trace and forecast/actual separation.

### `/review/covenants/:versionId`
Show clause source, extracted terms, page/excerpt, confidence/uncertainty, formula rendered in human-readable form, editable allowed fields and submit-for-approval. Manager view compares immutable snapshot. Analyst sees no activation button.

### `/cases` and `/cases/:caseId`
Register filters by status/owner/severity/type; detail shows facility/covenant/assessment, event timeline, notes, assignment/due date, evidence, memo drafts and resolution controls. Closing requires manager role, resolution code and explanation. E2E lifecycle and active-case dedup.

### `/approvals`
Manager queue with target/action, requester, submitted date, dependency snapshot status. Detail shows exact immutable memo/formula/evidence versions, math, citations, changed versions and approve/reject/request changes. Self-approval and stale approval actions disabled with explanation. E2E concurrent/duplicate decisions.

### `/audit`
Event table: sequence/time/actor/action/entity/hash prefix; filter by facility/entity/date; chain verify button. Detail includes redacted payload, prior hash/current hash. Use wording “hash-chain integrity verified”, never “legally immutable” or “non-repudiable”.

### `/settings/members`
ORG_ADMIN only. Membership list, create one-time invitation and copy the returned link once, role update/suspend. No email provider; admin shares link through approved channel. Prevent self-elevation and removal of last active admin.

### Error routes
`/forbidden`, `/not-found`, global error boundary: no existence leak; request ID and retry/contact path; no stack traces.

## Shared components
AppShell, Sidebar/MobileNav, WorkspaceHeader, PageHeader/Breadcrumbs, separate actual/verification/scenario/workflow `StatusBadge`, `EvidenceCitation`, `MetricValue`, `FormulaBreakdown`, `AssessmentCard`, `VerificationChecklist`, `ScenarioCard`, `DocumentUpload`, `DocumentVersionList`, `PdfPageTextViewer`, `CaseTimeline`, `ApprovalPanel`, `AuditChainPanel`, data tables and accessible ConfirmDialog.

## Interaction rules
Every control must work. No `href="#"`, fake links or inert buttons. Async status polling uses backoff and stops at terminal state. Critical status badges use text + shape/icon, not color alone. Disable repeated submit; server idempotency handles retry. Use server-confirmed state for calculation, status and approval, not optimistic writes. Tables have loading, empty, filtered-empty and error states.

## Responsive/accessibility
Test 1440, 1280, 768, 390 and 360 widths; 200% zoom and keyboard-only primary journeys. Responsive tables may horizontally scroll or convert to cards without hiding critical status/actions. Semantic landmarks/headings/labels, focus-visible, dialog focus trap, screen-reader live status, WCAG 2.2 AA contrast and reduced motion. Charts have a textual/table equivalent.

## Required image and UI skill
No reference image was attached. Phase 0 must obtain at least one image and record exact path/source/ownership/intended routes/responsive context in `REFERENCE_ASSETS.md`, or the operator must expressly authorize agent-generated reference imagery. Never claim a nonexistent asset was supplied. Implement actual UI directly from reference; no mockup/prototype phase or approval stop.

At start of final UI work attempt:
```bash
npx skills add benjitaylor/skills --skill stageshow
```
Inspect and apply relevant instructions. Additional UI skills may be evaluated if trustworthy/relevant; reject conflicting or unsafe guidance. If install fails, record output in build log and continue with accessible design-system practices. Document visual interpretation/deviations in `docs/DESIGN_NOTES.md`.

## Final frontend inventory
All routes/navigation/breadcrumbs; desktop/tablet/mobile; keyboard/accessibility; loading/empty/validation/success/error/denied/not-found/stale states; real actions/links; titles/metadata/favicon/app icon/share metadata; verified Documentation/GitHub links only; relevant privacy/contact links only if real; no unfinished placeholders in final UI; label seeded records “Demo data”.
