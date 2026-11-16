# Final UI evidence

These screenshots were captured from the final production build (`de7c793`) running locally against the deployed Render API `https://assay-api-7hy0.onrender.com`, using a real invited analyst session and synthetic data.

| File | Screen |
|---|---|
| `login.png` | Invite-only sign-in with the operator logo |
| `dashboard.png` | Analyst portfolio, approved runs and navigation |
| `evaluations.png` | Reppo evaluation register showing the real COMPLETED scan |
| `evaluation-detail.png` | Real provider verdict: score 98, `accept`, `low`, `review`, 440 credits |
| `audit.png` | Auditor view of the signed per-borrower chain |
| `settings.png` | Role/membership and product identity block |
| `integrations.png` | Honest NEAR AI/OpenRouter/SERV/Reppo/Kite status |

Production is protected by Vercel Authentication (Option B), so browser screenshots cannot be taken without an invited session. Production availability and content were verified separately with HTTP/HTML checks (`/`, `/login`, `/dashboard`, `/evaluations`, `/integrations`, `/settings`, `/v1/me`, `/v1/integrations/status`, logo/favicon/OG/manifest). No real borrower data or secret appears in these images.
