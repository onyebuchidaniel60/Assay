import Link from "next/link";
import { ArrowUpRight, Scale } from "lucide-react";
import { PageHeader, SectionLabel } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";

export const metadata = { title: "Covenants" };

const covenants = [
  { id: "demo", borrower: "Northwind Components Ltd.", facility: "Term Loan A", type: "MAX_LEVERAGE", formula: "gross_debt / ltm_ebitda", threshold: "≤ 3.50x", state: "ACTIVE", actual: "COMPLIANT", next: "31 Dec 2026" },
  { id: "harborline", borrower: "Harborline Logistics", facility: "Revolver", type: "MAX_LEVERAGE", formula: "gross_debt / ltm_ebitda", threshold: "≤ 3.50x", state: "ACTIVE", actual: "BREACHED", next: "31 Dec 2026" },
  { id: "morrow", borrower: "Morrow Foods Group", facility: "Term Loan B", type: "MAX_LEVERAGE", formula: "gross_debt / ltm_ebitda", threshold: "≤ 4.00x", state: "NEEDS_REVIEW", actual: "INDETERMINATE", next: "31 Dec 2026" },
];

export default function CovenantsPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Contractual controls"
        title="Covenant register"
        description="One supported covenant family: maximum Debt / Adjusted EBITDA. Definitions are contract-specific, effective-dated and manager-approved."
        actions={
          <Link href="/facilities" className="inline-flex items-center gap-2 rounded-full border border-line bg-paper px-4 py-2.5 text-xs font-semibold text-ink hover:bg-white">
            Facility register <ArrowUpRight className="size-3.5" />
          </Link>
        }
      />
      <div className="rounded-3xl border border-line bg-paper p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-acid"><Scale className="size-4" /></span>
          <div>
            <p className="text-sm font-semibold">One covenant family, deliberately supported</p>
            <p className="mt-1 text-sm leading-6 text-muted">
              The MVP supports a contract-configurable maximum leverage covenant. Unsupported adjustments or ambiguous definitions route to analyst review — they are never inferred.
            </p>
          </div>
        </div>
      </div>
      <section className="overflow-hidden rounded-3xl border border-line bg-paper">
        <div className="border-b border-line px-5 py-5 sm:px-7">
          <SectionLabel>Definitions</SectionLabel>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight">Active and draft covenants</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead>
              <tr className="border-b border-line text-[10px] uppercase tracking-[0.14em] text-muted">
                <th className="px-5 py-3 font-semibold sm:px-7">Borrower / facility</th>
                <th className="px-3 py-3 font-semibold">Type</th>
                <th className="px-3 py-3 font-semibold">Formula</th>
                <th className="px-3 py-3 font-semibold">Threshold</th>
                <th className="px-3 py-3 font-semibold">Definition</th>
                <th className="px-3 py-3 font-semibold">Actual</th>
                <th className="px-5 py-3 font-semibold sm:px-7">Next test</th>
              </tr>
            </thead>
            <tbody>
              {covenants.map((covenant) => (
                <tr key={covenant.id} className="border-b border-line/70 last:border-0">
                  <td className="px-5 py-4 sm:px-7">
                    <Link href={`/covenants/${covenant.id}`} className="font-semibold hover:underline hover:underline-offset-4">{covenant.borrower}</Link>
                    <span className="mt-0.5 block text-xs text-muted">{covenant.facility}</span>
                  </td>
                  <td className="px-3 py-4 text-xs">{covenant.type}</td>
                  <td className="px-3 py-4 font-mono text-xs">{covenant.formula}</td>
                  <td className="px-3 py-4 font-mono text-xs">{covenant.threshold}</td>
                  <td className="px-3 py-4"><StatusBadge>{covenant.state}</StatusBadge></td>
                  <td className="px-3 py-4"><StatusBadge>{covenant.actual}</StatusBadge></td>
                  <td className="px-5 py-4 text-xs text-muted sm:px-7">{covenant.next}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
