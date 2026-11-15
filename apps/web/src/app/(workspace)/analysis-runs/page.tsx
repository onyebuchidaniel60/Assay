import Link from "next/link";
import { ArrowUpRight, Plus } from "lucide-react";
import { PageHeader, SectionLabel } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { demoRuns } from "@/lib/demo-data";

export const metadata = { title: "Analysis runs" };

export default function AnalysisRunsPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Review queue"
        title="Analysis runs"
        description="Each run is an immutable snapshot of an approved covenant version, confirmed evidence and a deterministic calculation."
        actions={
          <button type="button" disabled title="Run creation is wired in Phase 3" className="inline-flex cursor-not-allowed items-center gap-2 rounded-full border border-line bg-paper px-4 py-2.5 text-xs font-semibold text-muted opacity-60">
            <Plus className="size-3.5" /> New analysis
          </button>
        }
      />
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          ["Actual verified", "8", "Compliant or breached"],
          ["Forecast at risk", "3", "Separate scenario dimension"],
          ["Stale / incomplete", "1", "Blocked from approval"],
        ].map(([label, value, detail]) => (
          <div key={label} className="rounded-2xl border border-line bg-paper p-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">{label}</p>
            <p className="mt-3 text-3xl font-semibold">{value}</p>
            <p className="mt-1 text-xs text-muted">{detail}</p>
          </div>
        ))}
      </div>
      <section className="overflow-hidden rounded-3xl border border-line bg-paper">
        <div className="border-b border-line px-5 py-5 sm:px-7">
          <SectionLabel>Runs</SectionLabel>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight">Latest assessments</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-left text-sm">
            <thead>
              <tr className="border-b border-line text-[10px] uppercase tracking-[0.14em] text-muted">
                <th className="px-5 py-3 font-semibold sm:px-7">Borrower / facility</th>
                <th className="px-3 py-3 font-semibold">Actual</th>
                <th className="px-3 py-3 font-semibold">Forecast</th>
                <th className="px-3 py-3 font-semibold">Ratio</th>
                <th className="px-3 py-3 font-semibold">Verification</th>
                <th className="px-3 py-3 font-semibold">Test date</th>
                <th className="px-5 py-3 font-semibold sm:px-7">Action</th>
              </tr>
            </thead>
            <tbody>
              {demoRuns.map((run) => (
                <tr key={run.id} className="border-b border-line/70 last:border-0">
                  <td className="px-5 py-4 sm:px-7">
                    <Link href={`/analysis-runs/${run.id}`} className="font-semibold hover:underline hover:underline-offset-4">{run.borrower}</Link>
                    <span className="mt-0.5 block text-xs text-muted">{run.facility} · {run.reference}</span>
                  </td>
                  <td className="px-3 py-4"><StatusBadge>{run.actual}</StatusBadge></td>
                  <td className="px-3 py-4"><StatusBadge>{run.forecast}</StatusBadge></td>
                  <td className="px-3 py-4 font-mono text-xs font-semibold">{run.leverage}<span className="mt-0.5 block font-sans text-[10px] font-normal text-muted">{run.threshold}</span></td>
                  <td className="px-3 py-4"><StatusBadge>{run.verification}</StatusBadge></td>
                  <td className="px-3 py-4 text-xs text-muted">{run.testDate}</td>
                  <td className="px-5 py-4 sm:px-7">
                    <Link href={`/analysis-runs/${run.id}`} className="inline-flex items-center gap-1 text-xs font-semibold underline decoration-line underline-offset-4 hover:text-ink">
                      Inspect <ArrowUpRight className="size-3.5" />
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
