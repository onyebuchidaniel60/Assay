import Link from "next/link";
import { ArrowUpRight, ShieldAlert } from "lucide-react";
import { PageHeader, SectionLabel } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { FeedbackBanner } from "@/components/feedback-banner";
import { apiFetch, errorCode, errorMessage, type ApiEnvelope, type RunListItem } from "@/lib/api-server";
import { formatDateTime } from "@/lib/money";

export const metadata = { title: "Exception cases" };
export const dynamic = "force-dynamic";

export default async function CasesPage({
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
  const exceptions = runs.filter(
    (run) => run.resultCode === "BREACH" || run.status === "BREACH_REVIEW" || run.status === "FAILED" || run.status === "PROOF_FAILED",
  );

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Exception workflow"
        title="Exception cases"
        description="Derived directly from immutable run state: an actual baseline breach or a failed review path. A forecast at-risk scenario never creates an actual breach case."
      />
      <FeedbackBanner {...params} />
      {loadError ? <FeedbackBanner error={loadError.code} message={loadError.message} /> : null}

      {exceptions.length === 0 && !loadError ? (
        <section className="rounded-3xl border border-dashed border-ink/20 bg-paper p-10 text-center">
          <ShieldAlert className="mx-auto size-8 text-muted" />
          <h2 className="mt-4 text-xl font-semibold">No exception cases</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted">
            Every run is either in progress or completed without a baseline breach or failed review path.
          </p>
          <Link href="/analysis-runs" className="mt-5 inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2.5 text-xs font-semibold text-paper">
            Open analysis runs <ArrowUpRight className="size-3.5" />
          </Link>
        </section>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        {exceptions.map((run) => {
          const breach = run.resultCode === "BREACH" || run.status === "BREACH_REVIEW";
          return (
            <Link key={run.id} href={`/analysis-runs/${run.id}`} className="group rounded-3xl border border-line bg-paper p-5 transition hover:border-ink/30 hover:bg-white/60 sm:p-7">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge tone={breach ? "danger" : "warning"}>{breach ? "HIGH" : "MEDIUM"}</StatusBadge>
                <StatusBadge>{run.status}</StatusBadge>
                {run.failureCode ? <StatusBadge tone="danger">{run.failureCode}</StatusBadge> : null}
              </div>
              <h2 className="mt-4 text-2xl font-semibold tracking-tight group-hover:underline group-hover:decoration-ink/25 group-hover:underline-offset-4">
                {breach ? "Maximum leverage threshold exceeded" : "Analysis requires correction"}
              </h2>
              <p className="mt-1 text-sm text-muted">{run.borrowerAlias ?? run.borrowerReference} · {run.facilityLabel}</p>
              <div className="mt-5 flex flex-wrap gap-4 border-t border-line pt-4 text-xs text-muted">
                <span>{breach ? "BASELINE_BREACH" : run.failureCode ?? "REVIEW_FAILED"}</span>
                <span>Run #{run.runNumber}</span>
                <span>{formatDateTime(run.updatedAt)}</span>
              </div>
            </Link>
          );
        })}
      </div>

      <section className="rounded-3xl border border-line bg-paper p-5 sm:p-7">
        <SectionLabel>Case rules</SectionLabel>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {[
            ["No baseline override", "A baseline breach is terminal for that snapshot. The only path is a corrected source and a new run."],
            ["Separate stress", "Stress-scenario breaches are risk flags, not actual cases. The manager acknowledges them explicitly."],
            ["Evidence preserved", "Cases and approvals reference the immutable run, proof artifact and analysis version; nothing is overwritten."],
          ].map(([title, body]) => (
            <div key={title} className="rounded-2xl border border-line bg-white/40 p-4">
              <p className="text-sm font-semibold">{title}</p>
              <p className="mt-2 text-xs leading-5 text-muted">{body}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
