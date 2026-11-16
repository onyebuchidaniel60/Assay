import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2, FileSearch, LockKeyhole, ShieldAlert, ShieldCheck } from "lucide-react";
import { PageHeader, SectionLabel } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { FeedbackBanner } from "@/components/feedback-banner";
import { AutoRefresh } from "@/components/auto-refresh";
import { apiFetch, errorCode, errorMessage, getMe, type ApiEnvelope } from "@/lib/api-server";
import {
  calculateAction,
  cancelRunAction,
  confirmRedactionAction,
  generateProofAction,
  rejectRedactionAction,
  reviewTermsAction,
  saveFinancialsAction,
  startExtractionAction,
  approvalAction,
  submitFeedbackAction,
} from "@/lib/actions";
import { formatDateTime, formatUsdMinor, minorToDecimal } from "@/lib/money";

export const metadata = { title: "Analysis run" };
export const dynamic = "force-dynamic";

type ScenarioRow = {
  scenario: "BASELINE" | "EBITDA_DOWN_10" | "DEBT_UP_10";
  result: "COMPLIANT" | "BREACH";
  riskBand: string | null;
  detail?: {
    ratio?: string;
    displayRatio?: string;
    headroomPct?: string;
    debtMinor?: string;
    adjustedEbitdaMinor?: string;
  };
};

type AnalystReport = {
  run: {
    id: string;
    runNumber: number;
    status: string;
    resultCode: string | null;
    failureCode: string | null;
    termsVersion: number | null;
    financialInputsHash: string | null;
    servTraceId?: string | null;
    providerTrace?: {
      nearai?: {
        model?: string;
        requestId?: string;
        attestation?: {
          verified?: boolean;
          tdxStatus?: string;
          nvidiaVerdict?: boolean;
          reportSha256?: string;
          verifiedAt?: string;
          signingAddress?: string;
        };
      };
      serv?: { model?: string; traceId?: string; branch?: string; agreement?: string };
      calculation?: { verification?: string; serv?: { agreement?: string } };
    };
    version: number;
    createdAt: string;
    updatedAt: string;
    completedAt: string | null;
  };
  borrower: { id: string; displayAlias: string; referenceToken: string };
  facility: { id: string; label: string; currency: string };
  document: { id: string; status: string; pageCount: number | null };
  terms: {
    thresholdBps: number;
    currency: string | null;
    totalDebtDefinition: string;
    ebitdaDefinition: string;
    permittedAddbacks: Array<{ code: string; description: string; capMinor: string | null; conditions: string[] }>;
    testingDate: string | null;
    cureRightsSummary: string | null;
    evidence: Array<{ page: number; quote: string; field: string }>;
    confidence: number | null;
    uncertaintyNotes: string[];
    reviewStatus: string;
  } | null;
  financialInputs: {
    currency: string;
    reportedEbitdaMinor: string;
    totalDebtMinor: string;
    adjustedEbitdaMinor: string;
    addbacks: Array<{ code: string; requestedMinor: string; appliedMinor: string; cappedMinor: string }>;
    capApplied: boolean;
    attestedAt: string;
    testDate: string;
  } | null;
  scenarios: ScenarioRow[];
  proof: {
    id: string;
    circuitVersion: string;
    verificationKeyHash: string;
    publicSignals: string[];
    witnessCommitment: string;
    status: string;
    verified: boolean;
    verifiedAt: string | null;
  } | null;
  approval: { decision: string; riskAcknowledged: boolean; rationale: string | null; analysisVersion: number; decidedAt: string } | null;
};

type ManagerReport = {
  id: string;
  status: string;
  resultCode: string | null;
  analysisVersion: number;
  borrowerReference: string;
  facilityReference: string;
  facilityLabel: string;
  thresholdBps: number | null;
  termsVersion: number | null;
  proof: { id: string; status: string; verified: boolean; verifiedAt: string | null; publicSignals: string[] } | null;
  scenarioBands: Array<{ scenario: string; result: string; riskBand: string | null }>;
  analystAttestedAt: string | null;
  createdAt: string;
  updatedAt: string;
  approval: { decision: string; riskAcknowledged: boolean; decidedAt: string; analysisVersion: number } | null;
};

type AuditorReport = {
  id: string;
  status: string;
  resultCode: string | null;
  analysisVersion: number;
  termsVersion: number | null;
  financialInputsHash: string | null;
  proof: {
    circuitVersion: string;
    verificationKeyHash: string;
    publicSignals: string[];
    witnessCommitment: string;
    status: string;
    verified: boolean;
    verifiedAt: string | null;
  } | null;
  approval: { decision: string; managerId: string; proofArtifactId: string; analysisVersion: number; decidedAt: string } | null;
  evidenceMetadata?: Array<{ page: number; field: string }>;
  createdAt: string;
  completedAt: string | null;
};

type RedactionView = {
  revision: number;
  pages: Array<{ number: number; text: string }>;
  entityCount: number;
  reviewedAt: string | null;
  status: string;
};

const CANCELLABLE = [
  "DRAFT",
  "FILE_UPLOADED",
  "PARSING",
  "REDACTION_REVIEW",
  "REDACTION_CONFIRMED",
  "EXTRACTION_PENDING",
  "TERMS_REVIEW",
  "TERMS_CONFIRMED",
  "FINANCIALS_PENDING",
  "FINANCIALS_CONFIRMED",
  "CALCULATION_PENDING",
  "CALCULATED",
  "CALCULATED_SERV_PENDING",
  "PROOF_PENDING",
  "PROOF_VERIFIED",
  "READY_FOR_MANAGER",
];

export default async function AnalysisRunPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string; error?: string; message?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  try {
    const [me, reportEnvelope] = await Promise.all([
      getMe(),
      apiFetch<ApiEnvelope<AnalystReport | ManagerReport | AuditorReport>>(`/v1/analysis-runs/${id}/report`),
    ]);
    const role = me.user.role;
    const report = reportEnvelope.data;
    const analyst = role === "ANALYST" || role === "ADMIN";
    const analystReport = analyst ? (report as AnalystReport) : null;
    const managerReport = role === "MANAGER" ? (report as ManagerReport) : null;
    const auditorReport = role === "AUDITOR" ? (report as AuditorReport) : null;
    const status = analystReport?.run.status ?? managerReport?.status ?? auditorReport?.status ?? "UNKNOWN";
    const detailEnvelope =
      analyst && status === "REDACTION_REVIEW"
        ? await apiFetch<ApiEnvelope<{ redaction: Array<{ revision: number }> }>>(`/v1/analysis-runs/${id}`)
        : null;
    const latestRevision = detailEnvelope?.data.redaction[0]?.revision;
    const redaction =
      analyst && status === "REDACTION_REVIEW" && latestRevision
        ? (await apiFetch<ApiEnvelope<RedactionView>>(`/v1/analysis-runs/${id}/redaction?revision=${latestRevision}`)).data
        : null;
    const inProgress = ["PARSING", "EXTRACTION_PENDING"].includes(status);

    return (
      <div className="space-y-8">
        <Link href="/analysis-runs" className="inline-flex items-center gap-2 text-xs font-semibold text-muted hover:text-ink">
          <ArrowLeft className="size-3.5" /> All analysis runs
        </Link>
        <PageHeader
          eyebrow={analystReport ? `${analystReport.borrower.referenceToken} · ${analystReport.facility.label}` : "Role-restricted analysis view"}
          title={analystReport ? `Run #${analystReport.run.runNumber}` : `Analysis ${id.slice(0, 8)}`}
          description="An immutable covenant snapshot. Corrections create a new run; they never mutate an approved or signed result."
          actions={
            <>
              <StatusBadge>{status}</StatusBadge>
              {analystReport?.run.resultCode ? <StatusBadge>{analystReport.run.resultCode}</StatusBadge> : null}
              <Link href="/approvals" className="inline-flex items-center gap-2 rounded-full border border-line bg-paper px-4 py-2.5 text-xs font-semibold text-ink hover:border-ink/30">
                Approvals
              </Link>
            </>
          }
        />
        <FeedbackBanner {...query} />
        {inProgress ? <AutoRefresh label={`${status.replaceAll("_", " ").toLowerCase()} — refreshing automatically`} /> : null}

        {status === "FAILED" && analystReport?.run.failureCode ? (
          <div role="alert" className="rounded-2xl border border-danger/25 bg-danger/10 px-4 py-4 text-sm text-danger">
            <p className="flex items-center gap-2 font-semibold"><ShieldAlert className="size-4" /> Run stopped: {analystReport.run.failureCode.replaceAll("_", " ")}</p>
            <p className="mt-1 text-danger/80">No approval is possible from this snapshot. Correct the cause and create a new analysis run.</p>
          </div>
        ) : null}

        {/* Analyst workflow */}
        {analyst && analystReport ? (
          <>
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {[
                ["Borrower", analystReport.borrower.displayAlias],
                ["Facility", analystReport.facility.label],
                ["Currency", analystReport.facility.currency],
                ["Created", formatDateTime(analystReport.run.createdAt)],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl border border-line bg-paper p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">{label}</p>
                  <p className="mt-2 text-sm font-semibold">{value}</p>
                </div>
              ))}
            </section>

            {status === "REDACTION_REVIEW" && redaction ? (
              <section className="rounded-3xl border border-line bg-paper p-5 sm:p-7">
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <SectionLabel>Step 1 · Reduced PII mode</SectionLabel>
                    <h2 className="mt-2 text-2xl font-semibold tracking-tight">Redaction review</h2>
                  </div>
                  <StatusBadge>REVISION {redaction.revision} · {redaction.entityCount} ENTITIES</StatusBadge>
                </div>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">
                  Presidio identifies borrower references, accounts and contact identifiers. Confirm the redacted text
                  before any provider call; the original agreement is never sent.
                </p>
                <div className="mt-5 space-y-4">
                  {redaction.pages.map((page) => (
                    <details key={page.number} open={page.number === 1} className="rounded-2xl border border-line bg-white/40 p-4">
                      <summary className="cursor-pointer text-sm font-semibold">Page {page.number}</summary>
                      <pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap break-words font-sans text-xs leading-6 text-ink">{page.text}</pre>
                    </details>
                  ))}
                </div>
                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <form action={confirmRedactionAction}>
                    <input type="hidden" name="runId" value={analystReport.run.id} />
                    <input type="hidden" name="revision" value={redaction.revision} />
                    <button type="submit" className="inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2.5 text-xs font-semibold text-paper">
                      <CheckCircle2 className="size-3.5" /> Confirm redaction
                    </button>
                  </form>
                  <form action={rejectRedactionAction} className="flex flex-wrap items-center gap-2">
                    <input type="hidden" name="runId" value={analystReport.run.id} />
                    <input type="hidden" name="revision" value={redaction.revision} />
                    <input name="rationale" placeholder="Reason for stopping" className="rounded-full border border-line bg-white/60 px-4 py-2.5 text-xs outline-none focus:border-ink" />
                    <button type="submit" className="rounded-full border border-danger/30 px-4 py-2.5 text-xs font-semibold text-danger">Stop run</button>
                  </form>
                </div>
              </section>
            ) : null}

            {status === "REDACTION_CONFIRMED" ? (
              <section className="rounded-3xl border border-line bg-paper p-5 sm:p-7">
                <SectionLabel>Step 2 · Layer 2 confidential extraction</SectionLabel>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight">Start attested extraction</h2>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">
                  Runs in the background. NEAR AI must return a fresh Intel TDX + NVIDIA NRAS attestation bound to the
                  request nonce and a valid ECDSA response signature; otherwise no terms are saved.
                </p>
                <form action={startExtractionAction} className="mt-5">
                  <input type="hidden" name="runId" value={analystReport.run.id} />
                  <button type="submit" className="inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2.5 text-xs font-semibold text-paper">
                    <LockKeyhole className="size-3.5" /> Start confidential extraction
                  </button>
                </form>
              </section>
            ) : null}

            {status === "EXTRACTION_PENDING" ? (
              <section className="rounded-3xl border border-line bg-paper p-5 sm:p-7">
                <SectionLabel>Step 2 · Provider gate</SectionLabel>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight">Confidential extraction in progress</h2>
                <p className="mt-3 text-sm leading-6 text-muted">
                  The worker is verifying model eligibility, TDX/NRAS evidence and the response signature before parsing
                  the covenant. This page refreshes automatically.
                </p>
              </section>
            ) : null}

            {status === "TERMS_REVIEW" && analystReport.terms ? (
              <section className="rounded-3xl border border-line bg-paper p-5 sm:p-7">
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <SectionLabel>Step 3 · Covenant terms</SectionLabel>
                    <h2 className="mt-2 text-2xl font-semibold tracking-tight">Analyst confirmation</h2>
                  </div>
                  <StatusBadge>{analystReport.terms.reviewStatus}</StatusBadge>
                </div>
                <dl className="mt-5 grid gap-4 md:grid-cols-3">
                  <div className="rounded-2xl border border-line bg-white/40 p-4">
                    <dt className="text-[10px] uppercase tracking-[0.14em] text-muted">Threshold</dt>
                    <dd className="mt-2 font-mono text-2xl font-semibold">≤ {(analystReport.terms.thresholdBps / 10000).toFixed(2)}x</dd>
                  </div>
                  <div className="rounded-2xl border border-line bg-white/40 p-4">
                    <dt className="text-[10px] uppercase tracking-[0.14em] text-muted">Testing date</dt>
                    <dd className="mt-2 text-sm font-semibold">{analystReport.terms.testingDate ?? "Not stated"}</dd>
                  </div>
                  <div className="rounded-2xl border border-line bg-white/40 p-4">
                    <dt className="text-[10px] uppercase tracking-[0.14em] text-muted">Confidence</dt>
                    <dd className="mt-2 text-sm font-semibold">{analystReport.terms.confidence ?? "—"}</dd>
                  </div>
                </dl>
                <div className="mt-5 grid gap-4 lg:grid-cols-2">
                  <div className="rounded-2xl border border-line bg-white/40 p-4">
                    <p className="text-xs font-semibold">Total debt definition</p>
                    <p className="mt-2 text-xs leading-6 text-muted">{analystReport.terms.totalDebtDefinition}</p>
                  </div>
                  <div className="rounded-2xl border border-line bg-white/40 p-4">
                    <p className="text-xs font-semibold">EBITDA definition</p>
                    <p className="mt-2 text-xs leading-6 text-muted">{analystReport.terms.ebitdaDefinition}</p>
                  </div>
                </div>
                <div className="mt-4 rounded-2xl border border-line bg-white/40 p-4">
                  <p className="text-xs font-semibold">Permitted add-backs</p>
                  <ul className="mt-2 space-y-2 text-xs text-muted">
                    {analystReport.terms.permittedAddbacks.map((addback) => (
                      <li key={addback.code}>
                        <span className="font-mono font-semibold text-ink">{addback.code}</span> · {addback.description}
                        {addback.capMinor ? ` · cap ${formatUsdMinor(addback.capMinor)}` : " · no stated cap"}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="mt-4 rounded-2xl border border-line bg-white/40 p-4">
                  <p className="text-xs font-semibold">Source evidence</p>
                  <ul className="mt-2 space-y-3 text-xs">
                    {analystReport.terms.evidence.map((evidence) => (
                      <li key={`${evidence.page}-${evidence.field}`} className="border-l-2 border-acid pl-3">
                        <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted">Page {evidence.page} · {evidence.field}</p>
                        <p className="mt-1 leading-5 text-ink">&ldquo;{evidence.quote}&rdquo;</p>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="mt-5 flex flex-wrap items-end gap-3">
                  <form action={reviewTermsAction} className="flex flex-wrap items-end gap-2">
                    <input type="hidden" name="runId" value={analystReport.run.id} />
                    <input type="hidden" name="decision" value="CONFIRM" />
                    <input type="hidden" name="revision" value={analystReport.run.version} />
                    <label className="text-xs">
                      <span className="mb-1.5 block font-semibold uppercase tracking-[0.12em] text-muted">Threshold (bps)</span>
                      <input name="thresholdBps" type="number" min={1} max={100000} defaultValue={analystReport.terms.thresholdBps} className="w-32 rounded-xl border border-line bg-white/60 px-3 py-2.5 font-mono outline-none focus:border-ink" />
                    </label>
                    <button type="submit" className="inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2.5 text-xs font-semibold text-paper">
                      <CheckCircle2 className="size-3.5" /> Confirm terms
                    </button>
                  </form>
                  <form action={reviewTermsAction} className="flex flex-wrap items-center gap-2">
                    <input type="hidden" name="runId" value={analystReport.run.id} />
                    <input type="hidden" name="decision" value="REJECT" />
                    <input type="hidden" name="revision" value={analystReport.run.version} />
                    <input name="rationale" placeholder="Rejection reason" className="rounded-full border border-line bg-white/60 px-4 py-2.5 text-xs outline-none focus:border-ink" />
                    <button type="submit" className="rounded-full border border-danger/30 px-4 py-2.5 text-xs font-semibold text-danger">Reject terms</button>
                  </form>
                </div>
              </section>
            ) : null}

            {status === "FINANCIALS_PENDING" && analystReport.terms ? (
              <section className="rounded-3xl border border-line bg-paper p-5 sm:p-7">
                <SectionLabel>Step 4 · Analyst-attested figures</SectionLabel>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight">Financial inputs</h2>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">
                  Enter synthetic US-dollar figures. The server converts them to integer minor units, applies permitted
                  add-back caps deterministically and seals the snapshot before calculation.
                </p>
                <form action={saveFinancialsAction} className="mt-5 space-y-5">
                  <input type="hidden" name="runId" value={analystReport.run.id} />
                  <input type="hidden" name="currency" value={analystReport.terms.currency ?? analystReport.facility.currency} />
                  <input type="hidden" name="termsVersion" value={analystReport.run.termsVersion ?? 1} />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block text-xs">
                      <span className="mb-1.5 block font-semibold uppercase tracking-[0.12em] text-muted">Reported EBITDA (USD)</span>
                      <input name="reportedEbitda" required inputMode="decimal" placeholder="10000000.00" className="w-full rounded-xl border border-line bg-white/60 px-3 py-2.5 font-mono outline-none focus:border-ink" />
                    </label>
                    <label className="block text-xs">
                      <span className="mb-1.5 block font-semibold uppercase tracking-[0.12em] text-muted">Total debt (USD)</span>
                      <input name="totalDebt" required inputMode="decimal" placeholder="32500000.00" className="w-full rounded-xl border border-line bg-white/60 px-3 py-2.5 font-mono outline-none focus:border-ink" />
                    </label>
                  </div>
                  <div className="space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Permitted add-backs</p>
                    {analystReport.terms.permittedAddbacks.map((addback) => (
                      <div key={addback.code} className="grid gap-2 rounded-2xl border border-line bg-white/40 p-3 sm:grid-cols-[1fr_180px] sm:items-center">
                        <div>
                          <p className="font-mono text-xs font-semibold">{addback.code}</p>
                          <p className="text-xs text-muted">{addback.description}{addback.capMinor ? ` · cap ${formatUsdMinor(addback.capMinor)}` : ""}</p>
                        </div>
                        <input type="hidden" name="addbackCode" value={addback.code} />
                        <input name="addbackAmount" inputMode="decimal" placeholder="0.00" aria-label={`${addback.code} amount in USD`} className="rounded-xl border border-line bg-white/60 px-3 py-2.5 font-mono text-xs outline-none focus:border-ink" />
                      </div>
                    ))}
                  </div>
                  <label className="flex items-start gap-3 rounded-2xl border border-line bg-white/40 p-4 text-xs leading-5">
                    <input type="checkbox" name="attest" className="mt-0.5 size-4" />
                    <span>I confirm these synthetic figures are the analyst-attested snapshot for this run. I understand that changes create a new run and invalidate prior approvals.</span>
                  </label>
                  <button type="submit" className="inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2.5 text-xs font-semibold text-paper">
                    <CheckCircle2 className="size-3.5" /> Save and attest inputs
                  </button>
                </form>
              </section>
            ) : null}

            {(status === "FINANCIALS_CONFIRMED" || status === "CALCULATED_SERV_PENDING") ? (
              <section className="rounded-3xl border border-line bg-paper p-5 sm:p-7">
                <SectionLabel>Step 5 · Deterministic engine</SectionLabel>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight">Calculate and run scenarios</h2>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">
                  Decimal.js performs the arithmetic; an independent BigInt verifier recomputes the ratio and predicate.
                  SERV receives structured, non-identifying facts and must confirm coherence before the run can proceed.
                </p>
                <form action={calculateAction} className="mt-5">
                  <input type="hidden" name="runId" value={analystReport.run.id} />
                  <button type="submit" className="inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2.5 text-xs font-semibold text-paper">
                    <FileSearch className="size-3.5" /> Calculate baseline and stress cases
                  </button>
                </form>
              </section>
            ) : null}

            {analystReport.run.providerTrace?.nearai?.attestation ? (
              <section className="rounded-3xl border border-line bg-paper p-5 sm:p-7">
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <SectionLabel>Layer 2 evidence</SectionLabel>
                    <h2 className="mt-2 text-2xl font-semibold tracking-tight">Confidential inference attestation</h2>
                  </div>
                  <StatusBadge tone={analystReport.run.providerTrace.nearai.attestation.verified ? "proof" : "danger"}>
                    {analystReport.run.providerTrace.nearai.attestation.verified ? "ATTESTATION VERIFIED" : "NOT VERIFIED"}
                  </StatusBadge>
                </div>
                <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {[
                    ["Model", analystReport.run.providerTrace.nearai.model ?? "—"],
                    ["Intel TDX", analystReport.run.providerTrace.nearai.attestation.tdxStatus ?? "—"],
                    ["NVIDIA NRAS", analystReport.run.providerTrace.nearai.attestation.nvidiaVerdict ? "true" : "false"],
                    ["SERV branch", analystReport.run.providerTrace.serv?.branch ?? analystReport.run.providerTrace.calculation?.serv?.agreement ?? "—"],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-2xl border border-line bg-white/40 p-4">
                      <p className="text-[10px] uppercase tracking-[0.14em] text-muted">{label}</p>
                      <p className="mt-2 break-all font-mono text-xs font-semibold">{value}</p>
                    </div>
                  ))}
                </div>
                <p className="mt-4 break-all font-mono text-[10px] text-muted">
                  Report SHA-256 {analystReport.run.providerTrace.nearai.attestation.reportSha256 ?? "—"}
                </p>
                <p className="mt-1 text-xs text-muted">
                  Fresh nonce-bound TDX/NRAS evidence and an ECDSA response signature are required for every extraction; a
                  failure blocks terms and leaves a visible failed state.
                </p>
              </section>
            ) : null}

            {analystReport.financialInputs ? (
              <section className="rounded-3xl border border-line bg-paper p-5 sm:p-7">
                <SectionLabel>Confirmed snapshot</SectionLabel>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight">Financial inputs</h2>
                <dl className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {[
                    ["Reported EBITDA", formatUsdMinor(analystReport.financialInputs.reportedEbitdaMinor)],
                    ["Adjusted EBITDA", formatUsdMinor(analystReport.financialInputs.adjustedEbitdaMinor)],
                    ["Total debt", formatUsdMinor(analystReport.financialInputs.totalDebtMinor)],
                    ["Attested", formatDateTime(analystReport.financialInputs.attestedAt)],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-2xl border border-line bg-white/40 p-4">
                      <dt className="text-[10px] uppercase tracking-[0.14em] text-muted">{label}</dt>
                      <dd className="mt-2 font-mono text-sm font-semibold">{value}</dd>
                    </div>
                  ))}
                </dl>
                <p className="mt-4 font-mono text-[10px] text-muted">Snapshot hash {analystReport.run.financialInputsHash?.slice(0, 24)}…</p>
                {analystReport.financialInputs.capApplied ? <p className="mt-2 text-xs text-warning">A permitted add-back cap was applied deterministically.</p> : null}
              </section>
            ) : null}

            {analystReport.scenarios.length > 0 ? (
              <section className="rounded-3xl border border-line bg-paper p-5 sm:p-7">
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <SectionLabel>Calculation</SectionLabel>
                    <h2 className="mt-2 text-2xl font-semibold tracking-tight">Baseline and stress scenarios</h2>
                  </div>
                  {analystReport.run.resultCode ? <StatusBadge>{analystReport.run.resultCode}</StatusBadge> : null}
                </div>
                <div className="mt-5 grid gap-4 lg:grid-cols-3">
                  {analystReport.scenarios.map((scenario) => (
                    <article key={scenario.scenario} className="rounded-2xl border border-line bg-white/40 p-4">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">{scenario.scenario.replaceAll("_", " ")}</p>
                        <StatusBadge>{scenario.result}</StatusBadge>
                      </div>
                      <p className="mt-4 font-mono text-3xl font-semibold">{scenario.detail?.displayRatio ?? "—"}</p>
                      <p className="mt-1 text-xs text-muted">Headroom {scenario.detail?.headroomPct ? `${Number(scenario.detail.headroomPct).toFixed(2)}%` : "—"} · risk {scenario.riskBand ?? "—"}</p>
                    </article>
                  ))}
                </div>
                <p className="mt-4 text-xs text-muted">Stress results are sensitivity tests. They do not change the actual baseline classification.</p>
              </section>
            ) : null}

            {status === "PROOF_PENDING" ? (
              <section className="rounded-3xl border border-line bg-paper p-5 sm:p-7">
                <SectionLabel>Step 6 · Fixed circuit</SectionLabel>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight">Generate compliance proof</h2>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">
                  Groth16 over the fixed leverage circuit. The witness stays in server memory; only the proof, public
                  signals and a witness commitment are persisted.
                </p>
                <form action={generateProofAction} className="mt-5">
                  <input type="hidden" name="runId" value={analystReport.run.id} />
                  <button type="submit" className="inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2.5 text-xs font-semibold text-paper">
                    <ShieldCheck className="size-3.5" /> Generate and verify proof
                  </button>
                </form>
              </section>
            ) : null}

            {analystReport.proof ? (
              <section className="rounded-3xl border border-line bg-paper p-5 sm:p-7">
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <SectionLabel>Proof artifact</SectionLabel>
                    <h2 className="mt-2 text-2xl font-semibold tracking-tight">Compliance proof</h2>
                  </div>
                  <StatusBadge>{analystReport.proof.status}</StatusBadge>
                </div>
                <dl className="mt-5 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl border border-line bg-white/40 p-4">
                    <dt className="text-[10px] uppercase tracking-[0.14em] text-muted">Public signals</dt>
                    <dd className="mt-2 font-mono text-sm">{analystReport.proof.publicSignals.join(" · ")}</dd>
                  </div>
                  <div className="rounded-2xl border border-line bg-white/40 p-4">
                    <dt className="text-[10px] uppercase tracking-[0.14em] text-muted">Circuit</dt>
                    <dd className="mt-2 font-mono text-sm">{analystReport.proof.circuitVersion}</dd>
                  </div>
                </dl>
                <p className="mt-4 break-all font-mono text-[10px] text-muted">Verification key {analystReport.proof.verificationKeyHash}</p>
                <p className="mt-1 break-all font-mono text-[10px] text-muted">Witness commitment {analystReport.proof.witnessCommitment}</p>
              </section>
            ) : null}

            {status === "BREACH_REVIEW" ? (
              <section className="rounded-3xl border border-danger/25 bg-danger/10 p-5 sm:p-7">
                <SectionLabel><span className="text-danger">Breach review</span></SectionLabel>
                <h2 className="mt-2 text-2xl font-semibold text-danger">Actual baseline breach</h2>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-danger/80">
                  No compliance proof is generated for a breach and there is no manager override. Create a corrected run if
                  the underlying evidence changes.
                </p>
              </section>
            ) : null}

            {analystReport.approval ? (
              <section className="rounded-3xl border border-positive/25 bg-positive/10 p-5 sm:p-7">
                <SectionLabel><span className="text-positive">Manager decision</span></SectionLabel>
                <h2 className="mt-2 text-2xl font-semibold text-positive">{analystReport.approval.decision}</h2>
                <p className="mt-2 text-sm text-positive/80">
                  Version {analystReport.approval.analysisVersion} · {formatDateTime(analystReport.approval.decidedAt)}
                </p>
                {analystReport.approval.rationale ? <p className="mt-3 text-sm leading-6 text-positive/80">{analystReport.approval.rationale}</p> : null}
              </section>
            ) : null}

            <section className="rounded-3xl border border-line bg-paper p-5 sm:p-7">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <SectionLabel>Synthetic feedback</SectionLabel>
                  <h2 className="mt-2 text-2xl font-semibold tracking-tight">Correction and Reppo evaluation</h2>
                </div>
                <Link href="/evaluations" className="text-xs font-semibold underline decoration-line underline-offset-4 hover:text-ink">Evaluation register</Link>
              </div>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">
                Record a correction to an extraction or financial field. If selected, Assay sends only a de-identified
                field-level trace to Reppo after a 50 KB preflight check; amounts, free text, borrower identity, the token
                map and agreement content are removed. Reppo never approves the covenant.
              </p>
              <form action={submitFeedbackAction} className="mt-5 space-y-4">
                <input type="hidden" name="runId" value={analystReport.run.id} />
                <div className="grid gap-4 sm:grid-cols-3">
                  <label className="block text-xs">
                    <span className="mb-1.5 block font-semibold uppercase tracking-[0.12em] text-muted">Correction type</span>
                    <select name="correctionType" className="w-full rounded-xl border border-line bg-white/60 px-3 py-2.5 outline-none focus:border-ink">
                      <option value="TERMS">Terms / extraction</option>
                      <option value="FINANCIAL_INPUT">Financial input</option>
                      <option value="REDACTION">Redaction</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </label>
                  <label className="block text-xs">
                    <span className="mb-1.5 block font-semibold uppercase tracking-[0.12em] text-muted">Changed field</span>
                    <input name="changedField" placeholder="thresholdBps" className="w-full rounded-xl border border-line bg-white/60 px-3 py-2.5 font-mono outline-none focus:border-ink" />
                  </label>
                  <label className="block text-xs">
                    <span className="mb-1.5 block font-semibold uppercase tracking-[0.12em] text-muted">Polling window</span>
                    <select name="maxWaitMinutes" className="w-full rounded-xl border border-line bg-white/60 px-3 py-2.5 outline-none focus:border-ink">
                      <option value="10">10 minutes</option>
                      <option value="15">15 minutes</option>
                      <option value="30">30 minutes</option>
                    </select>
                  </label>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block text-xs">
                    <span className="mb-1.5 block font-semibold uppercase tracking-[0.12em] text-muted">Before (synthetic)</span>
                    <input name="beforeValue" className="w-full rounded-xl border border-line bg-white/60 px-3 py-2.5 outline-none focus:border-ink" placeholder="Synthetic value before correction" />
                  </label>
                  <label className="block text-xs">
                    <span className="mb-1.5 block font-semibold uppercase tracking-[0.12em] text-muted">After (synthetic)</span>
                    <input name="afterValue" className="w-full rounded-xl border border-line bg-white/60 px-3 py-2.5 outline-none focus:border-ink" placeholder="Synthetic value after correction" />
                  </label>
                </div>
                <label className="block text-xs">
                  <span className="mb-1.5 block font-semibold uppercase tracking-[0.12em] text-muted">Internal note (optional)</span>
                  <input name="note" className="w-full rounded-xl border border-line bg-white/60 px-3 py-2.5 outline-none focus:border-ink" placeholder="Why the correction was made" />
                </label>
                <label className="flex items-center gap-3 text-xs">
                  <input type="checkbox" name="submitToReppo" className="size-4" />
                  Submit the de-identified trace to Reppo for an independent evaluation.
                </label>
                <button type="submit" className="inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2.5 text-xs font-semibold text-paper">
                  Record correction
                </button>
              </form>
            </section>

            {CANCELLABLE.includes(status) ? (
              <form action={cancelRunAction} className="flex items-center justify-end gap-3">
                <input type="hidden" name="runId" value={analystReport.run.id} />
                <button type="submit" className="rounded-full border border-line px-4 py-2.5 text-xs font-semibold text-muted hover:border-danger/30 hover:text-danger">
                  Cancel this run
                </button>
              </form>
            ) : null}
          </>
        ) : null}

        {/* Manager view */}
        {managerReport ? (
          <>
            <section className="grid gap-5 lg:grid-cols-[1fr_0.9fr]">
              <div className="rounded-3xl border border-line bg-paper p-5 sm:p-7">
                <SectionLabel>Restricted manager view</SectionLabel>
                <dl className="mt-5 grid gap-5 sm:grid-cols-2">
                  {[
                    ["Borrower reference", managerReport.borrowerReference],
                    ["Facility reference", managerReport.facilityReference],
                    ["Facility label", managerReport.facilityLabel],
                    ["Threshold", managerReport.thresholdBps ? `≤ ${(managerReport.thresholdBps / 10000).toFixed(2)}x` : "—"],
                    ["Baseline result", managerReport.resultCode ?? "Pending"],
                    ["Analysis version", String(managerReport.analysisVersion)],
                    ["Analyst attested", formatDateTime(managerReport.analystAttestedAt)],
                    ["Updated", formatDateTime(managerReport.updatedAt)],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">{label}</dt>
                      <dd className="mt-1.5 text-sm font-medium">{value}</dd>
                    </div>
                  ))}
                </dl>
                <p className="mt-5 text-xs leading-5 text-muted">
                  Raw debt, EBITDA, named counterparties, agreement text and the token map are intentionally absent from
                  this view.
                </p>
              </div>
              <div className="rounded-3xl bg-ink p-5 text-paper sm:p-7">
                <SectionLabel><span className="text-white/50">Proof</span></SectionLabel>
                <p className="mt-5 text-2xl font-semibold">{managerReport.proof?.status ?? "Not generated"}</p>
                <p className="mt-2 text-sm text-white/60">{managerReport.proof?.verified ? "Verified for this exact snapshot" : "Approval requires a verified proof"}</p>
                <div className="mt-6 space-y-2">
                  {managerReport.scenarioBands.map((band) => (
                    <div key={band.scenario} className="flex items-center justify-between rounded-2xl border border-white/10 px-4 py-3 text-xs">
                      <span className="text-white/60">{band.scenario.replaceAll("_", " ")}</span>
                      <span className="font-semibold">{band.result}{band.riskBand ? ` · ${band.riskBand}` : ""}</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {managerReport.status === "READY_FOR_MANAGER" && managerReport.proof ? (
              <section className="rounded-3xl border border-line bg-paper p-5 sm:p-7">
                <SectionLabel>Decision</SectionLabel>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight">Approve or reject</h2>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">
                  The server re-locks the run, checks the proof, snapshot hash and version, then writes one decision. A
                  stressed breach requires explicit risk acknowledgement and a rationale.
                </p>
                <form action={approvalAction} className="mt-5 space-y-4">
                  <input type="hidden" name="runId" value={managerReport.id} />
                  <input type="hidden" name="proofArtifactId" value={managerReport.proof.id} />
                  <input type="hidden" name="analysisVersion" value={managerReport.analysisVersion} />
                  <div className="grid gap-4 sm:grid-cols-[200px_1fr]">
                    <label className="block text-xs">
                      <span className="mb-1.5 block font-semibold uppercase tracking-[0.12em] text-muted">Decision</span>
                      <select name="decision" className="w-full rounded-xl border border-line bg-white/60 px-3 py-2.5 outline-none focus:border-ink">
                        <option value="APPROVE">Approve</option>
                        <option value="REJECT">Reject</option>
                      </select>
                    </label>
                    <label className="block text-xs">
                      <span className="mb-1.5 block font-semibold uppercase tracking-[0.12em] text-muted">Rationale</span>
                      <textarea name="rationale" rows={2} className="w-full rounded-xl border border-line bg-white/60 px-3 py-2.5 outline-none focus:border-ink" placeholder="Reviewed baseline and stress scenarios." />
                    </label>
                  </div>
                  <label className="flex items-center gap-3 text-xs">
                    <input type="checkbox" name="riskAcknowledged" className="size-4" />
                    I acknowledge any stressed-scenario breach shown above.
                  </label>
                  <button type="submit" className="inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2.5 text-xs font-semibold text-paper">
                    Record decision
                  </button>
                </form>
              </section>
            ) : null}

            {managerReport.approval ? (
              <section className="rounded-3xl border border-positive/25 bg-positive/10 p-5 sm:p-7">
                <SectionLabel><span className="text-positive">Decision recorded</span></SectionLabel>
                <h2 className="mt-2 text-2xl font-semibold text-positive">{managerReport.approval.decision}</h2>
                <p className="mt-2 text-sm text-positive/80">Version {managerReport.approval.analysisVersion} · {formatDateTime(managerReport.approval.decidedAt)}</p>
              </section>
            ) : null}
          </>
        ) : null}

        {/* Auditor view */}
        {auditorReport ? (
          <>
            <section className="grid gap-5 lg:grid-cols-2">
              <div className="rounded-3xl border border-line bg-paper p-5 sm:p-7">
                <SectionLabel>Evidence-only view</SectionLabel>
                <dl className="mt-5 grid gap-5 sm:grid-cols-2">
                  {[
                    ["Status", auditorReport.status],
                    ["Result", auditorReport.resultCode ?? "Pending"],
                    ["Analysis version", String(auditorReport.analysisVersion)],
                    ["Terms version", String(auditorReport.termsVersion ?? "—")],
                    ["Completed", formatDateTime(auditorReport.completedAt)],
                    ["Created", formatDateTime(auditorReport.createdAt)],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">{label}</dt>
                      <dd className="mt-1.5 text-sm font-medium">{value}</dd>
                    </div>
                  ))}
                </dl>
                {auditorReport.financialInputsHash ? (
                  <p className="mt-5 break-all font-mono text-[10px] text-muted">Financial snapshot {auditorReport.financialInputsHash}</p>
                ) : null}
              </div>
              <div className="rounded-3xl border border-line bg-paper p-5 sm:p-7">
                <SectionLabel>Proof and approval</SectionLabel>
                <p className="mt-4 text-sm font-semibold">{auditorReport.proof ? `${auditorReport.proof.status} · ${auditorReport.proof.circuitVersion}` : "No proof artifact"}</p>
                {auditorReport.proof ? (
                  <>
                    <p className="mt-2 font-mono text-xs">Signals {auditorReport.proof.publicSignals.join(" · ")}</p>
                    <p className="mt-3 break-all font-mono text-[10px] text-muted">VK {auditorReport.proof.verificationKeyHash}</p>
                    <p className="mt-1 break-all font-mono text-[10px] text-muted">Commitment {auditorReport.proof.witnessCommitment}</p>
                  </>
                ) : null}
                {auditorReport.approval ? (
                  <div className="mt-5 rounded-2xl border border-positive/25 bg-positive/10 p-4 text-xs text-positive">
                    <p className="font-semibold">{auditorReport.approval.decision} · version {auditorReport.approval.analysisVersion}</p>
                    <p className="mt-1">Manager {auditorReport.approval.managerId}</p>
                    <p className="mt-1 break-all">Proof {auditorReport.approval.proofArtifactId}</p>
                    <p className="mt-1">{formatDateTime(auditorReport.approval.decidedAt)}</p>
                  </div>
                ) : null}
              </div>
            </section>
            <section className="rounded-3xl border border-line bg-paper p-5 sm:p-7">
              <SectionLabel>Evidence metadata</SectionLabel>
              <ul className="mt-4 grid gap-2 text-xs sm:grid-cols-2">
                {(auditorReport.evidenceMetadata ?? []).map((item) => (
                  <li key={`${item.page}-${item.field}`} className="rounded-xl border border-line px-3 py-2">
                    Page {item.page} · <span className="font-mono">{item.field}</span>
                  </li>
                ))}
              </ul>
            </section>
          </>
        ) : null}
      </div>
    );
  } catch (error) {
    if (errorCode(error) === "NOT_FOUND") notFound();
    return (
      <div className="space-y-6">
        <Link href="/analysis-runs" className="inline-flex items-center gap-2 text-xs font-semibold text-muted hover:text-ink">
          <ArrowLeft className="size-3.5" /> All analysis runs
        </Link>
        <PageHeader title="Analysis unavailable" description="The run could not be loaded for this role." />
        <FeedbackBanner error={errorCode(error)} message={errorMessage(error)} />
      </div>
    );
  }
}
