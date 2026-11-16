import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight, ShieldAlert } from "lucide-react";
import { PageHeader, SectionLabel } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { FeedbackBanner } from "@/components/feedback-banner";
import { AutoRefresh } from "@/components/auto-refresh";
import { apiFetch, errorCode, errorMessage, type ApiEnvelope, type ReppoEvaluation } from "@/lib/api-server";
import { formatDateTime } from "@/lib/money";

export const metadata = { title: "Reppo evaluation" };
export const dynamic = "force-dynamic";

export default async function EvaluationDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string; error?: string; message?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  try {
    const refresh = true;
    const evaluation = (
      await apiFetch<ApiEnvelope<ReppoEvaluation>>(`/v1/integrations/reppo/evaluations/${id}?refresh=${refresh ? "1" : "0"}`)
    ).data;
    const pending = evaluation.status === "PENDING";
    return (
      <div className="space-y-8">
        <Link href="/evaluations" className="inline-flex items-center gap-2 text-xs font-semibold text-muted hover:text-ink">
          <ArrowLeft className="size-3.5" /> All evaluations
        </Link>
        <PageHeader
          eyebrow="Reppo Eval Router · synthetic trace"
          title={evaluation.providerEvalId ? `Evaluation ${evaluation.providerEvalId.slice(0, 12)}` : "Evaluation submission"}
          description="The provider verdict is shown exactly as returned. A PENDING or FAILED evaluation is not converted into a score, and Reppo never approves a covenant or changes a prompt."
          actions={
            <>
              <StatusBadge tone={evaluation.status === "COMPLETED" ? "positive" : evaluation.status === "PENDING" ? "warning" : "danger"}>
                {evaluation.status}
              </StatusBadge>
              <Link href="/integrations" className="inline-flex items-center gap-2 rounded-full border border-line bg-paper px-4 py-2.5 text-xs font-semibold text-ink hover:border-ink/30">
                Integration status <ArrowUpRight className="size-3.5" />
              </Link>
            </>
          }
        />
        <FeedbackBanner {...query} />
        {pending ? <AutoRefresh intervalMs={60000} label="PENDING — polling every 60 seconds" /> : null}

        {evaluation.errorCode ? (
          <div role="alert" className="rounded-2xl border border-danger/25 bg-danger/10 px-4 py-3 text-sm text-danger">
            <p className="flex items-center gap-2 font-semibold"><ShieldAlert className="size-4" /> {evaluation.errorCode}</p>
            <p className="mt-1 text-danger/80">{evaluation.errorMessage ?? "The provider did not return a verdict."}</p>
          </div>
        ) : null}

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Provider status", evaluation.providerStatus ?? "—"],
            ["Score", evaluation.score === null ? "—" : `${evaluation.score} / 100`],
            ["Decision", evaluation.decision ?? "—"],
            ["Confidence", evaluation.confidence ?? "—"],
            ["Route", evaluation.route ?? "—"],
            ["Credits charged", evaluation.creditsCharged === null ? "—" : String(evaluation.creditsCharged)],
            ["Submitted", formatDateTime(evaluation.submittedAt)],
            ["Completed", formatDateTime(evaluation.completedAt)],
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl border border-line bg-paper p-4">
              <p className="text-[10px] uppercase tracking-[0.14em] text-muted">{label}</p>
              <p className="mt-2 break-all font-mono text-sm font-semibold">{value}</p>
            </div>
          ))}
        </section>

        <section className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-3xl border border-line bg-paper p-5 sm:p-7">
            <SectionLabel>Trace metadata</SectionLabel>
            <dl className="mt-4 space-y-3 text-xs">
              <div><dt className="text-muted">Local evaluation ID</dt><dd className="mt-1 break-all font-mono">{evaluation.id}</dd></div>
              <div><dt className="text-muted">Provider evaluation ID</dt><dd className="mt-1 break-all font-mono">{evaluation.providerEvalId ?? "—"}</dd></div>
              <div><dt className="text-muted">Feedback record</dt><dd className="mt-1 break-all font-mono">{evaluation.feedbackRecordId}</dd></div>
              <div><dt className="text-muted">Polling window</dt><dd className="mt-1">{evaluation.maxWaitMinutes} minutes · 60-second interval</dd></div>
              <div><dt className="text-muted">Last polled</dt><dd className="mt-1">{formatDateTime(evaluation.lastPolledAt)}</dd></div>
            </dl>
            <p className="mt-5 text-xs leading-5 text-muted">
              Only field-level change shapes and safe categorical values are sent. Amounts, free text, borrower identity,
              the token map and agreement text are excluded before the 50 KB preflight check.
            </p>
          </div>
          <div className="rounded-3xl border border-line bg-paper p-5 sm:p-7">
            <SectionLabel>Returned verdict</SectionLabel>
            <pre className="mt-4 max-h-[28rem] overflow-auto whitespace-pre-wrap break-words rounded-2xl border border-line bg-white/50 p-4 font-mono text-[11px] leading-5">
              {evaluation.result ? JSON.stringify(evaluation.result, null, 2) : evaluation.status === "PENDING" ? "No verdict yet. The provider evaluation is still pending." : "No verdict object was returned."}
            </pre>
          </div>
        </section>
      </div>
    );
  } catch (error) {
    if (errorCode(error) === "NOT_FOUND") notFound();
    return (
      <div className="space-y-6">
        <Link href="/evaluations" className="inline-flex items-center gap-2 text-xs font-semibold text-muted hover:text-ink">
          <ArrowLeft className="size-3.5" /> All evaluations
        </Link>
        <PageHeader title="Evaluation unavailable" description="The provider record could not be loaded." />
        <FeedbackBanner error={errorCode(error)} message={errorMessage(error)} />
      </div>
    );
  }
}
