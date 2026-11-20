import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";

export const metadata: Metadata = {
  title: "Assay — Covenant review, with receipts",
  description:
    "AI-assisted covenant monitoring for credit teams. The model interprets. Code calculates. Cryptography proves. A human approves.",
  robots: {
    index: true,
    follow: true,
  },
};
import {
  ArrowRight,
  ArrowUpRight,
  Binary,
  CheckCircle2,
  ChevronDown,
  Cpu,
  EyeOff,
  FileCheck2,
  FileLock2,
  GitCompareArrows,
  KeyRound,
  Layers,
  LockKeyhole,
  Play,
  Scale,
  ScanText,
  ShieldCheck,
  Sparkles,
  UserCheck,
} from "lucide-react";
import { StatusBadge } from "@/components/status-badge";

const DEMO_VIDEO_URL =
  "https://github.com/onyebuchidaniel60/Assay/releases/download/demo-v2/assay-demo-v2.mp4";
const DOCS_URL = "https://github.com/onyebuchidaniel60/Assay/tree/main/docs";
const REPO_URL = "https://github.com/onyebuchidaniel60/Assay";

const heroBadges = [
  "Deterministic",
  "TEE-attested",
  "ZK-proven",
  "Human-approved",
];

const processStages = [
  {
    step: "01",
    name: "Upload",
    detail: "PDF or UTF-8 text validated and sealed with AES-256-GCM before storage.",
  },
  {
    step: "02",
    name: "Redact",
    detail: "Reduced-profile Presidio tokenizes identifiers; an analyst confirms every page.",
  },
  {
    step: "03",
    name: "Extract",
    detail: "NEAR AI Cloud extracts terms with fresh Intel TDX and NVIDIA NRAS attestation.",
  },
  {
    step: "04",
    name: "Calculate",
    detail: "Decimal.js and an independent BigInt verifier compute baseline and stress ratios.",
  },
  {
    step: "05",
    name: "Prove",
    detail: "Fixed Groth16 circuit proves the leverage inequality without exposing raw figures.",
  },
  {
    step: "06",
    name: "Approve",
    detail: "A credit manager reviews the restricted summary and records one row-locked decision.",
  },
  {
    step: "07",
    name: "Audit",
    detail: "Every event is SHA-256 hash-chained and Ed25519-signed per borrower.",
  },
];

const subProblems = [
  {
    number: "01",
    title: "Fragmented process",
    body: "The agreement lives in a PDF, the figures live in a spreadsheet, and the decision lives in an email thread. Nothing binds the final ratio back to the exact covenant clause or the attested financial inputs.",
  },
  {
    number: "02",
    title: "Inconsistent interpretation",
    body: "Two analysts can read the same Adjusted EBITDA definition and permitted add-back caps differently. Unchecked model summaries blur definitions instead of enforcing source-quoted terms.",
  },
  {
    number: "03",
    title: "No audit trail",
    body: "When a compliance decision is questioned weeks later, there is no machine-readable record of how the terms were extracted, how caps were applied, or which snapshot the manager approved.",
  },
];

const solutionCapabilities = [
  {
    icon: Binary,
    title: "Deterministic calculation",
    body: "Integer minor-unit arithmetic and permitted add-back caps run in deterministic application code with an independent BigInt reference verifier — never inside a language model.",
  },
  {
    icon: Cpu,
    title: "TEE-attested inference",
    body: "Sensitive extraction routes only redacted text to NEAR AI Cloud and verifies fresh Intel TDX and NVIDIA NRAS evidence, nonce binding, and the ECDSA response signature on every call.",
  },
  {
    icon: ShieldCheck,
    title: "ZK compliance proof",
    body: "A fixed Circom Groth16 circuit proves that total debt and adjusted EBITDA satisfy the confirmed threshold so a manager can verify compliance without seeing the borrower's raw figures.",
  },
];

const howItWorksSteps = [
  {
    number: "01",
    title: "Upload: encrypted before storage",
    body: "Assay checks magic bytes, 10 MiB size and 40-page limits, rejects scanned or password-protected PDFs, and encrypts the document under a per-borrower AES-256-GCM data key before writing ciphertext to private storage.",
    icon: FileLock2,
    tag: "AES-256-GCM · HKDF HMAC",
    lines: [
      ["Validation", "PDF/TXT magic bytes · ≤ 10 MiB · ≤ 40 pages · text layer required"],
      ["Key hierarchy", "Per-borrower DEK wrapped by server-held KEK"],
      ["Object store", "Ciphertext only · private S3-compatible bucket"],
    ],
  },
  {
    number: "02",
    title: "Redact: Presidio + analyst review before any model call",
    body: "Presidio runs in a deliberately reduced profile with custom financial recognizers. The analyst inspects and confirms the tokenized pages before any external inference request can be queued.",
    icon: ScanText,
    tag: "REDUCED_PII_MODE · MANDATORY GATE",
    lines: [
      ["Tokenized spans", "[ORGANIZATION_8F12A9C0] · [ASSAY_REFERENCE_44C1E8B2] · [ASSAY_ACCOUNT_9D02F11A]"],
      ["Preserved clause", "Section 7.01 Maximum Consolidated Total Debt to Consolidated Adjusted EBITDA ≤ 3.50 to 1.00"],
      ["Token map", "Sealed under borrower DEK · never leaves backend storage"],
    ],
  },
  {
    number: "03",
    title: "Extract: NEAR AI TEE-attested inference on tokenized text",
    body: "NEAR AI Cloud extracts one maximum leverage covenant with verbatim page quotes. Assay verifies Intel TDX and NVIDIA NRAS attestation bound to a fresh 32-byte nonce, then gates routing through SERV Reasoning.",
    icon: Cpu,
    tag: "TDX UpToDate · NRAS true",
    lines: [
      ["Model & gate", "z-ai/glm-5.3-flash (verifiable + attestationSupported) · SERV branch SUPPORTED_CLEAR"],
      ["Evidence check", "6 verbatim quotes matched character-for-character against parsed pages"],
      ["Failure policy", "Missing or invalid attestation aborts extraction and leaves a visible FAILED state"],
    ],
  },
  {
    number: "04",
    title: "Calculate: deterministic engine + independent BigInt verifier",
    body: "Analyst-attested figures are sealed in minor units. Decimal.js computes baseline leverage and two sensitivity scenarios (-10% EBITDA, +10% Debt), while an independent BigInt evaluator verifies every number.",
    icon: Scale,
    tag: "DECIMAL.JS + BIGINT VERIFIED",
    lines: [
      ["Baseline ratio", "3.0660x (3.07x display) vs ≤ 3.50x threshold · COMPLIANT · headroom 12.40%"],
      ["Stress scenarios", "EBITDA -10%: 3.4067x (COMPLIANT) · Debt +10%: 3.3726x (COMPLIANT)"],
      ["SERV coherence", "Structured non-identifying check CONFIRMED before proof stage unlocks"],
    ],
  },
  {
    number: "05",
    title: "Prove: Groth16 proof of the covenant predicate",
    body: "A one-shot worker generates a Groth16 proof over the fixed leverage-v1 circuit (`debt * 10000 <= adjustedEbitda * thresholdBps`). The private witness is passed over stdin and never persisted to disk.",
    icon: FileCheck2,
    tag: "CIRCOM GROTH16 · LEVERAGE-V1",
    lines: [
      ["Public signals", "[\"1\", \"35000\"] — compliant outcome (1) bound to 35,000 bps (3.50x) threshold"],
      ["Verification key", "f0314fb2c221bf88c8c0204ef51962721b54f448e9183e36667c92a4981690fb"],
      ["Server check", "Verified at generation and re-verified from storage inside the approval transaction"],
    ],
  },
  {
    number: "06",
    title: "Approve: maker-checker, row-locked, proof-bound, with a signed audit event",
    body: "The credit manager sees only the restricted summary, scenario bands, and proof status. Approving locks the analysis row, re-verifies the stored proof, enforces stress-breach acknowledgement, and appends an Ed25519-signed audit event.",
    icon: UserCheck,
    tag: "MAKER-CHECKER · ED25519 SIGNED",
    lines: [
      ["Role boundary", "Raw debt, EBITDA, borrower alias, agreement text, and token map excluded from manager DTO"],
      ["Concurrency", "Row-level FOR UPDATE lock + analysisVersion check prevents conflicting approvals"],
      ["Audit event", "ANALYSIS_APPROVED chained via SHA-256 and signed with server Ed25519 key"],
    ],
  },
];

const featureCards = [
  {
    icon: Binary,
    title: "Non-custodial calculation",
    body: "The language model never calculates the ratio. Deterministic code converts inputs to integer minor units, enforces add-back caps, and cross-checks results with an independent BigInt verifier.",
  },
  {
    icon: ShieldCheck,
    title: "Audit-chain verification",
    body: "Every borrower owns a sequential SHA-256 hash chain signed with Ed25519. Auditors verify the entire chain and every signature without decrypting sealed payloads.",
  },
  {
    icon: KeyRound,
    title: "Crypto-shredding",
    body: "Deleting a borrower's wrapped DEK renders its encrypted documents, financial snapshots, and sealed audit payloads unreadable through the key store while keeping the hash chain verifiable.",
  },
  {
    icon: EyeOff,
    title: "Role-scoped views",
    body: "Analysts inspect source evidence and financial figures; credit managers see only threshold, compliance status, proof state, and stress bands; auditors verify cryptographic provenance.",
  },
  {
    icon: UserCheck,
    title: "Maker-checker approval",
    body: "Self-approval is blocked, stressed breaches require explicit risk acknowledgement and rationale, and row-level locking ensures concurrent manager requests cannot race.",
  },
  {
    icon: GitCompareArrows,
    title: "Reppo feedback loop",
    body: "Analyst corrections can be submitted as de-identified, field-level traces after a 50 KB preflight check for independent multi-evaluator scoring on Reppo.",
  },
];

const privacyLayers = [
  {
    title: "Redaction before any model sees the document",
    body: "Documents are parsed locally and tokenized by a reduced-model Presidio service (`REDUCED_PII_MODE`) plus deterministic financial recognizers. Mandatory analyst review blocks any model call until redaction is confirmed.",
  },
  {
    title: "TEE-attested inference for sensitive extraction",
    body: "Sensitive inference is routed to NEAR AI Cloud's TEE-attested gateway. Each request is verified against fresh Intel TDX and NVIDIA NRAS attestation evidence bound to a client nonce and a signed response.",
  },
  {
    title: "ZK proof of compliance without exposing the numbers",
    body: "The Groth16 proof proves that the private witness satisfies the fixed leverage inequality for the confirmed threshold. It allows manager verification without exposing raw debt or EBITDA.",
  },
  {
    title: "Encrypted, hash-chained, crypto-shreddable audit trail",
    body: "Sensitive payloads are sealed under a per-borrower AES-256-GCM key while canonical envelope metadata and ciphertext digests are chained with SHA-256 and signed with Ed25519.",
  },
  {
    title: "Human approval that cannot be bypassed",
    body: "No model or external evaluator can approve a covenant, override a baseline breach, or alter policy. A human manager records the decision against a server-verified proof and immutable snapshot version.",
  },
];

const stackItems = [
  {
    name: "SERV Reasoning",
    badge: "LIVE",
    tone: "positive" as const,
    role: "Workflow orchestration and audit — gates extraction routing and confirms post-calculation scenario coherence.",
  },
  {
    name: "NEAR AI",
    badge: "LIVE · ATTESTED",
    tone: "proof" as const,
    role: "TEE-attested confidential inference — runs covenant extraction with per-request Intel TDX and NVIDIA NRAS verification.",
  },
  {
    name: "Reppo",
    badge: "LIVE · 98/100",
    tone: "positive" as const,
    role: "Independent evaluation of corrections — scores de-identified field-level feedback traces without raw borrower data.",
  },
  {
    name: "Arc · Circle Gateway",
    badge: "INTEGRATED · TESTNET POLICY",
    tone: "warning" as const,
    role: "x402 agent payments on Arc Testnet — official Circle Gateway SDK, deterministic provider/endpoint/network/USDC/recipient/cap/expiry/idempotency policy and no blind retry.",
  },
  {
    name: "SEC EDGAR",
    badge: "IMPLEMENTED · HOST 403",
    tone: "warning" as const,
    role: "Free public XBRL provider — source-linked parsing, period validation, content hash and private-borrower limits are implemented; SEC returned HTTP 403 from both tested egresses, so no live result is claimed.",
  },
  {
    name: "Neon",
    badge: "LIVE",
    tone: "positive" as const,
    role: "Postgres, auth, object storage — canonical relational store, `FOR UPDATE SKIP LOCKED` job queue, managed Better Auth, and private ciphertext storage.",
  },
];

const faqs = [
  {
    question: "Is this a production credit system?",
    answer:
      "No. Assay is a synthetic-data MVP built for credit covenant operations around one maximum Debt / Adjusted EBITDA covenant. It uses synthetic borrower records only and is not a production credit decision system.",
  },
  {
    question: "Does the LLM calculate the ratio?",
    answer:
      "No. Language models never perform authoritative arithmetic in Assay. Total debt, reported EBITDA, and permitted add-backs are converted to integer minor units and calculated deterministically with Decimal.js, then cross-checked by an independent BigInt reference verifier.",
  },
  {
    question: "What does the ZK proof actually prove?",
    answer:
      "The fixed Circom Groth16 circuit proves only that the supplied private witness (total debt and adjusted EBITDA in minor units) satisfies the inequality debt * 10000 <= adjustedEbitda * thresholdBps for the public covenant threshold. It does not prove the authenticity of the source PDF or the truth of the analyst-entered figures.",
  },
  {
    question: "What happens if the model provider is down?",
    answer:
      "The analysis run fails visibly or pauses in an explicit pending state (`ATTESTATION_FAILED`, `PROVIDER_UNAVAILABLE`, or `CALCULATED_SERV_PENDING`). Assay never fabricates a provider response, attestation report, Reppo verdict, or payment receipt.",
  },
  {
    question: "Can I try it?",
    answer:
      "Yes. Sign in at /login using the invited synthetic workspace accounts provided for evaluation: analyst@assay.test, manager@assay.test, or auditor@assay.test. Public sign-up is disabled at the auth service.",
  },
  {
    question: "How does the Arc payment integration work?",
    answer:
      "Assay uses Circle Gateway's official x402 batching SDK on Arc Testnet. The provider's actual 402 requirement is evaluated by a deterministic policy that checks the approved provider, exact endpoint, network (eip155:5042002), Arc USDC contract, recipient, per-payment cap, aggregate budget, expiry, idempotency and duplicate nonce. A rejection never reaches execution. A timeout becomes RECONCILIATION_REQUIRED and is looked up, not paid again. The code and mock-server tests are implemented; no live paid financial-data retrieval is claimed because no Arc-Testnet financial-data merchant was available and no testnet funds were supplied. SEC EDGAR is implemented but returned HTTP 403 from both tested egresses, so no live SEC result is claimed.",
  },
  {
    question: "Why is Presidio labeled REDUCED_PII_MODE?",
    answer:
      "To run reliably within the 512 MB Render free-tier memory envelope, Assay pairs Presidio Analyzer (en_core_web_sm) with deterministic custom recognizers for borrower references, account numbers, and emails, and requires mandatory human analyst confirmation before any model call.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen text-ink">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-line bg-canvas/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1220px] items-center justify-between px-5 py-4 sm:px-8">
          <Link href="/" prefetch={false} className="flex items-center gap-3">
            <Image
              src="/brand/assay-logo.png"
              alt="Assay"
              width={40}
              height={40}
              priority
              className="size-10 rounded-xl"
            />
            <div>
              <span className="block text-sm font-bold uppercase tracking-[0.24em]">Assay</span>
              <span className="hidden text-[10px] font-medium uppercase tracking-[0.16em] text-muted sm:block">
                Covenant operations
              </span>
            </div>
          </Link>

          <nav aria-label="Homepage sections" className="hidden items-center gap-6 text-xs font-semibold text-muted lg:flex">
            <a href="#problem" className="transition hover:text-ink">Problem</a>
            <a href="#solution" className="transition hover:text-ink">Solution</a>
            <a href="#how-it-works" className="transition hover:text-ink">How it works</a>
            <a href="#security" className="transition hover:text-ink">Security</a>
            <a href="#faq" className="transition hover:text-ink">FAQ</a>
          </nav>

          <div className="flex items-center gap-2.5">
            <Link
              href="/login"
              prefetch={false}
              className="rounded-full border border-line bg-paper px-4 py-2 text-xs font-semibold text-ink transition hover:border-ink/40 hover:bg-white"
            >
              Sign in
            </Link>
            <Link
              href="/login"
              prefetch={false}
              className="inline-flex items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-xs font-semibold text-paper transition hover:bg-ink-soft"
            >
              Open app <ArrowUpRight className="size-3.5" />
            </Link>
          </div>
        </div>
      </header>

      <main id="main">
        {/* (1) Hero */}
        <section className="mx-auto max-w-[1220px] px-5 pb-16 pt-10 sm:px-8 lg:pb-24 lg:pt-16">
          <div className="grid gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div>
              <div className="inline-flex items-center gap-3 rounded-2xl border border-line bg-paper px-3.5 py-2 shadow-xs">
                <Image
                  src="/brand/assay-logo.png"
                  alt="Assay"
                  width={28}
                  height={28}
                  className="size-7 rounded-lg"
                />
                <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-ink">
                  Assay · Verifiable covenant workflow
                </span>
              </div>

              <h1 className="display mt-6 text-5xl font-semibold sm:text-6xl lg:text-[5.25rem]">
                Covenant review,
                <br />
                <span className="underline decoration-acid decoration-[8px] underline-offset-[6px]">
                  with receipts.
                </span>
              </h1>

              <p className="mt-7 max-w-2xl text-base leading-7 text-muted sm:text-lg">
                AI-assisted covenant monitoring for credit teams. The model interprets. Code calculates. Cryptography
                proves. A human approves.
              </p>

              <ul aria-label="Core guarantees" className="mt-6 flex flex-wrap gap-2">
                {heroBadges.map((badge) => (
                  <li
                    key={badge}
                    className="inline-flex items-center gap-2 rounded-full border border-line bg-paper px-3.5 py-1.5 text-xs font-semibold text-ink"
                  >
                    <span className="size-2 rounded-full bg-ink" aria-hidden />
                    {badge}
                  </li>
                ))}
              </ul>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link
                  href="/login"
                  prefetch={false}
                  className="inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3.5 text-sm font-semibold text-paper transition hover:bg-ink-soft"
                >
                  Open app <ArrowUpRight className="size-4" />
                </Link>
                <a
                  href={DEMO_VIDEO_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border border-line bg-paper px-5 py-3.5 text-sm font-semibold text-ink transition hover:border-ink/40 hover:bg-white"
                >
                  <Play className="size-4 fill-current" /> Watch demo
                </a>
                <Link
                  href="/dashboard"
                  prefetch={false}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-muted underline decoration-line underline-offset-4 transition hover:text-ink"
                >
                  <LockKeyhole className="size-3.5" /> Enter the workspace
                </Link>
              </div>

              <p className="mt-5 max-w-xl text-xs leading-5 text-muted">
                Synthetic borrower records only. Invite-only staff access for analysts, credit managers, and auditors.
              </p>
            </div>

            <div className="relative">
              <div className="overflow-hidden rounded-3xl border border-ink/15 bg-ink p-3 text-paper shadow-2xl sm:p-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-2 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="size-2.5 rounded-full bg-acid" aria-hidden />
                    <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-white/80">
                      BOR-018 · Run #1 · Attested &amp; Approved
                    </span>
                  </div>
                  <StatusBadge tone="proof">ATTESTATION VERIFIED</StatusBadge>
                </div>
                <div className="mt-3 overflow-hidden rounded-2xl border border-white/10 bg-paper">
                  <Image
                    src="/screenshots/analyst-run-detail.png"
                    alt="Assay analysis run detail page showing verified NEAR AI Intel TDX and NVIDIA NRAS attestation, confirmed financial inputs, and approved compliance status"
                    width={1440}
                    height={900}
                    sizes="(max-width: 640px) 92vw, (max-width: 1024px) 88vw, 560px"
                    quality={75}
                    priority
                    className="h-auto w-full object-cover"
                  />
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                  <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                    <p className="text-[10px] uppercase tracking-[0.14em] text-white/70">Baseline leverage</p>
                    <p className="mt-0.5 font-mono text-sm font-semibold text-paper">3.07x ≤ 3.50x</p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                    <p className="text-[10px] uppercase tracking-[0.14em] text-white/70">ZK predicate</p>
                    <p className="mt-0.5 font-mono text-sm font-semibold text-acid">Signals 1 · 35000</p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                    <p className="text-[10px] uppercase tracking-[0.14em] text-white/70">Audit chain</p>
                    <p className="mt-0.5 font-mono text-sm font-semibold text-paper">Ed25519 VALID</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* (2) Process strip */}
        <section aria-label="Workflow stages" className="border-y border-line bg-paper">
          <div className="mx-auto max-w-[1220px] px-5 py-10 sm:px-8">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">
                End-to-end covenant pipeline
              </p>
              <p className="font-mono text-xs text-muted">
                01 Upload → 02 Redact → 03 Extract → 04 Calculate → 05 Prove → 06 Approve → 07 Audit
              </p>
            </div>
            <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-7">
              {processStages.map((item) => (
                <li
                  key={item.step}
                  className="flex flex-col justify-between rounded-2xl border border-line bg-canvas/60 p-4"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex rounded-md bg-acid px-2 py-0.5 font-mono text-xs font-bold text-ink">
                        {item.step}
                      </span>
                      <ArrowRight className=" hidden size-3.5 text-muted lg:inline" aria-hidden />
                    </div>
                    <h2 className="mt-3 text-base font-semibold tracking-tight">{item.name}</h2>
                    <p className="mt-1.5 text-xs leading-5 text-muted">{item.detail}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* (3) Problem */}
        <section id="problem" className="mx-auto max-w-[1220px] px-5 py-16 sm:px-8 lg:py-24">
          <div className="max-w-3xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">The status quo</p>
            <h2 className="display mt-3 text-4xl font-semibold sm:text-5xl">
              Covenant review is still manual.
            </h2>
            <p className="mt-5 text-base leading-7 text-muted sm:text-lg">
              Every quarter, credit teams pull leverage covenants out of hundred-page agreements, copy figures into ad-hoc
              models, and route approvals over chat and email. Pasting a credit agreement into a generic chatbot is worse:
              it leaks borrower data, hallucinates arithmetic, and leaves nothing an auditor can verify.
            </p>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {subProblems.map((item) => (
              <article key={item.number} className="rounded-3xl border border-line bg-paper p-6 sm:p-7">
                <span className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-muted">
                  {item.number}
                </span>
                <h3 className="mt-4 text-xl font-semibold tracking-tight">{item.title}</h3>
                <p className="mt-3 text-sm leading-6 text-muted">{item.body}</p>
              </article>
            ))}
          </div>

          <div className="mt-8 rounded-2xl border border-ink/15 bg-ink px-6 py-4 text-paper">
            <p className="font-mono text-xs font-semibold uppercase tracking-[0.16em] text-acid">
              No deterministic engine. No proof. No tamper-evident record.
            </p>
          </div>
        </section>

        {/* (4) Solution */}
        <section id="solution" className="border-y border-line bg-paper/70">
          <div className="mx-auto max-w-[1220px] px-5 py-16 sm:px-8 lg:py-24">
            <div className="max-w-3xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">The Assay architecture</p>
              <h2 className="display mt-3 text-4xl font-semibold sm:text-5xl">
                One workflow. Every step verifiable.
              </h2>
              <p className="mt-5 text-base leading-7 text-muted sm:text-lg">
                Assay composes local PII redaction, TEE-attested extraction, deterministic integer arithmetic,
                zero-knowledge compliance proofs, and an Ed25519-signed audit chain into a single state machine. Each
                stage produces a cryptographic or deterministic artifact before the next stage can unlock.
              </p>
            </div>

            <div className="mt-10 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="grid gap-4">
                {solutionCapabilities.map((card) => {
                  const Icon = card.icon;
                  return (
                    <article key={card.title} className="rounded-3xl border border-line bg-paper p-6">
                      <div className="flex items-start gap-4">
                        <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-acid text-ink">
                          <Icon className="size-5" />
                        </span>
                        <div>
                          <h3 className="text-lg font-semibold tracking-tight">{card.title}</h3>
                          <p className="mt-2 text-sm leading-6 text-muted">{card.body}</p>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>

              {/* Concrete data-preview card from real run BOR-018 */}
              <aside
                aria-label="Concrete calculation and proof result example"
                className="flex flex-col justify-between rounded-3xl bg-ink p-6 text-paper sm:p-8"
              >
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-4">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/70">
                        Verified run artifact · BOR-018
                      </p>
                      <p className="mt-1 text-sm font-semibold">Revolving Credit Facility 018 · Run #1</p>
                    </div>
                    <StatusBadge tone="positive">COMPLIANT</StatusBadge>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl bg-acid p-4 text-ink">
                      <p className="text-[10px] font-bold uppercase tracking-[0.14em]">Baseline ratio</p>
                      <p className="mt-1.5 font-mono text-2xl font-bold">3.07x</p>
                      <p className="mt-1 font-mono text-[11px] font-semibold">Exact 3.0660x</p>
                    </div>
                    <div className="rounded-2xl border border-white/15 bg-white/5 p-4">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/70">Threshold</p>
                      <p className="mt-1.5 font-mono text-2xl font-semibold">≤ 3.50x</p>
                      <p className="mt-1 font-mono text-[11px] text-white/70">35,000 bps</p>
                    </div>
                    <div className="col-span-2 rounded-2xl border border-white/15 bg-white/5 p-4 sm:col-span-1">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/70">Headroom</p>
                      <p className="mt-1.5 font-mono text-2xl font-semibold">12.40%</p>
                      <p className="mt-1 font-mono text-[11px] text-white/70">Risk band LOW</p>
                    </div>
                  </div>

                  <dl className="mt-5 space-y-2.5 border-t border-white/10 pt-4 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <dt className="text-white/70">Reported EBITDA + capped add-backs</dt>
                      <dd className="font-mono font-semibold text-paper">$10,000,000 + $600,000 = $10,600,000</dd>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <dt className="text-white/70">Total Debt (minor units sealed)</dt>
                      <dd className="font-mono font-semibold text-paper">$32,500,000</dd>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <dt className="text-white/70">Sensitivity (-10% EBITDA / +10% Debt)</dt>
                      <dd className="font-mono font-semibold text-paper">3.41x COMPLIANT / 3.37x COMPLIANT</dd>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <dt className="text-white/70">Groth16 proof status &amp; signals</dt>
                      <dd className="font-mono font-semibold text-acid">VERIFIED · [&quot;1&quot;, &quot;35000&quot;]</dd>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <dt className="text-white/70">NEAR AI attestation</dt>
                      <dd className="font-mono font-semibold text-paper">TDX UpToDate · NRAS true</dd>
                    </div>
                  </dl>
                </div>

                <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-4 text-xs">
                  <span className="text-white/70">Manager decision: APPROVED (v11)</span>
                  <Link
                    href="/login"
                    prefetch={false}
                    className="inline-flex items-center gap-1 font-semibold text-acid underline decoration-acid/40 underline-offset-4"
                  >
                    Inspect in app <ArrowUpRight className="size-3.5" />
                  </Link>
                </div>
              </aside>
            </div>
          </div>
        </section>

        {/* (5) How it works */}
        <section id="how-it-works" className="mx-auto max-w-[1220px] px-5 py-16 sm:px-8 lg:py-24">
          <div className="max-w-3xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">Step-by-step execution</p>
            <h2 className="display mt-3 text-4xl font-semibold sm:text-5xl">
              Six moves. No hand-waving.
            </h2>
            <p className="mt-5 text-base leading-7 text-muted sm:text-lg">
              Every state transition is enforced server-side in Fastify and Neon Postgres. No step can be skipped, and
              every artifact is bound to the exact snapshot version.
            </p>
          </div>

          <div className="mt-10 grid gap-6 lg:grid-cols-2">
            {howItWorksSteps.map((step) => {
              const Icon = step.icon;
              return (
                <article
                  key={step.number}
                  className="flex flex-col justify-between rounded-3xl border border-line bg-paper p-6 sm:p-7"
                >
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-[0.16em] text-ink">
                        <span className="rounded-md bg-acid px-2 py-0.5">{step.number}</span>
                        <span>Step {step.number}</span>
                      </span>
                      <span className="rounded-full border border-line bg-canvas px-3 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
                        {step.tag}
                      </span>
                    </div>

                    <h3 className="mt-4 text-xl font-semibold tracking-tight">{step.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-muted">{step.body}</p>
                  </div>

                  {/* Structured state mockup card */}
                  <div className="mt-5 rounded-2xl border border-line bg-canvas/70 p-4">
                    <div className="flex items-center justify-between border-b border-line pb-2.5 text-xs font-semibold">
                      <span className="inline-flex items-center gap-2">
                        <Icon className="size-4 text-ink" />
                        <span>Runtime state artifact</span>
                      </span>
                      <CheckCircle2 className="size-4 text-positive" aria-hidden />
                    </div>
                    <dl className="mt-3 space-y-2 text-xs">
                      {step.lines.map(([label, value]) => (
                        <div key={label} className="grid gap-1 sm:grid-cols-[130px_1fr]">
                          <dt className="font-semibold text-muted">{label}</dt>
                          <dd className="font-mono text-[11px] text-ink">{value}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        {/* (6) Features */}
        <section className="border-y border-line bg-paper/70">
          <div className="mx-auto max-w-[1220px] px-5 py-16 sm:px-8 lg:py-24">
            <div className="max-w-3xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">System guarantees</p>
              <h2 className="display mt-3 text-4xl font-semibold sm:text-5xl">
                Built like infrastructure.
              </h2>
              <p className="mt-5 text-base leading-7 text-muted sm:text-lg">
                Designed around strict operational boundaries: typed Zod contracts, row-locked Postgres transactions,
                idempotent mutations, and role-shaped response DTOs.
              </p>
            </div>

            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {featureCards.map((card) => {
                const Icon = card.icon;
                return (
                  <article key={card.title} className="rounded-3xl border border-line bg-paper p-6">
                    <span className="grid size-10 place-items-center rounded-2xl border border-line bg-canvas text-ink">
                      <Icon className="size-5" />
                    </span>
                    <h3 className="mt-5 text-lg font-semibold tracking-tight">{card.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-muted">{card.body}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        {/* (7) Security & privacy */}
        <section id="security" className="mx-auto max-w-[1220px] px-5 py-16 sm:px-8 lg:py-24">
          <div className="rounded-[2rem] bg-ink p-6 text-paper sm:p-10 lg:p-12">
            <div className="max-w-3xl">
              <p className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-acid">
                Five defense-in-depth privacy layers
              </p>
              <h2 className="display mt-4 text-3xl font-semibold sm:text-5xl">
                The model interprets. Code calculates. Cryptography proves. A human approves.
              </h2>
              <p className="mt-5 text-sm leading-6 text-white/75 sm:text-base">
                Sensitive inference is routed to NEAR AI Cloud&apos;s TEE-attested gateway. Each request can be verified
                against Intel TDX and NVIDIA NRAS attestation evidence. OpenRouter receives only structured,
                already-extracted data for SERV judgement and generation — never raw documents or token maps.
              </p>
            </div>

            <ul className="mt-10 grid gap-4 lg:grid-cols-5">
              {privacyLayers.map((layer, index) => (
                <li
                  key={layer.title}
                  className="flex flex-col justify-between rounded-2xl border border-white/15 bg-white/5 p-5"
                >
                  <div>
                    <span className="inline-flex rounded-md bg-acid px-2 py-0.5 font-mono text-xs font-bold text-ink">
                      Layer 0{index + 1}
                    </span>
                    <h3 className="mt-4 text-base font-semibold leading-snug text-paper">{layer.title}</h3>
                    <p className="mt-2.5 text-xs leading-5 text-white/75">{layer.body}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* (8) Integrations / stack */}
        <section className="border-y border-line bg-paper/70">
          <div className="mx-auto max-w-[1220px] px-5 py-16 sm:px-8 lg:py-20">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">Verifiable stack</p>
                <h2 className="display mt-3 text-4xl font-semibold sm:text-5xl">Built on.</h2>
              </div>
              <p className="max-w-md text-xs leading-5 text-muted">
                Every external provider sits behind a strict adapter and health boundary. Provider failures surface
                visibly and are never masked with fabricated receipts.
              </p>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {stackItems.map((item) => (
                <article
                  key={item.name}
                  className="flex flex-col justify-between rounded-3xl border border-line bg-paper p-5"
                >
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="font-mono text-base font-bold tracking-tight text-ink">{item.name}</h3>
                    </div>
                    <div className="mt-2">
                      <StatusBadge tone={item.tone}>{item.badge}</StatusBadge>
                    </div>
                    <p className="mt-4 text-xs leading-5 text-muted">{item.role}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* (9) FAQ */}
        <section id="faq" className="mx-auto max-w-[1220px] px-5 py-16 sm:px-8 lg:py-24">
          <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr]">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted"> Buyer &amp; auditor FAQ</p>
              <h2 className="display mt-3 text-4xl font-semibold sm:text-5xl">Questions.</h2>
              <p className="mt-4 text-sm leading-6 text-muted">
                Direct answers on scope, cryptographic boundaries, provider failure handling, and how to test the
                deployed workspace.
              </p>
              <div className="mt-6 rounded-2xl border border-line bg-paper p-5 text-xs leading-5">
                <p className="font-semibold text-ink">Ready to inspect a live run?</p>
                <p className="mt-1 text-muted">
                  Use the invited synthetic analyst, credit manager, or auditor credentials on the sign-in page to walk
                  the full workflow.
                </p>
                <Link
                  href="/login"
                  prefetch={false}
                  className="mt-3 inline-flex items-center gap-1 font-semibold text-ink underline decoration-line underline-offset-4"
                >
                  Go to /login <ArrowUpRight className="size-3.5" />
                </Link>
              </div>
            </div>

            <div className="space-y-3">
              {faqs.map((item, idx) => (
                <details
                  key={item.question}
                  open={idx === 0}
                  className="group rounded-2xl border border-line bg-paper p-5 transition hover:border-ink/30"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-semibold text-ink">
                    <span>{item.question}</span>
                    <ChevronDown className="size-4 shrink-0 text-muted transition group-open:rotate-180" aria-hidden />
                  </summary>
                  <p className="mt-3 border-t border-line pt-3 text-sm leading-6 text-muted">{item.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* (10) Final CTA */}
        <section className="mx-auto max-w-[1220px] px-5 pb-16 sm:px-8 lg:pb-24">
          <div className="rounded-[2rem] border border-line bg-paper p-8 sm:p-12 lg:flex lg:items-center lg:justify-between lg:gap-10">
            <div className="max-w-2xl">
              <div className="flex items-center gap-3">
                <Image
                  src="/brand/assay-logo.png"
                  alt="Assay"
                  width={44}
                  height={44}
                  className="size-11 rounded-2xl"
                />
                <span className="text-xs font-bold uppercase tracking-[0.24em] text-muted">Assay</span>
              </div>
              <h2 className="display mt-5 text-4xl font-semibold sm:text-5xl">
                The review is one workflow away.
              </h2>
              <p className="mt-4 text-base leading-7 text-muted sm:text-lg">
                Read the agreement. Confirm the terms. Verify the proof. Your authority stays yours.
              </p>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-3 lg:mt-0 lg:shrink-0">
              <Link
                href="/login"
                prefetch={false}
                className="inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3.5 text-sm font-semibold text-paper transition hover:bg-ink-soft"
              >
                Open app <ArrowUpRight className="size-4" />
              </Link>
              <a
                href={DEMO_VIDEO_URL}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-line bg-canvas px-5 py-3.5 text-sm font-semibold text-ink transition hover:border-ink/40 hover:bg-white"
              >
                <Play className="size-4 fill-current" /> Watch demo
              </a>
            </div>
          </div>
        </section>
      </main>

      {/* (11) Footer */}
      <footer className="border-t border-line bg-paper">
        <div className="mx-auto flex max-w-[1220px] flex-col gap-4 px-5 py-8 text-xs text-muted sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <div className="flex items-center gap-2.5">
            <Image
              src="/brand/assay-logo.png"
              alt="Assay"
              width={24}
              height={24}
              className="size-6 rounded-md"
            />
            <span>
              © {new Date().getFullYear()} Assay · Synthetic-data covenant operations · Not a production credit decision
              system.
            </span>
          </div>
          <nav aria-label="Footer links" className="flex flex-wrap items-center gap-5 font-semibold text-ink">
            <a
              className="underline decoration-line underline-offset-4 hover:text-ink"
              href={DOCS_URL}
            >
              Docs
            </a>
            <a
              className="underline decoration-line underline-offset-4 hover:text-ink"
              href={DEMO_VIDEO_URL}
            >
              Demo video
            </a>
            <a
              className="underline decoration-line underline-offset-4 hover:text-ink"
              href={REPO_URL}
            >
              GitHub
            </a>
            <Link
              className="underline decoration-line underline-offset-4 hover:text-ink"
              href="/login"
              prefetch={false}
            >
              Sign in
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
