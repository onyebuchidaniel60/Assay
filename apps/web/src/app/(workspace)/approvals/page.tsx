import Link from "next/link";
import { ClipboardCheck, ShieldCheck } from "lucide-react";
import { PageHeader, SectionLabel } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { FeedbackBanner } from "@/components/feedback-banner";
import { apiFetch, errorCode, errorMessage, getMe, type ApiEnvelope } from "@/lib/api-server";
import { approvalAction } from "@/lib/actions";
import { formatDateTime } from "@/lib/money";

export const metadata = { title: "Approvals" };
export const dynamic = "force-dynamic";

type QueueItem = {
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
  stressedBreach?: boolean;
};

export default async function ApprovalsPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string; message?: string; run?: string }>;
}) {
  const params = await searchParams;
  const me = await getMe();
  if (me.user.role !== "MANAGER") {
    return (
      <div className="space-y-8">
        <PageHeader title="Approvals" description="Manager-only decision queue." />
        <FeedbackBanner error="FORBIDDEN" message="Your role cannot approve or reject an analysis. Analyst, auditor and admin roles can inspect the run instead." />
        <Link href="/analysis-runs" className="inline-flex w-fit items-center gap-2 rounded-full bg-ink px-4 py-2.5 text-xs font-semibold text-paper">
          Open analysis runs
        </Link>
      </div>
    );
  }

  let queue: QueueItem[] = [];
  let loadError: { code: string; message: string } | null = null;
  try {
    queue = (await apiFetch<ApiEnvelope<QueueItem[]>>("/v1/approvals/queue")).data;
  } catch (error) {
    loadError = { code: errorCode(error), message: errorMessage(error) };
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Manager control"
        title="Approvals"
        description="Restricted manager view. Raw debt, EBITDA, named counterparties and agreement text are deliberately absent; approval binds the exact verified proof and analysis version."
        actions={<StatusBadge tone="proof">{queue.length} PENDING</StatusBadge>}
      />
      <FeedbackBanner {...params} />
      {loadError ? <FeedbackBanner error={loadError.code} message={loadError.message} /> : null}

      {queue.length === 0 && !loadError ? (
        <section className="rounded-3xl border border-dashed border-ink/20 bg-paper p-10 text-center">
          <ClipboardCheck className="mx-auto size-8 text-muted" />
          <h2 className="mt-4 text-xl font-semibold">Nothing awaiting approval</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted">
            A run appears here only after the analyst confirms terms and inputs, deterministic calculation passes, and the
            server verifies the compliance proof.
          </p>
          <Link href="/analysis-runs" className="mt-5 inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2.5 text-xs font-semibold text-paper">
            Review analysis runs
          </Link>
        </section>
      ) : null}

      <div className="space-y-5">
        {queue.map((item) => (
          <article key={item.id} className="rounded-3xl border border-line bg-paper p-5 sm:p-7">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">Run {item.id.slice(0, 8)} · {item.facilityReference}</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight">{item.borrowerReference} · {item.facilityLabel}</h2>
                <p className="mt-1 text-xs text-muted">Analyst attested {formatDateTime(item.analystAttestedAt)} · updated {formatDateTime(item.updatedAt)}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge>{item.status}</StatusBadge>
                <StatusBadge>{item.resultCode ?? "PENDING"}</StatusBadge>
                {item.proof?.verified ? <StatusBadge tone="proof">PROOF VERIFIED</StatusBadge> : <StatusBadge tone="danger">NO PROOF</StatusBadge>}
              </div>
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_0.9fr]">
              <dl className="grid gap-4 sm:grid-cols-2">
                {[
                  ["Threshold", item.thresholdBps ? `≤ ${(item.thresholdBps / 10000).toFixed(2)}x` : "—"],
                  ["Analysis version", String(item.analysisVersion)],
                  ["Terms version", String(item.termsVersion ?? "—")],
                  ["Created", formatDateTime(item.createdAt)],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-2xl border border-line bg-white/40 p-4">
                    <dt className="text-[10px] uppercase tracking-[0.14em] text-muted">{label}</dt>
                    <dd className="mt-2 text-sm font-semibold">{value}</dd>
                  </div>
                ))}
              </dl>
              <div className="rounded-2xl bg-ink p-4 text-paper">
                <p className="text-[10px] uppercase tracking-[0.14em] text-white/70">Scenario bands</p>
                <div className="mt-3 space-y-2">
                  {item.scenarioBands.map((band) => (
                    <div key={band.scenario} className="flex items-center justify-between gap-2 text-xs">
                      <span className="text-white/75">{band.scenario.replaceAll("_", " ")}</span>
                      <span className="font-semibold">{band.result}{band.riskBand ? ` · ${band.riskBand}` : ""}</span>
                    </div>
                  ))}
                </div>
                {item.stressedBreach ? (
                  <p className="mt-4 flex items-start gap-2 rounded-xl border border-acid/40 bg-acid/10 px-3 py-2 text-[11px] leading-5 text-acid">
                    <ShieldCheck className="mt-0.5 size-3.5 shrink-0" /> A stress scenario breaches. Approval requires risk acknowledgement and a rationale.
                  </p>
                ) : null}
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5">
              <p className="break-all font-mono text-[10px] text-muted">Proof {item.proof?.id ?? "—"} · signals {(item.proof?.publicSignals ?? []).join(" / ")}</p>
              <Link href={`/analysis-runs/${item.id}`} className="text-xs font-semibold underline decoration-line underline-offset-4 hover:text-ink">
                Inspect restricted run
              </Link>
            </div>

            {item.proof ? (
              <form action={approvalAction} className="mt-5 space-y-4 rounded-2xl border border-line bg-white/40 p-4">
                <input type="hidden" name="runId" value={item.id} />
                <input type="hidden" name="proofArtifactId" value={item.proof.id} />
                <input type="hidden" name="analysisVersion" value={item.analysisVersion} />
                <div className="grid gap-4 sm:grid-cols-[180px_1fr]">
                  <label className="block text-xs">
                    <span className="mb-1.5 block font-semibold uppercase tracking-[0.12em] text-muted">Decision</span>
                    <select name="decision" className="w-full rounded-xl border border-line bg-white/70 px-3 py-2.5 outline-none focus:border-ink">
                      <option value="APPROVE">Approve</option>
                      <option value="REJECT">Reject</option>
                    </select>
                  </label>
                  <label className="block text-xs">
                    <span className="mb-1.5 block font-semibold uppercase tracking-[0.12em] text-muted">Rationale</span>
                    <input name="rationale" required placeholder="Reviewed the restricted baseline and stress bands; proof verified." className="w-full rounded-xl border border-line bg-white/70 px-3 py-2.5 outline-none focus:border-ink" />
                  </label>
                </div>
                <label className="flex items-center gap-3 text-xs">
                  <input type="checkbox" name="riskAcknowledged" className="size-4" />
                  I acknowledge any stressed-scenario breach shown above.
                </label>
                <button type="submit" className="inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2.5 text-xs font-semibold text-paper">
                  Record manager decision
                </button>
              </form>
            ) : null}
          </article>
        ))}
      </div>
    </div>
  );
}
