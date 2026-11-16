import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight, Building2, Plus, ShieldCheck } from "lucide-react";
import { PageHeader, SectionLabel } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { FeedbackBanner } from "@/components/feedback-banner";
import { apiFetch, errorCode, errorMessage, getMe, type ApiEnvelope, type Borrower, type Facility } from "@/lib/api-server";
import { createFacilityAction } from "@/lib/actions";
import { formatDateTime } from "@/lib/money";

export const metadata = { title: "Borrower detail" };
export const dynamic = "force-dynamic";

type BorrowerDetail = Borrower & { facilities: Facility[] };

export default async function BorrowerDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string; error?: string; message?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  let borrower: BorrowerDetail;
  try {
    const [me, response] = await Promise.all([
      getMe(),
      apiFetch<ApiEnvelope<BorrowerDetail>>(`/v1/borrowers/${id}`),
    ]);
    borrower = response.data;
    return (
      <div className="space-y-8">
        <Link href="/borrowers" className="inline-flex items-center gap-2 text-xs font-semibold text-muted hover:text-ink">
          <ArrowLeft className="size-3.5" /> All borrowers
        </Link>
        <PageHeader
          eyebrow={`${borrower.referenceToken} · synthetic borrower`}
          title={borrower.displayAlias}
          description="Facility map, encryption-key status and audit scope. Raw agreement bytes and financial figures stay inside analyst-authorized views."
          actions={
            <>
              <StatusBadge>{borrower.status}</StatusBadge>
              <Link
                href={`/audit?borrower=${borrower.id}`}
                className="inline-flex items-center gap-2 rounded-full border border-line bg-paper px-4 py-2.5 text-xs font-semibold text-ink hover:border-ink/30"
              >
                <ShieldCheck className="size-3.5" /> Audit chain
              </Link>
            </>
          }
        />
        <FeedbackBanner {...query} />

        <section className="grid gap-5 lg:grid-cols-[1fr_0.8fr]">
          <div className="rounded-3xl border border-line bg-paper p-5 sm:p-7">
            <SectionLabel>Record</SectionLabel>
            <dl className="mt-5 grid gap-5 sm:grid-cols-2">
              {[
                ["Reference token", borrower.referenceToken],
                ["Status", borrower.status],
                ["Record version", `v${borrower.version}`],
                ["Created", formatDateTime(borrower.createdAt)],
                ["Last updated", formatDateTime(borrower.updatedAt)],
                ["Facilities", String(borrower.facilities.length)],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">{label}</dt>
                  <dd className="mt-1.5 text-sm font-medium">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="rounded-3xl bg-ink p-5 text-paper sm:p-7">
            <SectionLabel><span className="text-white/50">Key scope</span></SectionLabel>
            <p className="mt-5 text-2xl font-semibold">Per-borrower DEK</p>
            <p className="mt-2 text-sm leading-6 text-white/60">
              Documents, financial snapshots, scenario details and audit payloads are sealed with AES-256-GCM under this
              borrower&apos;s data key. The wrapped key is stored separately from the ciphertext.
            </p>
            <p className="mt-5 text-xs text-white/40">Active · key version 1 · crypto-shred disabled by environment policy</p>
          </div>
        </section>

        <section className="rounded-3xl border border-line bg-paper p-5 sm:p-7">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <SectionLabel>Facilities</SectionLabel>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight">Credit facilities</h2>
            </div>
          </div>
          {borrower.facilities.length === 0 ? (
            <p className="mt-5 rounded-2xl border border-dashed border-ink/20 p-5 text-sm text-muted">
              No facility yet. Add the synthetic facility reference and currency to continue.
            </p>
          ) : (
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {borrower.facilities.map((facility) => (
                <article key={facility.id} className="rounded-2xl border border-line bg-white/40 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">{facility.facilityReferenceToken}</p>
                      <h3 className="mt-2 text-lg font-semibold">{facility.label}</h3>
                    </div>
                    <StatusBadge>{facility.status}</StatusBadge>
                  </div>
                  <p className="mt-3 text-xs text-muted">{facility.currency} · created {formatDateTime(facility.createdAt)}</p>
                  <Link href={`/facilities/${facility.id}`} className="mt-4 inline-flex items-center gap-1 text-xs font-semibold underline decoration-line underline-offset-4 hover:text-ink">
                    Open facility <ArrowUpRight className="size-3.5" />
                  </Link>
                </article>
              ))}
            </div>
          )}

          {me.capabilities.writeCovenant ? (
            <form action={createFacilityAction} className="mt-6 rounded-2xl border border-dashed border-ink/20 p-5">
              <input type="hidden" name="borrowerId" value={borrower.id} />
              <p className="flex items-center gap-2 text-sm font-semibold"><Plus className="size-4" /> Add facility</p>
              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                <label className="block text-xs">
                  <span className="mb-1.5 block font-semibold uppercase tracking-[0.12em] text-muted">Facility reference</span>
                  <input name="facilityReferenceToken" required pattern="[A-Za-z0-9][A-Za-z0-9_-]{1,63}" className="w-full rounded-xl border border-line bg-white/60 px-3 py-2.5 outline-none focus:border-ink" placeholder="FAC-005" />
                </label>
                <label className="block text-xs">
                  <span className="mb-1.5 block font-semibold uppercase tracking-[0.12em] text-muted">Label</span>
                  <input name="label" required maxLength={160} className="w-full rounded-xl border border-line bg-white/60 px-3 py-2.5 outline-none focus:border-ink" placeholder="Revolving Credit Facility" />
                </label>
                <label className="block text-xs">
                  <span className="mb-1.5 block font-semibold uppercase tracking-[0.12em] text-muted">Currency</span>
                  <input name="currency" required defaultValue="USD" pattern="[A-Z]{3}" className="w-full rounded-xl border border-line bg-white/60 px-3 py-2.5 font-mono uppercase outline-none focus:border-ink" />
                </label>
              </div>
              <button type="submit" className="mt-4 inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2.5 text-xs font-semibold text-paper">
                <Building2 className="size-3.5" /> Create facility
              </button>
            </form>
          ) : null}
        </section>
      </div>
    );
  } catch (error) {
    if (errorCode(error) === "NOT_FOUND") notFound();
    return (
      <div className="space-y-6">
        <Link href="/borrowers" className="inline-flex items-center gap-2 text-xs font-semibold text-muted hover:text-ink">
          <ArrowLeft className="size-3.5" /> All borrowers
        </Link>
        <PageHeader title="Borrower unavailable" description="The record could not be loaded." />
        <FeedbackBanner error={errorCode(error)} message={errorMessage(error)} />
      </div>
    );
  }
}
