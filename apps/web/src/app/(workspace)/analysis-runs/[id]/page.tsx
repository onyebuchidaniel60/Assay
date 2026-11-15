import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight, CheckCircle2, FileText, ShieldCheck, TriangleAlert } from "lucide-react";
import { PageHeader, PlaceholderNote, SectionLabel } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { demoRuns } from "@/lib/demo-data";

export const metadata = { title: "Analysis run" };

export default async function AnalysisRunPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const run = demoRuns.find((item) => item.id === id);
  if (!run) notFound();

  const isBreach = run.actual === "BREACHED";
  const isStale = run.verification === "STALE";
  const isCompliant = run.actual === "COMPLIANT";

  return (
    <div className="space-y-8">
      <Link href="/analysis-runs" className="inline-flex items-center gap-2 text-xs font-semibold text-muted hover:text-ink">
        <ArrowLeft className="size-3.5" /> Analysis queue
      </Link>
      <PageHeader
        eyebrow={`${run.borrower} · ${run.testDate}`}
        title="Covenant assessment"
        description={`${run.facility} · ${run.reference} · snapshot-bound deterministic calculation with an independent verification record.`}
        actions={
          <>
            <StatusBadge>{run.actual}</StatusBadge>
            <StatusBadge>{run.verification}</StatusBadge>
            {isBreach ? (
              <Link href="/cases" className="inline-flex items-center gap-2 rounded-full bg-danger px-4 py-2.5 text-xs font-semibold text-white hover:bg-danger/90">
                Open exception case <ArrowUpRight className="size-3.5" />
              </Link>
            ) : (
              <Link href="/approvals" className="inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2.5 text-xs font-semibold text-paper hover:bg-ink-soft">
                Approval queue <ArrowUpRight className="size-3.5" />
              </Link>
            )}
          </>
        }
      />

      {isStale ? (
        <div className="flex items-start gap-3 rounded-2xl border border-warning/30 bg-warning/10 p-4 text-sm text-warning">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" />
          <div>
            <p className="font-semibold">This snapshot is stale.</p>
            <p className="mt-1 text-warning/80">A material dependency changed after calculation. Approval is blocked until a new assessment is created and verified.</p>
          </div>
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <section className="rounded-3xl border border-line bg-paper p-5 sm:p-7">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <SectionLabel>Deterministic calculation</SectionLabel>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight">Debt / Adjusted EBITDA</h2>
            </div>
            <StatusBadge tone={isBreach ? "danger" : isCompliant ? "positive" : "neutral"}>{run.actual}</StatusBadge>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-line bg-white/50 p-4">
              <p className="text-[10px] uppercase tracking-[0.14em] text-muted">Gross debt</p>
              <p className="mt-2 font-mono text-xl font-semibold">{isBreach ? "$37,000,000.00" : "$32,000,000.00"}</p>
              <p className="mt-1 text-xs text-muted">At test date</p>
            </div>
            <div className="rounded-2xl border border-line bg-white/50 p-4">
              <p className="text-[10px] uppercase tracking-[0.14em] text-muted">LTM EBITDA</p>
              <p className="mt-2 font-mono text-xl font-semibold">$10,000,000.00</p>
              <p className="mt-1 text-xs text-muted">12 months to test date</p>
            </div>
            <div className="rounded-2xl bg-ink p-4 text-paper">
              <p className="text-[10px] uppercase tracking-[0.14em] text-white/50">Ratio</p>
              <p className="mt-2 font-mono text-2xl font-semibold text-acid">{run.leverage}</p>
              <p className="mt-1 text-xs text-white/50">Limit {run.threshold}</p>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-line bg-white/40 p-4 font-mono text-xs leading-6 text-ink-soft">
            <p>ratio = 32,000,000.00 / 10,000,000.00 = 3.20000000</p>
            <p>compliant = 3.20000000 &lt;= 3.50000000 = true</p>
            <p className="text-muted">comparison at full precision · display rounded to 2 decimals only</p>
          </div>

          <div className="mt-7 border-t border-line pt-6">
            <SectionLabel>Evidence provenance</SectionLabel>
            <div className="mt-3 divide-y divide-line">
              {[
                ["gross_debt", isBreach ? "$37,000,000.00" : "$32,000,000.00", "Debt schedule · v2 · page 2", "evidence_01"],
                ["ltm_ebitda", "$10,000,000.00", "Financial statement · v1 · page 8", "evidence_02"],
              ].map(([metric, value, source, idValue]) => (
                <div key={metric} className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3">
                    <span className="grid size-8 shrink-0 place-items-center rounded-full border border-line bg-white/60"><FileText className="size-3.5" /></span>
                    <div>
                      <p className="font-mono text-sm font-semibold">{metric}</p>
                      <p className="mt-0.5 text-xs text-muted">{source} · {idValue}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 pl-11 sm:pl-0">
                    <span className="font-mono text-sm">{value}</span>
                    <StatusBadge tone="positive">CONFIRMED</StatusBadge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <aside className="space-y-4">
          <section className="rounded-3xl bg-ink p-5 text-paper sm:p-6">
            <div className="flex items-center justify-between">
              <SectionLabel><span className="text-white/50">Verification</span></SectionLabel>
              <ShieldCheck className="size-4 text-acid" />
            </div>
            <p className="mt-4 text-2xl font-semibold">{run.verification === "VERIFIED" ? "Independent check passed" : run.verification}</p>
            <div className="mt-5 space-y-3 border-t border-white/10 pt-4 text-xs text-white/60">
              {[
                "Covenant version approved and effective",
                "Formula hash matches approved snapshot",
                "Evidence is confirmed and same facility",
                "Period and currency are compatible",
                "Reference evaluator recomputed the result",
                "Threshold classification is correct",
                "Dependencies are current",
                "Audit event persisted",
              ].map((check) => (
                <p key={check} className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-acid" /> {check}</p>
              ))}
            </div>
            <div className="mt-5 rounded-xl border border-white/10 p-3 text-[10px] leading-5 text-white/50">
              Proof binds the defined compliance predicate to the exact input snapshot. It does not prove source-document authenticity or the accuracy of entered figures.
            </div>
          </section>

          <section className="rounded-3xl border border-line bg-paper p-5">
            <SectionLabel>Forecast scenario — separate</SectionLabel>
            <div className="mt-3 flex items-end justify-between">
              <p className="font-mono text-4xl font-semibold">3.63x</p>
              <StatusBadge tone="warning">AT RISK</StatusBadge>
            </div>
            <p className="mt-3 text-xs leading-5 text-muted">Downside EBITDA (−10%). This is not an actual breach and does not change the actual status.</p>
            <Link href="/analysis-runs/run-northwind-q3" className="mt-4 inline-flex items-center gap-1 text-xs font-semibold underline decoration-line underline-offset-4 hover:text-ink">
              Scenario detail <ArrowUpRight className="size-3.5" />
            </Link>
          </section>

          <section className="rounded-3xl border border-line bg-paper p-5">
            <SectionLabel>Audit references</SectionLabel>
            <div className="mt-3 space-y-2 font-mono text-[10px] leading-5 text-muted">
              <p>run · {run.id}</p>
              <p>snapshot · sha256:7a1c…9e2f</p>
              <p>formula · sha256:41bd…0c7a</p>
              <p>proof · circuit-v1 · verified</p>
            </div>
            <Link href="/audit" className="mt-4 inline-flex items-center gap-1 text-xs font-semibold underline decoration-line underline-offset-4 hover:text-ink">Open audit trail <ArrowUpRight className="size-3.5" /></Link>
          </section>
        </aside>
      </div>

      <PlaceholderNote>
        Calculation, proof generation, verification and approval actions are read-only in this Phase 1 shell. The live API and deterministic engine are implemented in Phases 2–3.
      </PlaceholderNote>
    </div>
  );
}
