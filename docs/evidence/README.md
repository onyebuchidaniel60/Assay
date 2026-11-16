# Final UI evidence

These screenshots were captured on 16 November 2026 from the public production deployment `https://assay-uhhh2.vercel.app` at commit `c27a02a`, using a headed Chromium session (Xvfb) and the invited synthetic accounts. Public pages were captured anonymously.

| File | Group | Route |
|---|---|---|
| `public-landing.png` | Public | `/` |
| `public-login.png` | Public | `/login` |
| `public-signed-in.png` | Public → analyst | `/login` → `/dashboard` |
| `public-forbidden.png` | Public | `/forbidden` |
| `public-not-found.png` | Public | unknown route (404) |
| `analyst-dashboard.png` | Analyst | `/dashboard` |
| `analyst-borrowers.png` | Analyst | `/borrowers` |
| `analyst-borrower-new.png` | Analyst | `/borrowers/new` |
| `analyst-borrower-detail.png` | Analyst | `/borrowers/[id]` |
| `analyst-facilities.png` | Analyst | `/facilities` |
| `analyst-facility-detail.png` | Analyst | `/facilities/[id]` |
| `analyst-runs.png` | Analyst | `/analysis-runs` |
| `analyst-run-detail.png` | Analyst | `/analysis-runs/[id]` |
| `analyst-document.png` | Analyst | `/documents/[id]` |
| `analyst-covenants.png` | Analyst | `/covenants` |
| `analyst-cases.png` | Analyst | `/cases` |
| `analyst-case-detail.png` | Analyst | `/cases/[runId]` |
| `analyst-evaluations.png` | Analyst | `/evaluations` |
| `analyst-evaluation-detail.png` | Analyst | `/evaluations/[id]` |
| `admin-settings.png` | Admin controls | `/settings` |
| `admin-integrations.png` | Admin controls | `/integrations` |
| `manager-dashboard.png` | Manager | `/dashboard` |
| `manager-approvals.png` | Manager | `/approvals` |
| `auditor-audit.png` | Auditor | `/audit?borrower=[id]` |
| `auditor-run-detail.png` | Auditor | `/analysis-runs/[id]` |

A 24-route automated check confirmed every page returned the expected status, contained at least one `img` with `alt="Assay"`, contained no `preview`/`demo`/`staging` user-facing string, and showed no Vercel toolbar. The five actual route families replace the blueprint shorthand: `/analysis-runs/[id]` (not `/analyses/[id]`), `/approvals` (not `/reviews`), and `/audit?borrower=[id]` (not `/audit/[borrowerId]`).

The deployment is public; Vercel Authentication is disabled. The app itself remains invite-only, so non-public workspace routes redirect to the Assay login page. No real borrower data or secret appears in these images.
