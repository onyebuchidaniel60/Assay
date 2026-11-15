import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, ChevronRight, CircleDollarSign, FileCheck2, ShieldAlert, Sparkles } from "lucide-react";
import { PageHeader, SectionLabel } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { attentionItems, demoRuns, pipeline } from "@/lib/demo-data";

export const metadata = { title: "Overview" };

const metrics = [
  { label: "Active facilities", value: "12", detail: "+2 this quarter", icon: FileCheck2, tone: "neutral" as const },
  { label: "Verified compliant", value: "8", detail: "Actual results only", icon: ShieldAlert, tone: "positive" as const },
  { label: "Actual breaches", value: "1", detail: "Harborline · 3.70x", icon: CircleDollarSign, tone: "danger" as const },
  { label: "Scenario at risk", value: "3", detail: "Not actual breach", icon: Sparkles, tone: "warning" as const },
];

export default function DashboardPage() {
  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow="Credit operations · 15 November 2026"
        title="Every covenant, one review trail."
        description="A synthetic portfolio view of the covenant workflow: source-linked extraction, deterministic leverage, proof-backed compliance and manager approval."
        actions={
          <>
            <Link
              href="/borrowers"
              className="inline-flex items-center gap-2 rounded-full border border-line bg-paper px-4 py-2.5 text-xs font-semibold text-ink transition hover:bg-white"
            >
              View borrowers <ArrowUpRight className="size-3.5" />
            </Link>
            <Link
              href="/analysis-runs"
              className="inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2.5 text-xs font-semibold text-paper transition hover:bg-ink-soft"
            >
              Open analysis queue <ChevronRight className="size-3.5" />
            </Link>
          </>
        }
      />

      <section aria-labelledby="portfolio-metrics" className="grid gap-px overflow-hidden rounded-3xl border border-line bg-line sm:grid-cols-2 xl:grid-cols-4">
        <h2 id="portfolio-metrics" className="sr-only">
          Portfolio metrics
        </h2>
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <div key={metric.label} className="bg-paper p-5 sm:p-6">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">{metric.label}</p>
                <Icon className="size-4 text-muted" />
              </div>
              <p className="mt-5 text-4xl font-semibold tracking-tight">{metric.value}</p>
              <div className="mt-3">
                <StatusBadge tone={metric.tone}>{metric.detail}</StatusBadge>
              </div>
            </div>
          );
        })}
      </section>

      <div className="grid gap-8 xl:grid-cols-[1.5fr_0.8fr]">
        <section aria-labelledby="attention" className="rounded-3xl border border-line bg-paper p-5 sm:p-7">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <SectionLabel>Needs attention</SectionLabel>
              <h2 id="attention" className="mt-2 text-3xl font-semibold tracking-tight">
                Exception queue
              </h2>
            </div>
            <Link href="/analysis-runs" className="text-xs font-semibold text-muted underline decoration-line underline-offset-4 hover:text-ink">
              All runs
            </Link>
          </div>

          <div className="mt-6 divide-y divide-line">
            {attentionItems.map((item) => (
              <Link
                key={item.title}
                href={item.href}
                className="group flex items-start gap-4 py-5 transition first:pt-0 last:pb-0"
              >
                <span
                  className={`mt-1.5 size-2.5 shrink-0 rounded-full ${
                    item.tone === "danger" ? "bg-danger" : item.tone === "warning" ? "bg-warning" : "bg-muted"
                  }`}
                  aria-hidden
                />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold group-hover:underline group-hover:decoration-ink/30 group-hover:underline-offset-4">
                      {item.title}
                    </span>
                    <StatusBadge tone={item.tone}>{item.tone === "danger" ? "Actual" : item.tone === "warning" ? "Forecast" : "Stale"}</StatusBadge>
                  </span>
                  <span className="mt-1.5 block text-sm leading-6 text-muted">{item.detail}</span>
                </span>
                <ChevronRight className="mt-1 size-4 shrink-0 text-muted transition group-hover:translate-x-0.5 group-hover:text-ink" />
              </Link>
            ))}
          </div>
        </section>

        <aside className="space-y-4">
          <section className="rounded-3xl bg-ink p-5 text-paper sm:p-7">
            <div className="flex items-center justify-between">
              <SectionLabel>
                <span className="text-white/50">Control sequence</span>
              </SectionLabel>
              <StatusBadge tone="proof">4 gates</StatusBadge>
            </div>
            <h2 className="display mt-4 text-3xl font-semibold">The review does not skip steps.</h2>
            <div className="mt-6 space-y-4">
              {pipeline.map((step) => (
                <div key={step.step} className="flex gap-3 border-t border-white/10 pt-4 first:border-0 first:pt-0">
                  <span className="text-[10px] font-semibold tracking-[0.16em] text-acid">{step.step}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">{step.label}</p>
                    <p className="mt-0.5 text-xs text-white/50">
                      {step.state} · {step.detail}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <Link
              href="/analysis-runs/run-northwind-q3"
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-acid px-4 py-2.5 text-xs font-bold text-ink transition hover:bg-acid-soft"
            >
              Inspect a verified run <ArrowUpRight className="size-3.5" />
            </Link>
          </section>

          <section className="rounded-3xl border border-line bg-paper p-5 sm:p-6">
            <SectionLabel>This period</SectionLabel>
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted">Pending approvals</span>
                <span className="font-semibold">2</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted">Open cases</span>
                <span className="font-semibold">1</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted">Stale evidence</span>
                <span className="font-semibold">1</span>
              </div>
              <div className="flex items-center justify-between border-t border-line pt-3">
                <span className="text-muted">Audit chain</span>
                <StatusBadge tone="positive">Verified</StatusBadge>
              </div>
            </div>
            <Link href="/audit" className="mt-5 inline-flex items-center gap-1 text-xs font-semibold underline decoration-line underline-offset-4 hover:text-ink">
              Verify audit chain <ArrowUpRight className="size-3.5" />
            </Link>
          </section>
        </aside>
      </div>

      <section aria-labelledby="archive" className="overflow-hidden rounded-3xl border border-line bg-paper">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line px-5 py-5 sm:px-7">
          <div>
            <SectionLabel>Analysis archive</SectionLabel>
            <h2 id="archive" className="mt-2 text-3xl font-semibold tracking-tight">
              Recent covenant runs
            </h2>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted">
            <span className="hidden items-center gap-1 sm:inline-flex">
              <ArrowUpRight className="size-3.5" /> Actual and forecast are separate dimensions
            </span>
            <Link href="/analysis-runs" className="font-semibold text-ink underline decoration-line underline-offset-4">
              Open queue
            </Link>
          </div>
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[860px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-line bg-ink/[0.02] text-[10px] uppercase tracking-[0.14em] text-muted">
                <th className="px-5 py-3 font-semibold sm:px-7">Borrower / facility</th>
                <th className="px-3 py-3 font-semibold">Actual</th>
                <th className="px-3 py-3 font-semibold">Forecast</th>
                <th className="px-3 py-3 font-semibold">Leverage</th>
                <th className="px-3 py-3 font-semibold">Verification</th>
                <th className="px-3 py-3 font-semibold">Test date</th>
                <th className="px-5 py-3 font-semibold sm:px-7">Owner</th>
              </tr>
            </thead>
            <tbody>
              {demoRuns.map((run) => (
                <tr key={run.id} className="border-b border-line/70 transition last:border-0 hover:bg-white/40">
                  <td className="px-5 py-4 sm:px-7">
                    <Link href={`/analysis-runs/${run.id}`} className="group block">
                      <span className="block font-semibold group-hover:underline group-hover:underline-offset-4">{run.borrower}</span>
                      <span className="mt-0.5 block text-xs text-muted">
                        {run.facility} · {run.reference}
                      </span>
                    </Link>
                  </td>
                  <td className="px-3 py-4">
                    <StatusBadge>{run.actual}</StatusBadge>
                  </td>
                  <td className="px-3 py-4">
                    <StatusBadge>{run.forecast}</StatusBadge>
                  </td>
                  <td className="px-3 py-4">
                    <span className="font-mono text-xs font-semibold">{run.leverage}</span>
                    <span className="mt-0.5 block text-[10px] text-muted">{run.threshold}</span>
                  </td>
                  <td className="px-3 py-4">
                    <StatusBadge>{run.verification}</StatusBadge>
                  </td>
                  <td className="px-3 py-4 text-xs text-muted">{run.testDate}</td>
                  <td className="px-5 py-4 text-xs sm:px-7">
                    <span className="font-medium">{run.owner}</span>
                    <span className="mt-0.5 block text-[10px] text-muted">{run.updated}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="divide-y divide-line md:hidden">
          {demoRuns.map((run) => (
            <Link key={run.id} href={`/analysis-runs/${run.id}`} className="block p-5 transition hover:bg-white/40">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{run.borrower}</p>
                  <p className="mt-0.5 text-xs text-muted">
                    {run.facility} · {run.testDate}
                  </p>
                </div>
                <StatusBadge>{run.actual}</StatusBadge>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <StatusBadge>{run.forecast}</StatusBadge>
                <span className="font-mono text-xs font-semibold">{run.leverage}</span>
                <span className="text-xs text-muted">{run.threshold}</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <div className="flex flex-col gap-3 rounded-2xl border border-dashed border-ink/20 bg-paper/40 px-4 py-3 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
        <span>
          <span className="font-semibold text-ink">Phase 1 preview shell.</span> Route structure, responsive layout and read-only synthetic views are live.
          Data wiring, auth, provider calls and proof generation arrive in later phases.
        </span>
        <Link href="/integrations" className="inline-flex shrink-0 items-center gap-1 font-semibold text-ink underline decoration-line underline-offset-4">
          Provider status <ArrowDownRight className="size-3.5" />
        </Link>
      </div>
    </div>
  );
}
