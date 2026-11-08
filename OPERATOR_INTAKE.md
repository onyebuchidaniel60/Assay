# OPERATOR_INTAKE.md — One consolidated readiness check

The implementation agent must read the repository and handoff first, then collect all genuinely missing required inputs in one consolidated interaction. Do not re-ask for information already present. Do not modify the repository or start implementation until critical blockers are resolved. Use safe defaults for noncritical preferences and record them.

Status values: `NOT PROVIDED`, `PENDING VALIDATION`, `VALIDATED`, `NOT APPLICABLE`, `BLOCKED`.

## A. Product and demo confirmation

| Input | Required? | Current value/source | Validation | Where used |
|---|---|---|---|---|
| Product name/pronunciation | Required | CovenantOps; pronunciation to confirm in intake | Pending | UI, narration |
| Target demo audience | Required | Not supplied | Pending | Demo script |
| Primary demo journey | Required | Breach workflow in `PROJECT_SPEC.md` | Pending | E2E/demo |
| Synthetic-only demo data | Required | Fixed safe default | Validated as default | Preview/demo |
| Redactions (names, account details, private URLs) | Required | Not supplied; redact by default | Pending | Video/docs |
| Artifact output path | Required | Suggest repository `artifacts/demo/`; operator confirms | Pending | Video/script |

## B. Reference assets and UI

| Input | Required? | Current value/source | Validation | Where used |
|---|---|---|---|---|
| At least one UI reference image | Required | **Not attached / not located** | BLOCKED until supplied or express image-generation permission | Phase 6 |
| Exact filenames/paths | Required when supplied | None known | Pending | `REFERENCE_ASSETS.md` |
| Image source/ownership and usage rights | Required | Not supplied | Pending | UI implementation |
| Pages/components represented | Required | Not supplied | Pending | `UI_UX.md` |
| Desktop/mobile expectations | Required | Default: desktop-first operations UI, fully responsive down to 360px | Safe default, confirm | UI/E2E |
| Express authorization to generate an image if no reference can be supplied | Required fallback decision | Not granted | Pending | Reference readiness |
| Brand constraints/logo/colors/fonts | Optional | None supplied; use original design derived from image | Pending/default | UI |

No agent may claim a missing image was supplied. If the operator expressly authorizes generated reference imagery, record the exact authorization and resulting file path.

## C. Repository and source control

| Input | Required? | Current value/source | Validation | Where used |
|---|---|---|---|---|
| Repository URL/path | Required | Not supplied | Pending | Inspect before changes |
| Repository visibility and access | Required | Not supplied | Pending | Git |
| Target branch | Required | Default `main`; do not force push | Pending | Git |
| Write/commit permission | Required | Not supplied | Pending | Implementation |
| Existing work to preserve | Required after inspection | Unknown | Pending | Repository plan |
| CI/deploy access | Required for preview | Not supplied | Pending | Preview |

## D. Vultr infrastructure and accounts

| Input | Required? | Current value/source | Validation | Where used |
|---|---|---|---|---|
| Vultr account/project access | Required | Not verified | Pending | Compute, Object Storage, Inference |
| Compute region | Required | Default nearest suitable supported region after latency, availability and data-policy review; operator confirms | Pending | VM |
| VM size | Required | Proposed 4 vCPU / 8 GB / 160 GB NVMe; subject to live quote and workload | Pending | Hosting |
| Maximum total cost and billing period | **Critical** | **Not provided; no spending authorized** | BLOCKED | All paid resources |
| Existing Vultr credits/balance and expiry | Required to plan spend, not assumed | Not verified | Pending | Budget |
| Permission to create/delete/resize VM | Required, scope separately | Not granted | Pending | Provisioning |
| Object Storage account, region, bucket | Required | Not configured | Pending | Private PDFs/reports |
| S3 access key/secret | Required for deployed environment | Not supplied; secret manager/runtime only | Pending | Storage adapter |
| Inference API key | Required | Not supplied | Pending | AI extraction/memo |
| Inference model ID/catalog access | Required | Proposed `deepseek-v4.1-flash-1017`; must be live-verified, not assumed | Pending | AI |
| Model quotas/rate limits/cost ceiling | Required | Unknown | Pending | AI safety |
| Permission to provision/delete bucket or objects | Required, scoped | Not granted | Pending | Storage |

## E. Domain, networking and TLS

| Input | Required? | Current value/source | Validation | Where used |
|---|---|---|---|---|
| Domain/subdomain for preview | Required for stable HTTPS preview | Not supplied | Pending | Caddy/HTTPS |
| DNS management access | Required | Not supplied | Pending | TLS routing |
| SSH access method and allowed source IP/CIDR | Required | Not supplied | Pending | VM administration |
| Permission to change firewall rules | Required, exact ports/sources | Not granted | Pending | Network security |
| Preview access model | Required | Default protected by invite-only login; no public customer data | Pending | Preview |
| Production domain | Optional until release | Not supplied | Not applicable to MVP preview | Production |

## F. Data, security and authorization boundaries

| Input | Required? | Current value/source | Validation | Where used |
|---|---|---|---|---|
| Data classification allowed in hackathon build | **Critical** | Safe default: synthetic data only; no real borrower data | Validated safe default | All environments |
| Approved data residency/region constraints | Required | Not supplied | Pending | Region selection |
| Secrets storage method | Required | Runtime secret injection / restricted `.env` outside Git; no client exposure | Pending | Deployment |
| Backup retention and restore expectations | Required | Default preview: 7 days, encrypted; verify restore | Pending | Operations |
| Allowed external network destinations | Required | Minimum: Vultr Object Storage and Vultr Inference from server-side worker/web as needed | Pending | Firewall/egress |
| Destructive actions allowed | Required | Default: none without exact explicit permission | Pending | Operations |
| Financial/legal/external communications actions | Required | Default: no real communications, payments or legal notices | Pending | Agent permissions |
| Production release authority | **Critical for production only** | **Not authorized**; staging-only until separately approved | Fixed boundary | Release |

## G. Third-party service readiness

| Service | Required? | Account/permission needed | Status |
|---|---|---|---|
| Vultr Cloud Compute | Required | Create/configure VM within explicit cost ceiling | Pending |
| Vultr Object Storage | Required | Private bucket and S3-compatible credentials | Pending |
| Vultr Serverless Inference | Required for AI-enabled MVP | API key, enabled model, quotas and cost terms | Pending |
| Domain/DNS/TLS | Required for stable preview | Domain and DNS write access | Pending |
| GitHub | Required for source repo/CI | Repo write and Actions/deploy permissions | Pending |
| Google AI TTS | Optional | Verify current free quota/terms and key; no charge without consent | Pending |
| Local free TTS fallback | Optional fallback | Verify license of selected voice/model | Pending |
| Email/communications integration | Not in MVP | No connection or send permission required | N/A |
| Payment/banking integration | Not in MVP | No account or keys requested | N/A |

## H. Operator actions and output authority

| Action | Default boundary | Operator grant (record exact scope) | Validation |
|---|---|---|---|
| Read repository and inspect env variable names | Allowed; never reveal secret values | — | Pending |
| Modify repository/commit | Only after Phase 0 readiness passes | To be confirmed | Pending |
| Deploy preview | Only to named preview domain using synthetic data and within cost cap | To be confirmed | Pending |
| Provision paid Vultr services | Not authorized by credentials alone | Exact max amount, resource, region and period required | Pending |
| Delete/replace infrastructure or buckets | Prohibited by default | Exact resource and rollback approval required | Pending |
| Send external emails/notices | Prohibited; not in MVP | None | Fixed boundary |
| Production deploy | Not authorized | Exact target, release window and allowed migrations/actions | Pending; production remains blocked absent grant |
| Publish repository/demo | Confirm repo visibility and permitted data | To be confirmed | Pending |

## I. Consolidated readiness result

The implementation agent must fill this table after the single intake and technical validation.

| Gate | Pass condition | Result |
|---|---|---|
| Repository | Correct repo/branch accessible; baseline captured | Pending |
| UI reference | Image inspected or explicit generation authorization recorded | **BLOCKED** |
| Vultr Compute | Account access, region, VM plan and exact cost authorization validated | Pending |
| Object Storage | Bucket/private policy/credentials validated with test object | Pending |
| Inference | API key/model catalog/rate and budget verified; response model matches requested ID | Pending |
| Domain/TLS | DNS and preview host access verified | Pending |
| Network | SSH/firewall authority and ingress/egress plan verified | Pending |
| Data policy | Synthetic-only confirmed or approved safe data policy recorded | Safe default: synthetic only |
| Budget | Numeric ceiling and billing period recorded | **BLOCKED** |
| Preview authority | Exact preview deployment authority recorded | Pending |
| Production authority | Explicit production grant or staging-only constraint recorded | Staging-only default |
| Demo | Audience, narration pronunciation, redaction and output path confirmed | Pending |

**Phase 0 may pass only when all critical rows are validated.** No implementation starts while critical blockers remain. Optional missing services do not block unaffected work.
