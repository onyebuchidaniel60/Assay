import Link from "next/link";
import { ArrowUpRight, Building2, FileText, Scale } from "lucide-react";
import { PageHeader, SectionLabel } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";

export const metadata = { title: "Facilities" };

const facilities = [
  { id: "demo", borrower: "Northwind Components Ltd.", name: "Term Loan A", ref: "FAC-001", currency: "USD", commitment: "$50,000,000", maturity: "31 Dec 2030", covenant: "≤ 3.50x", state: "Active", actual: "COMPLIANT" },
  { id: "harborline", borrower: "Harborline Logistics", name: "Revolver", ref: "FAC-004", currency: "USD", commitment: "$30,000,000", maturity: "30 Jun 2029", covenant: "≤ 3.50x", state: "Active", actual: "BREACHED" },
  { id: "morrow", borrower: "Morrow Foods Group", name: "Term Loan B", ref: "FAC-002", currency: "USD", commitment: "$42,000,000", maturity: "31 Mar 2031", covenant: "≤ 4.00x", state: "Active", actual: "INDETERMINATE" },
];

export default function FacilitiesPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Portfolio"
        title="Facilities"
        description="Credit facilities, their active covenant definitions and the latest actual assessment. Forecast risk is tracked separately."
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
              <StatusBadge>{facility.actual}</StatusBadge>
            </div>
            <p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">{facility.borrower}</p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight group-hover:underline group-hover:decoration-ink/25 group-hover:underline-offset-4">
              {facility.name}
            </h2>
            <dl className="mt-5 grid grid-cols-2 gap-3 border-t border-line pt-4 text-xs">
              <div><dt className="text-muted">Commitment</dt><dd className="mt-1 font-semibold">{facility.commitment}</dd></div>
              <div><dt className="text-muted">Maturity</dt><dd className="mt-1 font-semibold">{facility.maturity}</dd></div>
              <div><dt className="text-muted">Covenant</dt><dd className="mt-1 font-mono font-semibold">{facility.covenant}</dd></div>
              <div><dt className="text-muted">Status</dt><dd className="mt-1 font-semibold">{facility.state}</dd></div>
            </dl>
          </Link>
        ))}
      </div>

      <section className="overflow-hidden rounded-3xl border border-line bg-paper">
        <div className="border-b border-line px-5 py-5 sm:px-7">
          <SectionLabel>Commitments</SectionLabel>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight">Facility register</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[840px] text-left text-sm">
            <thead>
              <tr className="border-b border-line text-[10px] uppercase tracking-[0.14em] text-muted">
                <th className="px-5 py-3 font-semibold sm:px-7">Borrower / facility</th>
                <th className="px-3 py-3 font-semibold">Reference</th>
                <th className="px-3 py-3 font-semibold">Currency</th>
                <th className="px-3 py-3 font-semibold">Commitment</th>
                <th className="px-3 py-3 font-semibold">Covenant</th>
                <th className="px-3 py-3 font-semibold">Actual</th>
                <th className="px-5 py-3 font-semibold sm:px-7">Documents</th>
              </tr>
            </thead>
            <tbody>
              {facilities.map((facility) => (
                <tr key={facility.id} className="border-b border-line/70 last:border-0">
                  <td className="px-5 py-4 sm:px-7">
                    <Link href={`/facilities/${facility.id}`} className="font-semibold hover:underline hover:underline-offset-4">
                      {facility.name}
                    </Link>
                    <span className="mt-0.5 block text-xs text-muted">{facility.borrower}</span>
                  </td>
                  <td className="px-3 py-4 font-mono text-xs">{facility.ref}</td>
                  <td className="px-3 py-4 text-xs">{facility.currency}</td>
                  <td className="px-3 py-4 text-xs">{facility.commitment}</td>
                  <td className="px-3 py-4 font-mono text-xs">{facility.covenant}</td>
                  <td className="px-3 py-4"><StatusBadge>{facility.actual}</StatusBadge></td>
                  <td className="px-5 py-4 sm:px-7">
                    <Link href={`/facilities/${facility.id}#documents`} className="inline-flex items-center gap-1 text-xs font-semibold text-muted hover:text-ink">
                      <FileText className="size-3.5" /> View
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
