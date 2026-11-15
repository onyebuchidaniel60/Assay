import Link from "next/link";
import { ArrowLeft, ArrowUpRight, CheckCircle2, FileText, ShieldCheck } from "lucide-react";
import { PageHeader, PlaceholderNote, SectionLabel } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";

export const metadata = { title: "Covenant detail" };

export default function CovenantDetailPage() {
  return (
    <div className="space-y-8">
      <Link href="/covenants" className="inline-flex items-center gap-2 text-xs font-semibold text-muted hover:text-ink">
        <ArrowLeft className="size-3.5" /> Covenant register
      </Link>
      <PageHeader
        eyebrow="Northwind Components Ltd. · Term Loan A"
        title="Maximum leverage"
        description="Contract-specific maximum Debt / Adjusted EBITDA definition, approved version, source clause and current assessment links."
        actions={
          <>
            <StatusBadge tone="positive">ACTIVE · v1</StatusBadge>
            <Link href="/analysis-runs/run-northwind-q3" className="inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2.5 text-xs font-semibold text-paper hover:bg-ink-soft">
              Open latest run <ArrowUpRight className="size-3.5" />
            </Link>
          </>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
        <section className="rounded-3xl border border-line bg-paper p-5 sm:p-7">
          <SectionLabel>Approved formula</SectionLabel>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight">gross_debt / ltm_ebitda ≤ 3.50x</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-line bg-white/50 p-4">
              <p className="text-[10px] uppercase tracking-[0.14em] text-muted">Numerator</p>
              <p className="mt-2 font-mono text-lg font-semibold">gross_debt</p>
              <p className="mt-1 text-xs text-muted">Debt at test date</p>
            </div>
            <div className="rounded-2xl border border-line bg-white/50 p-4">
              <p className="text-[10px] uppercase tracking-[0.14em] text-muted">Denominator</p>
              <p className="mt-2 font-mono text-lg font-semibold">ltm_ebitda</p>
              <p className="mt-1 text-xs text-muted">LTM ending test date</p>
            </div>
            <div className="rounded-2xl bg-ink p-4 text-paper">
              <p className="text-[10px] uppercase tracking-[0.14em] text-white/50">Threshold</p>
              <p className="mt-2 font-mono text-lg font-semibold text-acid">≤ 3.50x</p>
              <p className="mt-1 text-xs text-white/50">No invented tolerance</p>
            </div>
          </div>

          <div className="mt-7 border-t border-line pt-6">
            <div className="flex items-center gap-2">
              <FileText className="size-4 text-muted" />
              <SectionLabel>Source clause</SectionLabel>
            </div>
            <blockquote className="mt-4 border-l-2 border-acid pl-4 text-sm leading-7 text-ink-soft">
              “The Borrower shall ensure that, as of the last day of each Test Period, the Consolidated Total Debt to Consolidated EBITDA ratio does not exceed 3.50:1.00.”
            </blockquote>
            <p className="mt-3 text-xs text-muted">Credit Agreement · page 12 · quote validated against parsed text · effective 01 Jan 2026</p>
          </div>

          <div className="mt-7 border-t border-line pt-6">
            <SectionLabel>Evidence inputs</SectionLabel>
            <div className="mt-3 divide-y divide-line">
              {[
                ["gross_debt", "$32,000,000.00", "Debt schedule · page 2", "CONFIRMED"],
                ["ltm_ebitda", "$10,000,000.00", "Q3 statement · page 8", "CONFIRMED"],
              ].map(([metric, value, source, state]) => (
                <div key={metric} className="flex flex-col gap-2 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-mono text-sm font-semibold">{metric}</p>
                    <p className="mt-0.5 text-xs text-muted">{source}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm">{value}</span>
                    <StatusBadge>{state}</StatusBadge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <aside className="space-y-4">
          <section className="rounded-3xl bg-ink p-5 text-paper sm:p-6">
            <SectionLabel><span className="text-white/50">Latest actual</span></SectionLabel>
            <p className="mt-4 font-mono text-5xl font-semibold">3.20x</p>
            <p className="mt-2 text-sm text-white/60">COMPLIANT · verified</p>
            <div className="mt-5 space-y-2 border-t border-white/10 pt-4 text-xs text-white/60">
              <p className="flex items-center gap-2"><CheckCircle2 className="size-3.5 text-acid" /> Independent recompute passed</p>
              <p className="flex items-center gap-2"><CheckCircle2 className="size-3.5 text-acid" /> Proof bound to input snapshot</p>
              <p className="flex items-center gap-2"><CheckCircle2 className="size-3.5 text-acid" /> Audit event persisted</p>
            </div>
            <Link href="/analysis-runs/run-northwind-q3" className="mt-5 inline-flex items-center gap-2 rounded-full bg-acid px-4 py-2.5 text-xs font-bold text-ink hover:bg-acid-soft">
              Inspect run <ArrowUpRight className="size-3.5" />
            </Link>
          </section>
          <section className="rounded-3xl border border-line bg-paper p-5">
            <SectionLabel>Forecast — separate</SectionLabel>
            <p className="mt-3 font-mono text-3xl font-semibold">3.63x</p>
            <StatusBadge tone="warning" className="mt-2">AT RISK</StatusBadge>
            <p className="mt-3 text-xs leading-5 text-muted">Scenario only. It cannot change the actual compliance status or create a breach case.</p>
          </section>
          <section className="rounded-3xl border border-line bg-paper p-5">
            <SectionLabel>Version history</SectionLabel>
            <div className="mt-3 space-y-3 text-xs">
              <div className="flex items-center justify-between"><span>v1 · active</span><StatusBadge tone="positive">APPROVED</StatusBadge></div>
              <div className="flex items-center justify-between text-muted"><span>Effective 01 Jan 2026</span><span>Manager</span></div>
            </div>
            <Link href="/approvals" className="mt-4 inline-flex items-center gap-1 text-xs font-semibold underline decoration-line underline-offset-4 hover:text-ink">Approval evidence <ArrowUpRight className="size-3.5" /></Link>
          </section>
        </aside>
      </div>

      <PlaceholderNote>
        Formula editing, source-quote validation and manager activation are wired in Phase 3. This page shows the approved snapshot and evidence shape without accepting mutations.
      </PlaceholderNote>
    </div>
  );
}
