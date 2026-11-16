import Link from "next/link";
import { FileSearch } from "lucide-react";
import { PageHeader, SectionLabel } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { FeedbackBanner } from "@/components/feedback-banner";
import { apiFetch, errorCode, errorMessage, type ApiEnvelope } from "@/lib/api-server";
import { formatDateTime } from "@/lib/money";

export const metadata = { title: "Analysis runs" };
export const dynamic = "force-dynamic";

type RunListItem = {
  id: string;
  runNumber: number;
  status: string;
  resultCode: string | null;
  failureCode: string | null;
  version: number;
  termsVersion: number | null;
  thresholdBps: number | null;
  borrowerId: string;
  borrowerAlias: string | null;
  borrowerReference: string;
  facilityId: string;
  facilityLabel: string;
  facilityReference: string;
  createdAt: string;
  updatedAt: string;
};

export default async function AnalysisRunsPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string; message?: string }>;
}) {
  const params = await searchParams;
  let runs: RunListItem[] = [];
  let loadError: { code: string; message: string } | null = null;
  try {
    runs = (await apiFetch<ApiEnvelope<RunListItem[]>>("/v1/analysis-runs")).data;
  } catch (error) {
    loadError = { code: errorCode(error), message: errorMessage(error) };
  }
  const terminal = runs.filter((run) => ["APPROVED", "REJECTED", "CANCELLED"].includes(run.status)).length;
  const awaiting = runs.filter((run) => run.status === "READY_FOR_MANAGER").length;
  const needsAttention = runs.filter((run) => ["FAILED", "BREACH_REVIEW", "PROOF_FAILED"].includes(run.status)).length;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Review queue"
        title="Analysis runs"
        description="Each run is an immutable snapshot: a confirmed covenant version, attested financial inputs, a deterministic calculation and an optional compliance proof."
      />
      <FeedbackBanner {...params} />
      {loadError ? <FeedbackBanner error={loadError.code} message={loadError.message} /> : null}

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          ["Total runs", String(runs.length), "Tenant-scoped"],
          ["Awaiting manager", String(awaiting), "Proof verified and ready"],
          ["Needs attention", String(needsAttention), "Failed or breach review"],
          ["Terminal", String(terminal), "Approved, rejected or cancelled"],
        ].slice(0, 3).map(([label, value, detail]) => (
          <div key={label} className="rounded-2xl border border-line bg-paper p-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">{label}</p>
            <p className="mt-3 text-3xl font-semibold">{value}</p>
            <p className="mt-1 text-xs text-muted">{detail}</p>
          </div>
        ))}
      </div>

      <section className="overflow-hidden rounded-3xl border border-line bg-paper">
        <div className="border-b border-line px-5 py-5 sm:px-7">
          <SectionLabel>Runs</SectionLabel>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight">Latest analysis</h2>
        </div>
        {runs.length === 0 && !loadError ? (
          <div className="p-10 text-center">
            <FileSearch className="mx-auto size-8 text-muted" />
            <p className="mt-4 text-lg font-semibold">No analysis runs yet</p>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted">
              Open a facility, upload a synthetic agreement and create the first run.
            </p>
            <Link href="/facilities" className="mt-5 inline-flex rounded-full bg-ink px-4 py-2.5 text-xs font-semibold text-paper">
              Open facilities
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead>
                <tr className="border-b border-line text-[10px] uppercase tracking-[0.14em] text-muted">
                  <th className="px-5 py-3 font-semibold sm:px-7">Borrower / facility</th>
                  <th className="px-3 py-3 font-semibold">Run</th>
                  <th className="px-3 py-3 font-semibold">Status</th>
                  <th className="px-3 py-3 font-semibold">Result</th>
                  <th className="px-3 py-3 font-semibold">Threshold</th>
                  <th className="px-3 py-3 font-semibold">Updated</th>
                  <th className="px-5 py-3 font-semibold sm:px-7">Action</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((run) => (
                  <tr key={run.id} className="border-b border-line/70 transition hover:bg-canvas/50 last:border-0">
                    <td className="px-5 py-4 sm:px-7">
                      <span className="font-semibold">{run.borrowerAlias ?? run.borrowerReference}</span>
                      <span className="mt-0.5 block text-xs text-muted">{run.facilityLabel} · {run.facilityReference}</span>
                    </td>
                    <td className="px-3 py-4 font-mono text-xs">#{run.runNumber}</td>
                    <td className="px-3 py-4"><StatusBadge>{run.status}</StatusBadge></td>
                    <td className="px-3 py-4"><StatusBadge>{run.resultCode ?? "—"}</StatusBadge></td>
                    <td className="px-3 py-4 font-mono text-xs">{run.thresholdBps ? `${(run.thresholdBps / 10000).toFixed(2)}x` : "—"}</td>
                    <td className="px-3 py-4 text-xs text-muted">{formatDateTime(run.updatedAt)}</td>
                    <td className="px-5 py-4 sm:px-7">
                      <Link href={`/analysis-runs/${run.id}`} className="text-xs font-semibold underline decoration-line underline-offset-4 hover:text-ink">
                        Open
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
