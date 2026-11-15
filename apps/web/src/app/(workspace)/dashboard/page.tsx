import Link from "next/link";
import { ArrowUpRight, ChevronRight, CircleDollarSign, FileCheck2, FileSearch, ShieldAlert, ShieldCheck } from "lucide-react";
import { PageHeader, SectionLabel } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { FeedbackBanner } from "@/components/feedback-banner";
import {
  apiFetch,
  errorCode,
  errorMessage,
  getMe,
  type ApiEnvelope,
  type Borrower,
  type FacilityListItem,
  type RunListItem,
} from "@/lib/api-server";
import { formatDateTime } from "@/lib/money";

export const metadata = { title: "Overview" };
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  let me;
  let borrowers: Borrower[] = [];
  let facilities: FacilityListItem[] = [];
  let runs: RunListItem[] = [];
  let pendingApprovals = 0;
  let loadError: { code: string; message: string } | null = null;
  try {
    const [meData, borrowerList, facilityList, runList] = await Promise.all([
      getMe(),
      apiFetch<ApiEnvelope<Borrower[]>>("/v1/borrowers"),
      apiFetch<ApiEnvelope<FacilityListItem[]>>("/v1/facilities"),
      apiFetch<ApiEnvelope<RunListItem[]>>("/v1/analysis-runs?limit=20"),
    ]);
    me = meData;
    borrowers = borrowerList.data;
    facilities = facilityList.data;
    runs = runList.data;
    if (me.capabilities.approve) {
      pendingApprovals = (await apiFetch<ApiEnvelope<unknown[]>>("/v1/approvals/queue")).data.length;
    }
  } catch (error) {
    loadError = { code: errorCode(error), message: errorMessage(error) };
  }

  const approved = runs.filter((run) => run.status === "APPROVED").length;
  const breached = runs.filter((run) => run.resultCode === "BREACH").length;
  const failed = runs.filter((run) => run.status === "FAILED" || run.status === "BREACH_REVIEW" || run.status === "PROOF_FAILED");
  const awaiting = runs.filter((run) => run.status === "READY_FOR_MANAGER");
  const inReview = runs.filter((run) => !["APPROVED", "REJECTED", "CANCELLED", "FAILED", "BREACH_REVIEW", "PROOF_FAILED"].includes(run.status));

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow={`Credit operations · ${new Intl.DateTimeFormat("en-GB", { dateStyle: "long", timeZone: "UTC" }).format(new Date())}`}
        title="Every covenant, one review trail."
        description="Source-linked extraction, deterministic leverage, proof-backed compliance and a maker-checker manager decision. Synthetic data only."
        actions={
          <>
            <Link
              href="/borrowers"
              className="inline-flex items-center gap-2 rounded-full border border-line bg-paper px-4 py-2.5 text-xs font-semibold text-ink transition hover:bg-white"
            >
              View borrowers <ArrowUpRight className="size-3.5" />
            </Link>
            <Link
              href={me?.capabilities.approve ? "/approvals" : "/analysis-runs"}
              className="inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2.5 text-xs font-semibold text-paper transition hover:bg-ink-soft"
            >
              {me?.capabilities.approve ? `Approvals${pendingApprovals ? ` · ${pendingApprovals}` : ""}` : "Open analysis queue"} <ChevronRight className="size-3.5" />
            </Link>
          </>
        }
      />
      {loadError ? <FeedbackBanner error={loadError.code} message={loadError.message} /> : null}

      <section aria-labelledby="portfolio-metrics" className="grid gap-px overflow-hidden rounded-3xl border border-line bg-line sm:grid-cols-2 xl:grid-cols-4">
        <h2 id="portfolio-metrics" className="sr-only">Portfolio metrics</h2>
        {[
          { label: "Borrowers", value: String(borrowers.length), detail: `${facilities.length} facilities`, icon: FileCheck2, tone: "neutral" as const },
          { label: "Runs in review", value: String(inReview.length), detail: `${awaiting.length} awaiting manager`, icon: FileSearch, tone: "warning" as const },
          { label: "Approved", value: String(approved), detail: "Proof verified", icon: ShieldCheck, tone: "positive" as const },
          { label: "Actual breaches", value: String(breached), detail: "No approval path", icon: CircleDollarSign, tone: "danger" as const },
        ].map((metric) => {
          const Icon = metric.icon;
          return (
            <div key={metric.label} className="bg-paper p-5 sm:p-6">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">{metric.label}</p>
                <Icon className="size-4 text-muted" />
              </div>
              <p className="mt-5 text-4xl font-semibold tracking-tight">{metric.value}</p>
              <div className="mt-3"><StatusBadge tone={metric.tone}>{metric.detail}</StatusBadge></div>
            </div>
          );
        })}
      </section>

      {failed.length > 0 ? (
        <section className="rounded-3xl border border-danger/25 bg-danger/10 p-5 sm:p-6">
          <SectionLabel><span className="text-danger">Needs attention</span></SectionLabel>
          <div className="mt-3 grid gap-3">
            {failed.slice(0, 3).map((run) => (
              <Link key={run.id} href={`/analysis-runs/${run.id}`} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-danger/20 bg-white/40 px-4 py-3 text-sm text-danger">
                <span className="font-semibold">{run.borrowerReference} · {run.facilityLabel}</span>
                <span className="text-xs">{run.failureCode?.replaceAll("_", " ") ?? run.status.replaceAll("_", " ")}</span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section className="overflow-hidden rounded-3xl border border-line bg-paper">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line px-5 py-5 sm:px-7">
          <div>
            <SectionLabel>Latest analysis</SectionLabel>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">Run register</h2>
          </div>
          <Link href="/analysis-runs" className="inline-flex items-center gap-1 text-xs font-semibold underline decoration-line underline-offset-4 hover:text-ink">
            All runs <ArrowUpRight className="size-3.5" />
          </Link>
        </div>
        {runs.length === 0 ? (
          <div className="p-8 text-center">
            <ShieldAlert className="mx-auto size-7 text-muted" />
            <p className="mt-3 text-sm text-muted">
              No run yet. {me?.capabilities.writeCovenant ? "Create a borrower, add a facility and upload a synthetic agreement." : "An analyst must create the first run."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead>
                <tr className="border-b border-line text-[10px] uppercase tracking-[0.14em] text-muted">
                  <th className="px-5 py-3 font-semibold sm:px-7">Borrower / facility</th>
                  <th className="px-3 py-3 font-semibold">Status</th>
                  <th className="px-3 py-3 font-semibold">Result</th>
                  <th className="px-3 py-3 font-semibold">Threshold</th>
                  <th className="px-3 py-3 font-semibold">Updated</th>
                  <th className="px-5 py-3 font-semibold sm:px-7">Open</th>
                </tr>
              </thead>
              <tbody>
                {runs.slice(0, 6).map((run) => (
                  <tr key={run.id} className="border-b border-line/70 last:border-0">
                    <td className="px-5 py-4 sm:px-7">
                      <span className="font-semibold">{run.borrowerAlias ?? run.borrowerReference}</span>
                      <span className="mt-0.5 block text-xs text-muted">{run.facilityLabel} · run #{run.runNumber}</span>
                    </td>
                    <td className="px-3 py-4"><StatusBadge>{run.status}</StatusBadge></td>
                    <td className="px-3 py-4"><StatusBadge>{run.resultCode ?? "—"}</StatusBadge></td>
                    <td className="px-3 py-4 font-mono text-xs">{run.thresholdBps ? `${(run.thresholdBps / 10000).toFixed(2)}x` : "—"}</td>
                    <td className="px-3 py-4 text-xs text-muted">{formatDateTime(run.updatedAt)}</td>
                    <td className="px-5 py-4 sm:px-7">
                      <Link href={`/analysis-runs/${run.id}`} className="text-xs font-semibold underline decoration-line underline-offset-4 hover:text-ink">Open</Link>
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
          ["1 · Source", "Private encrypted agreement, reduced-PII redaction and page-linked evidence."],
          ["2 · Decision", "Decimal arithmetic, an independent verifier, SERV reasoning and a fixed-circuit proof."],
          ["3 · Control", "Maker-checker manager approval bound to the proof and immutable snapshot version."],
        ].map(([title, detail]) => (
          <div key={title} className="rounded-3xl border border-line bg-paper p-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">{title}</p>
            <p className="mt-3 text-sm leading-6">{detail}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
