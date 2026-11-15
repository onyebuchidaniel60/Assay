import Link from "next/link";
import { ArrowUpRight, Check, Clock3, FileCheck2, X } from "lucide-react";
import { PageHeader, PlaceholderNote, SectionLabel } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";

export const metadata = { title: "Approvals" };

const approvals = [
  {
    id: "apr-northwind",
    action: "APPROVE_MEMO",
    borrower: "Northwind Components Ltd.",
    title: "Q3 covenant review memo",
    requester: "Maya Chen",
    submitted: "Today, 09:41",
    status: "PENDING",
    run: "run-northwind-q3",
    dependencies: "formula v1 · evidence v2 · snapshot 7a1c…9e2f",
  },
  {
    id: "apr-atlas",
    action: "ACTIVATE_COVENANT",
    borrower: "Atlas Field Services",
    title: "Maximum leverage definition v2",
    requester: "Priya Raman",
    submitted: "Yesterday, 16:18",
    status: "PENDING",
    run: "run-atlas-q3",
    dependencies: "source clause v2 · formula hash 41bd…0c7a",
  },
];

export default function ApprovalsPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Maker-checker controls"
        title="Approvals"
        description="Critical actions are bound to exact immutable payloads and dependency versions. A requester cannot approve their own action."
        actions={<StatusBadge tone="proof">2 pending</StatusBadge>}
      />
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          ["Pending", "2", "Manager decision required"],
          ["Approved this week", "5", "Historical, version-bound"],
          ["Invalidated", "1", "Dependency changed"],
        ].map(([label, value, detail]) => (
          <div key={label} className="rounded-2xl border border-line bg-paper p-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">{label}</p>
            <p className="mt-3 text-3xl font-semibold">{value}</p>
            <p className="mt-1 text-xs text-muted">{detail}</p>
          </div>
        ))}
      </div>

      <div className="space-y-4">
        {approvals.map((approval) => (
          <article key={approval.id} className="rounded-3xl border border-line bg-paper p-5 sm:p-7">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge tone="warning">{approval.status}</StatusBadge>
                  <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">{approval.action.replaceAll("_", " ")}</span>
                </div>
                <h2 className="mt-3 text-2xl font-semibold tracking-tight">{approval.title}</h2>
                <p className="mt-1 text-sm text-muted">{approval.borrower}</p>
                <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted">
                  <span className="inline-flex items-center gap-1"><Clock3 className="size-3.5" /> {approval.submitted}</span>
                  <span>Requester: {approval.requester}</span>
                  <span className="font-mono">{approval.dependencies}</span>
                </div>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                <button type="button" disabled title="Approval action is wired in Phase 3" className="inline-flex cursor-not-allowed items-center gap-2 rounded-full border border-line bg-paper px-4 py-2 text-xs font-semibold text-muted opacity-60">
                  <Check className="size-3.5" /> Approve
                </button>
                <button type="button" disabled title="Approval action is wired in Phase 3" className="inline-flex cursor-not-allowed items-center gap-2 rounded-full border border-line bg-paper px-4 py-2 text-xs font-semibold text-muted opacity-60">
                  <X className="size-3.5" /> Reject
                </button>
                <Link href={`/analysis-runs/${approval.run}`} className="inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-xs font-semibold text-paper hover:bg-ink-soft">
                  Exact payload <ArrowUpRight className="size-3.5" />
                </Link>
              </div>
            </div>
            <div className="mt-5 grid gap-3 border-t border-line pt-5 sm:grid-cols-3">
              <div>
                <p className="text-[10px] uppercase tracking-[0.14em] text-muted">Manager view</p>
                <p className="mt-1 text-sm font-medium">Restricted summary</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.14em] text-muted">Proof state</p>
                <p className="mt-1 inline-flex items-center gap-1.5 text-sm font-medium"><FileCheck2 className="size-4 text-positive" /> Verified</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.14em] text-muted">Self-approval</p>
                <p className="mt-1 text-sm font-medium">Blocked by maker-checker</p>
              </div>
            </div>
          </article>
        ))}
      </div>

      <PlaceholderNote>
        Decisions, payload-hash validation, concurrency locks and invalidation are implemented in Phase 3. The preview shows the exact review shape; no approval is recorded.
      </PlaceholderNote>
    </div>
  );
}
