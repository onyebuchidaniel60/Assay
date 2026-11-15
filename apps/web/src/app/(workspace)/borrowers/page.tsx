import Link from "next/link";
import { ArrowUpRight, Plus } from "lucide-react";
import { PageHeader, SectionLabel } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { demoRuns } from "@/lib/demo-data";

export const metadata = { title: "Borrowers" };

const borrowers = [
  { name: "Northwind Components Ltd.", ref: "NWC-2026-001", facilities: 1, actual: "COMPLIANT", cases: 0, owner: "Maya Chen", updated: "12 min ago" },
  { name: "Harborline Logistics", ref: "HBL-2026-004", facilities: 1, actual: "BREACHED", cases: 1, owner: "Maya Chen", updated: "48 min ago" },
  { name: "Morrow Foods Group", ref: "MFG-2026-002", facilities: 1, actual: "INDETERMINATE", cases: 0, owner: "Jon Bell", updated: "2 hr ago" },
  { name: "Atlas Field Services", ref: "AFS-2026-003", facilities: 1, actual: "COMPLIANT", cases: 0, owner: "Priya Raman", updated: "Yesterday" },
];

export default function BorrowersPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Portfolio"
        title="Borrowers"
        description="Synthetic borrower records used to exercise the facility, document, covenant and approval workflow."
        actions={
          <>
            <button
              type="button"
              disabled
              title="Borrower creation is wired in Phase 3"
              className="inline-flex cursor-not-allowed items-center gap-2 rounded-full border border-line bg-paper px-4 py-2.5 text-xs font-semibold text-muted opacity-60"
            >
              <Plus className="size-3.5" /> New borrower
            </button>
            <Link
              href="/facilities"
              className="inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2.5 text-xs font-semibold text-paper transition hover:bg-ink-soft"
            >
              Facilities <ArrowUpRight className="size-3.5" />
            </Link>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {borrowers.map((borrower) => (
          <article key={borrower.ref} className="rounded-3xl border border-line bg-paper p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">{borrower.ref}</p>
                <h2 className="mt-2 text-lg font-semibold leading-tight">{borrower.name}</h2>
              </div>
              <StatusBadge>{borrower.actual}</StatusBadge>
            </div>
            <dl className="mt-5 grid grid-cols-2 gap-3 border-t border-line pt-4 text-xs">
              <div>
                <dt className="text-muted">Facilities</dt>
                <dd className="mt-1 font-semibold">{borrower.facilities}</dd>
              </div>
              <div>
                <dt className="text-muted">Open cases</dt>
                <dd className="mt-1 font-semibold">{borrower.cases}</dd>
              </div>
              <div>
                <dt className="text-muted">Owner</dt>
                <dd className="mt-1 font-semibold">{borrower.owner}</dd>
              </div>
              <div>
                <dt className="text-muted">Updated</dt>
                <dd className="mt-1 font-semibold">{borrower.updated}</dd>
              </div>
            </dl>
            <Link
              href="/facilities/demo"
              className="mt-5 inline-flex items-center gap-1 text-xs font-semibold underline decoration-line underline-offset-4 hover:text-ink"
            >
              Open facility <ArrowUpRight className="size-3.5" />
            </Link>
          </article>
        ))}
      </div>

      <section className="overflow-hidden rounded-3xl border border-line bg-paper">
        <div className="border-b border-line px-5 py-5 sm:px-7">
          <SectionLabel>Register</SectionLabel>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight">Borrower and facility map</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[780px] text-left text-sm">
            <thead>
              <tr className="border-b border-line text-[10px] uppercase tracking-[0.14em] text-muted">
                <th className="px-5 py-3 font-semibold sm:px-7">Borrower</th>
                <th className="px-3 py-3 font-semibold">Facility</th>
                <th className="px-3 py-3 font-semibold">Actual</th>
                <th className="px-3 py-3 font-semibold">Test date</th>
                <th className="px-5 py-3 font-semibold sm:px-7">Run</th>
              </tr>
            </thead>
            <tbody>
              {demoRuns.map((run) => (
                <tr key={run.id} className="border-b border-line/70 last:border-0">
                  <td className="px-5 py-4 sm:px-7">
                    <span className="font-semibold">{run.borrower}</span>
                    <span className="mt-0.5 block text-xs text-muted">{run.reference}</span>
                  </td>
                  <td className="px-3 py-4 text-xs">{run.facility}</td>
                  <td className="px-3 py-4">
                    <StatusBadge>{run.actual}</StatusBadge>
                  </td>
                  <td className="px-3 py-4 text-xs text-muted">{run.testDate}</td>
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
      </section>
    </div>
  );
}
