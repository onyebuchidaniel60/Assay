import Link from "next/link";
import { ArrowUpRight, Scale } from "lucide-react";
import { PageHeader, SectionLabel } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { FeedbackBanner } from "@/components/feedback-banner";
import { apiFetch, errorCode, errorMessage, type ApiEnvelope, type RunListItem } from "@/lib/api-server";
import { formatDateTime } from "@/lib/money";

export const metadata = { title: "Covenants" };
export const dynamic = "force-dynamic";

export default async function CovenantsPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string; message?: string }>;
}) {
  const params = await searchParams;
  let runs: RunListItem[] = [];
  let loadError: { code: string; message: string } | null = null;
  try {
    runs = (await apiFetch<ApiEnvelope<RunListItem[]>>("/v1/analysis-runs?limit=100")).data;
  } catch (error) {
    loadError = { code: errorCode(error), message: errorMessage(error) };
  }
  const covenantRuns = runs.filter((run) => run.thresholdBps !== null);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Contractual controls"
        title="Covenant register"
        description="One supported covenant family: maximum Debt / Adjusted EBITDA. Terms are extracted from the agreement, confirmed by an analyst and bound to each immutable run."
        actions={
          <Link href="/facilities" className="inline-flex items-center gap-2 rounded-full border border-line bg-paper px-4 py-2.5 text-xs font-semibold text-ink hover:bg-white">
            Facility register <ArrowUpRight className="size-3.5" />
          </Link>
        }
      />
      <FeedbackBanner {...params} />
      {loadError ? <FeedbackBanner error={loadError.code} message={loadError.message} /> : null}

      <div className="rounded-3xl border border-line bg-paper p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-acid"><Scale className="size-4" /></span>
          <div>
            <p className="text-sm font-semibold">One covenant family, deliberately supported</p>
            <p className="mt-1 text-sm leading-6 text-muted">
              The MVP supports a contract-configurable maximum leverage covenant. Unsupported adjustments or ambiguous
              definitions route to analyst review — they are never inferred or silently accepted.
            </p>
          </div>
        </div>
      </div>

      <section className="overflow-hidden rounded-3xl border border-line bg-paper">
        <div className="border-b border-line px-5 py-5 sm:px-7">
          <SectionLabel>Definitions</SectionLabel>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight">Confirmed covenant snapshots</h2>
        </div>
        {covenantRuns.length === 0 && !loadError ? (
          <p className="p-6 text-sm text-muted">
            No confirmed covenant terms yet. Confirm terms on an analysis run to populate the register.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] text-left text-sm">
              <thead>
                <tr className="border-b border-line text-[10px] uppercase tracking-[0.14em] text-muted">
                  <th className="px-5 py-3 font-semibold sm:px-7">Borrower / facility</th>
                  <th className="px-3 py-3 font-semibold">Type</th>
                  <th className="px-3 py-3 font-semibold">Threshold</th>
                  <th className="px-3 py-3 font-semibold">Run status</th>
                  <th className="px-3 py-3 font-semibold">Result</th>
                  <th className="px-3 py-3 font-semibold">Updated</th>
                  <th className="px-5 py-3 font-semibold sm:px-7">Open</th>
                </tr>
              </thead>
              <tbody>
                {covenantRuns.map((run) => (
                  <tr key={run.id} className="border-b border-line/70 last:border-0">
                    <td className="px-5 py-4 sm:px-7">
                      <span className="font-semibold">{run.borrowerAlias ?? run.borrowerReference}</span>
                      <span className="mt-0.5 block text-xs text-muted">{run.facilityLabel} · {run.facilityReference}</span>
                    </td>
                    <td className="px-3 py-4 font-mono text-[11px]">MAX_LEVERAGE</td>
                    <td className="px-3 py-4 font-mono text-xs">≤ {run.thresholdBps ? (run.thresholdBps / 10000).toFixed(2) : "—"}x</td>
                    <td className="px-3 py-4"><StatusBadge>{run.status}</StatusBadge></td>
                    <td className="px-3 py-4"><StatusBadge>{run.resultCode ?? "—"}</StatusBadge></td>
                    <td className="px-3 py-4 text-xs text-muted">{formatDateTime(run.updatedAt)}</td>
                    <td className="px-5 py-4 sm:px-7">
                      <Link href={`/analysis-runs/${run.id}`} className="text-xs font-semibold underline decoration-line underline-offset-4 hover:text-ink">
                        Inspect
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {[
          ["Threshold", "Contract limit expressed in basis points, e.g. 35,000 = 3.50x."],
          ["Exact predicate", "debt_minor × 10,000 ≤ adjusted_ebitda_minor × threshold_bps. No rounding before comparison."],
          ["Evidence", "Every confirmed term keeps its source page and verbatim quote for review."],
        ].map(([title, detail]) => (
          <div key={title} className="rounded-2xl border border-line bg-paper p-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">{title}</p>
            <p className="mt-2 text-sm leading-6">{detail}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
