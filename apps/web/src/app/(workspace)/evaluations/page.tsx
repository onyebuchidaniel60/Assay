import Link from "next/link";
import { ArrowUpRight, ClipboardCheck } from "lucide-react";
import { PageHeader, SectionLabel } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { FeedbackBanner } from "@/components/feedback-banner";
import { apiFetch, errorCode, errorMessage, type ApiEnvelope, type ReppoEvaluation } from "@/lib/api-server";
import { formatDateTime } from "@/lib/money";

export const metadata = { title: "Evaluations" };
export const dynamic = "force-dynamic";

export default async function EvaluationsPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string; message?: string }>;
}) {
  const params = await searchParams;
  let evaluations: ReppoEvaluation[] = [];
  let loadError: { code: string; message: string } | null = null;
  try {
    evaluations = (await apiFetch<ApiEnvelope<ReppoEvaluation[]>>("/v1/integrations/reppo/evaluations")).data;
  } catch (error) {
    loadError = { code: errorCode(error), message: errorMessage(error) };
  }
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Synthetic feedback · Reppo Eval Router"
        title="Evaluations"
        description="De-identified correction traces submitted to Reppo. Verdicts are displayed exactly as returned; PENDING and FAILED are never replaced by a fixture score."
        actions={<Link href="/integrations" className="inline-flex items-center gap-2 rounded-full border border-line bg-paper px-4 py-2.5 text-xs font-semibold text-ink hover:border-ink/30">Integration status <ArrowUpRight className="size-3.5" /></Link>}
      />
      <FeedbackBanner {...params} />
      {loadError ? <FeedbackBanner error={loadError.code} message={loadError.message} /> : null}
      {evaluations.length === 0 && !loadError ? (
        <section className="rounded-3xl border border-dashed border-ink/20 bg-paper p-10 text-center">
          <ClipboardCheck className="mx-auto size-8 text-muted" />
          <h2 className="mt-4 text-xl font-semibold">No Reppo evaluations yet</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted">
            An analyst can record a correction on an analysis run and optionally submit the de-identified trace for evaluation.
          </p>
          <Link href="/analysis-runs" className="mt-5 inline-flex rounded-full bg-ink px-4 py-2.5 text-xs font-semibold text-paper">Open analysis runs</Link>
        </section>
      ) : null}
      {evaluations.length > 0 ? (
        <section className="overflow-hidden rounded-3xl border border-line bg-paper">
          <div className="border-b border-line px-5 py-5 sm:px-7">
            <SectionLabel>Provider records</SectionLabel>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">Evaluation register</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead>
                <tr className="border-b border-line text-[10px] uppercase tracking-[0.14em] text-muted">
                  <th className="px-5 py-3 font-semibold sm:px-7">Evaluation</th>
                  <th className="px-3 py-3 font-semibold">Provider status</th>
                  <th className="px-3 py-3 font-semibold">Score</th>
                  <th className="px-3 py-3 font-semibold">Decision</th>
                  <th className="px-3 py-3 font-semibold">Confidence</th>
                  <th className="px-3 py-3 font-semibold">Submitted</th>
                  <th className="px-5 py-3 font-semibold sm:px-7">Detail</th>
                </tr>
              </thead>
              <tbody>
                {evaluations.map((evaluation) => (
                  <tr key={evaluation.id} className="border-b border-line/70 last:border-0">
                    <td className="px-5 py-4 sm:px-7 font-mono text-xs">{evaluation.providerEvalId ?? evaluation.id.slice(0, 8)}</td>
                    <td className="px-3 py-4"><StatusBadge tone={evaluation.status === "COMPLETED" ? "positive" : evaluation.status === "FAILED" || evaluation.status === "TIMEOUT" ? "danger" : "warning"}>{evaluation.status}</StatusBadge></td>
                    <td className="px-3 py-4 font-mono text-xs">{evaluation.score ?? "—"}</td>
                    <td className="px-3 py-4 text-xs">{evaluation.decision ?? "—"}</td>
                    <td className="px-3 py-4 text-xs">{evaluation.confidence ?? "—"}</td>
                    <td className="px-3 py-4 text-xs text-muted">{formatDateTime(evaluation.submittedAt)}</td>
                    <td className="px-5 py-4 sm:px-7"><Link href={`/evaluations/${evaluation.id}`} className="text-xs font-semibold underline decoration-line underline-offset-4 hover:text-ink">Open</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  );
}
