import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight, FileSearch, FileText, Plus, ShieldCheck, Upload } from "lucide-react";
import { PageHeader, SectionLabel } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { FeedbackBanner } from "@/components/feedback-banner";
import { apiFetch, errorCode, errorMessage, getMe, type ApiEnvelope, type FacilityDetail } from "@/lib/api-server";
import { createAnalysisAction, uploadDocumentAction } from "@/lib/actions";
import { formatDateTime } from "@/lib/money";

export const metadata = { title: "Facility detail" };
export const dynamic = "force-dynamic";

type RunRow = FacilityDetail["analysisRuns"][number] & { documentId: string };

export default async function FacilityDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string; error?: string; message?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  try {
    const [me, response] = await Promise.all([
      getMe(),
      apiFetch<ApiEnvelope<FacilityDetail & { analysisRuns: RunRow[] }>>(`/v1/facilities/${id}`),
    ]);
    const facility = response.data;
    const usedDocuments = new Set(facility.analysisRuns.map((run) => run.documentId));
    const latestRun = facility.analysisRuns[0];

    return (
      <div className="space-y-8">
        <Link href="/facilities" className="inline-flex items-center gap-2 text-xs font-semibold text-muted hover:text-ink">
          <ArrowLeft className="size-3.5" /> All facilities
        </Link>

        <PageHeader
          eyebrow={`${facility.borrower.displayAlias} · ${facility.borrower.referenceToken}`}
          title={facility.label}
          description="Upload the synthetic agreement, start the immutable analysis run and follow the redaction, extraction, calculation, proof and approval steps."
          actions={
            <>
              <StatusBadge>{facility.status}</StatusBadge>
              {latestRun ? <StatusBadge>{latestRun.resultCode ?? latestRun.status}</StatusBadge> : <StatusBadge>NOT_ASSESSED</StatusBadge>}
              <Link
                href={`/audit?borrower=${facility.borrower.id}`}
                className="inline-flex items-center gap-2 rounded-full border border-line bg-paper px-4 py-2.5 text-xs font-semibold text-ink hover:border-ink/30"
              >
                <ShieldCheck className="size-3.5" /> Audit chain
              </Link>
            </>
          }
        />
        <FeedbackBanner {...query} />

        <section className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-3xl border border-line bg-paper p-5 sm:p-7">
            <SectionLabel>Facility terms</SectionLabel>
            <dl className="mt-5 grid gap-5 sm:grid-cols-2">
              {[
                ["Borrower", facility.borrower.displayAlias],
                ["Borrower reference", facility.borrower.referenceToken],
                ["Facility reference", facility.facilityReferenceToken],
                ["Currency", facility.currency],
                ["Status", facility.status],
                ["Record version", `v${facility.version}`],
                ["Created", formatDateTime(facility.createdAt)],
                ["Last updated", formatDateTime(facility.updatedAt)],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">{label}</dt>
                  <dd className="mt-1.5 text-sm font-medium">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="rounded-3xl bg-ink p-5 text-paper sm:p-7">
            <SectionLabel><span className="text-white/50">Latest run</span></SectionLabel>
            {latestRun ? (
              <>
                <p className="mt-5 text-3xl font-semibold">Run #{latestRun.runNumber}</p>
                <p className="mt-2 text-sm text-white/60">Status {latestRun.status.replaceAll("_", " ").toLowerCase()}</p>
                <div className="mt-6 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-acid p-4 text-ink">
                    <p className="text-[10px] uppercase tracking-[0.14em]">Result</p>
                    <p className="mt-2 text-lg font-semibold">{latestRun.resultCode ?? "Pending"}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 p-4">
                    <p className="text-[10px] uppercase tracking-[0.14em] text-white/50">Updated</p>
                    <p className="mt-2 text-sm font-semibold">{formatDateTime(latestRun.updatedAt)}</p>
                  </div>
                </div>
                <Link href={`/analysis-runs/${latestRun.id}`} className="mt-5 inline-flex items-center gap-1 text-xs font-semibold text-acid underline decoration-white/30 underline-offset-4">
                  Open analysis run <ArrowUpRight className="size-3.5" />
                </Link>
              </>
            ) : (
              <>
                <p className="mt-5 text-2xl font-semibold">No analysis run</p>
                <p className="mt-2 text-sm leading-6 text-white/60">Upload one agreement, then create the immutable run.</p>
              </>
            )}
            <p className="mt-5 text-xs leading-5 text-white/40">
              Actual compliance and stress scenarios are stored separately. A stress breach never relabels the actual result.
            </p>
          </div>
        </section>

        <section className="rounded-3xl border border-line bg-paper p-5 sm:p-7">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <SectionLabel>Evidence</SectionLabel>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight">Agreement documents</h2>
            </div>
            {me.capabilities.writeCovenant ? (
              <form action={uploadDocumentAction} encType="multipart/form-data" className="flex flex-wrap items-center gap-2">
                <input type="hidden" name="facilityId" value={facility.id} />
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-line bg-paper px-4 py-2 text-xs font-semibold text-ink hover:border-ink/30">
                  <Upload className="size-3.5" />
                  <span>Choose PDF/TXT</span>
                  <input type="file" name="file" accept=".pdf,.txt,application/pdf,text/plain" required className="sr-only" />
                </label>
                <button type="submit" className="inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-xs font-semibold text-paper">
                  Upload agreement
                </button>
              </form>
            ) : null}
          </div>

          {facility.documents.length === 0 ? (
            <p className="mt-5 rounded-2xl border border-dashed border-ink/20 p-5 text-sm text-muted">
              No agreement uploaded. PDF or UTF-8 text only, maximum 10 MiB and 40 pages. Scanned PDFs are rejected.
            </p>
          ) : (
            <div className="mt-5 divide-y divide-line">
              {facility.documents.map((doc) => {
                const used = usedDocuments.has(doc.id);
                return (
                  <div key={doc.id} className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-start gap-3">
                      <span className="grid size-9 shrink-0 place-items-center rounded-full border border-line bg-white/50"><FileText className="size-4" /></span>
                      <div>
                        <p className="text-sm font-semibold">{doc.originalFilename ?? "Agreement"}</p>
                        <p className="mt-0.5 text-xs text-muted">
                          {doc.mimeType} · {doc.pageCount ?? "—"} pages · {(doc.sizeBytes / 1024).toFixed(1)} KiB · {formatDateTime(doc.createdAt)}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 pl-12 lg:pl-0">
                      <StatusBadge>{doc.status}</StatusBadge>
                      {(me.user.role === "ANALYST" || me.user.role === "ADMIN") ? (
                        <Link href={`/documents/${doc.id}`} className="text-xs font-semibold underline decoration-line underline-offset-4 hover:text-ink">
                          Preview text
                        </Link>
                      ) : null}
                      {me.capabilities.writeCovenant ? (
                        <form action={createAnalysisAction}>
                          <input type="hidden" name="facilityId" value={facility.id} />
                          <input type="hidden" name="documentId" value={doc.id} />
                          <button
                            type="submit"
                            disabled={used}
                            title={used ? "This agreement already belongs to a run" : "Create an immutable analysis run"}
                            className="inline-flex items-center gap-1.5 rounded-full bg-ink px-3.5 py-2 text-xs font-semibold text-paper disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <Plus className="size-3.5" /> {used ? "Run created" : "New analysis run"}
                          </button>
                        </form>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="rounded-3xl border border-line bg-paper p-5 sm:p-7">
          <SectionLabel>Analysis</SectionLabel>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight">Runs for this facility</h2>
          {facility.analysisRuns.length === 0 ? (
            <p className="mt-5 rounded-2xl border border-dashed border-ink/20 p-5 text-sm text-muted">
              No run yet. Upload the agreement and create the first immutable run.
            </p>
          ) : (
            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead>
                  <tr className="border-b border-line text-[10px] uppercase tracking-[0.14em] text-muted">
                    <th className="py-3 pr-3 font-semibold">Run</th>
                    <th className="px-3 py-3 font-semibold">Status</th>
                    <th className="px-3 py-3 font-semibold">Result</th>
                    <th className="px-3 py-3 font-semibold">Updated</th>
                    <th className="py-3 pl-3 font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {facility.analysisRuns.map((run) => (
                    <tr key={run.id} className="border-b border-line/70 last:border-0">
                      <td className="py-4 pr-3 font-semibold">#{run.runNumber}</td>
                      <td className="px-3 py-4"><StatusBadge>{run.status}</StatusBadge></td>
                      <td className="px-3 py-4 text-xs">{run.resultCode ?? "—"}</td>
                      <td className="px-3 py-4 text-xs text-muted">{formatDateTime(run.updatedAt)}</td>
                      <td className="py-4 pl-3">
                        <Link href={`/analysis-runs/${run.id}`} className="inline-flex items-center gap-1 text-xs font-semibold underline decoration-line underline-offset-4 hover:text-ink">
                          <FileSearch className="size-3.5" /> Open run
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
  } catch (error) {
    if (errorCode(error) === "NOT_FOUND") notFound();
    return (
      <div className="space-y-6">
        <Link href="/facilities" className="inline-flex items-center gap-2 text-xs font-semibold text-muted hover:text-ink">
          <ArrowLeft className="size-3.5" /> All facilities
        </Link>
        <PageHeader title="Facility unavailable" description="The facility could not be loaded." />
        <FeedbackBanner error={errorCode(error)} message={errorMessage(error)} />
      </div>
    );
  }
}
