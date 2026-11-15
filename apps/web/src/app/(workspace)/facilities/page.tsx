import Link from "next/link";
import { ArrowUpRight, Building2, Scale } from "lucide-react";
import { PageHeader, SectionLabel } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { FeedbackBanner } from "@/components/feedback-banner";
import { apiFetch, errorCode, errorMessage, type ApiEnvelope } from "@/lib/api-server";
import { formatDateTime } from "@/lib/money";

export const metadata = { title: "Facilities" };
export const dynamic = "force-dynamic";

type FacilityListItem = {
  id: string;
  borrowerId: string;
  borrowerAlias: string;
  borrowerReference: string;
  facilityReferenceToken: string;
  label: string;
  currency: string;
  status: string;
  createdAt: string;
};

export default async function FacilitiesPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string; message?: string }>;
}) {
  const params = await searchParams;
  let facilities: FacilityListItem[] = [];
  let loadError: { code: string; message: string } | null = null;
  try {
    facilities = (await apiFetch<ApiEnvelope<FacilityListItem[]>>("/v1/facilities")).data;
  } catch (error) {
    loadError = { code: errorCode(error), message: errorMessage(error) };
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Portfolio"
        title="Facilities"
        description="Credit facilities and their document/analysis scope. Forecast risk is always separated from the actual covenant result."
        actions={
          <>
            <Link href="/borrowers" className="inline-flex items-center gap-2 rounded-full border border-line bg-paper px-4 py-2.5 text-xs font-semibold text-ink hover:bg-white">
              Borrower register <ArrowUpRight className="size-3.5" />
            </Link>
            <Link href="/covenants" className="inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2.5 text-xs font-semibold text-paper hover:bg-ink-soft">
              Covenant register <Scale className="size-3.5" />
            </Link>
          </>
        }
      />
      <FeedbackBanner {...params} />
      {loadError ? <FeedbackBanner error={loadError.code} message={loadError.message} /> : null}

      {facilities.length === 0 && !loadError ? (
        <section className="rounded-3xl border border-dashed border-ink/20 bg-paper p-10 text-center">
          <Building2 className="mx-auto size-8 text-muted" />
          <h2 className="mt-4 text-xl font-semibold">No facilities yet</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted">
            Create a borrower, then add a facility from its detail page. The agreement upload and analysis run start from
            the facility.
          </p>
          <Link href="/borrowers" className="mt-6 inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2.5 text-xs font-semibold text-paper">
            Open borrowers <ArrowUpRight className="size-3.5" />
          </Link>
        </section>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        {facilities.map((facility) => (
          <Link
            key={facility.id}
            href={`/facilities/${facility.id}`}
            className="group rounded-3xl border border-line bg-paper p-5 transition hover:border-ink/30 hover:bg-white/60"
          >
            <div className="flex items-start justify-between gap-3">
              <span className="grid size-9 place-items-center rounded-full bg-ink text-paper">
                <Building2 className="size-4" />
              </span>
              <StatusBadge>{facility.status}</StatusBadge>
            </div>
            <p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">{facility.borrowerAlias}</p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight group-hover:underline group-hover:decoration-ink/25 group-hover:underline-offset-4">
              {facility.label}
            </h2>
            <dl className="mt-5 grid grid-cols-2 gap-3 border-t border-line pt-4 text-xs">
              <div><dt className="text-muted">Reference</dt><dd className="mt-1 font-mono font-semibold">{facility.facilityReferenceToken}</dd></div>
              <div><dt className="text-muted">Currency</dt><dd className="mt-1 font-semibold">{facility.currency}</dd></div>
              <div><dt className="text-muted">Borrower</dt><dd className="mt-1 font-semibold">{facility.borrowerReference}</dd></div>
              <div><dt className="text-muted">Created</dt><dd className="mt-1 font-semibold">{formatDateTime(facility.createdAt)}</dd></div>
            </dl>
          </Link>
        ))}
      </div>

      {facilities.length > 0 ? (
        <section className="overflow-hidden rounded-3xl border border-line bg-paper">
          <div className="border-b border-line px-5 py-5 sm:px-7">
            <SectionLabel>Register</SectionLabel>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">Facility register</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-line text-[10px] uppercase tracking-[0.14em] text-muted">
                  <th className="px-5 py-3 font-semibold sm:px-7">Borrower / facility</th>
                  <th className="px-3 py-3 font-semibold">Reference</th>
                  <th className="px-3 py-3 font-semibold">Currency</th>
                  <th className="px-3 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 font-semibold sm:px-7">Detail</th>
                </tr>
              </thead>
              <tbody>
                {facilities.map((facility) => (
                  <tr key={facility.id} className="border-b border-line/70 last:border-0">
                    <td className="px-5 py-4 sm:px-7">
                      <span className="font-semibold">{facility.label}</span>
                      <span className="mt-0.5 block text-xs text-muted">{facility.borrowerAlias}</span>
                    </td>
                    <td className="px-3 py-4 font-mono text-xs">{facility.facilityReferenceToken}</td>
                    <td className="px-3 py-4 text-xs">{facility.currency}</td>
                    <td className="px-3 py-4"><StatusBadge>{facility.status}</StatusBadge></td>
                    <td className="px-5 py-4 sm:px-7">
                      <Link href={`/facilities/${facility.id}`} className="text-xs font-semibold underline decoration-line underline-offset-4 hover:text-ink">
                        Open
                      </Link>
                    </td>
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
