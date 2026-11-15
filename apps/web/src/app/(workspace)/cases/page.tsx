import Link from "next/link";
import { ArrowUpRight, Plus } from "lucide-react";
import { PageHeader, SectionLabel } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";

export const metadata = { title: "Exception cases" };

const cases = [
  { id: "case-harborline", title: "Maximum leverage threshold exceeded", borrower: "Harborline Logistics", type: "BREACH", severity: "HIGH", status: "INVESTIGATING", owner: "Maya Chen", due: "20 Nov 2026" },
  { id: "case-morrow", title: "Conflicting debt schedule evidence", borrower: "Morrow Foods Group", type: "CONFLICTING_EVIDENCE", severity: "MEDIUM", status: "AWAITING_INFORMATION", owner: "Jon Bell", due: "24 Nov 2026" },
];

export default function CasesPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Exception workflow"
        title="Cases"
        description="Structured investigation for verified actual breaches, conflicting evidence and contract review. A forecast at-risk scenario cannot create an actual breach case."
        actions={
          <button type="button" disabled title="Case creation is wired in Phase 3" className="inline-flex cursor-not-allowed items-center gap-2 rounded-full border border-line bg-paper px-4 py-2.5 text-xs font-semibold text-muted opacity-60">
            <Plus className="size-3.5" /> New case
          </button>
        }
      />
      <div className="grid gap-4 lg:grid-cols-2">
        {cases.map((item) => (
          <Link key={item.id} href={`/cases/${item.id}`} className="group rounded-3xl border border-line bg-paper p-5 transition hover:border-ink/30 hover:bg-white/60 sm:p-7">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge tone={item.severity === "HIGH" ? "danger" : "warning"}>{item.severity}</StatusBadge>
              <StatusBadge>{item.status}</StatusBadge>
            </div>
            <h2 className="mt-4 text-2xl font-semibold tracking-tight group-hover:underline group-hover:decoration-ink/25 group-hover:underline-offset-4">{item.title}</h2>
            <p className="mt-1 text-sm text-muted">{item.borrower}</p>
            <div className="mt-5 flex flex-wrap gap-4 border-t border-line pt-4 text-xs text-muted">
              <span>{item.type}</span>
              <span>Owner: {item.owner}</span>
              <span>Due: {item.due}</span>
            </div>
          </Link>
        ))}
      </div>
      <section className="rounded-3xl border border-line bg-paper p-5 sm:p-7">
        <SectionLabel>Case rules</SectionLabel>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {[
            ["One active case", "A partial unique rule prevents duplicate active cases for the same assessment and case type."],
            ["Controlled transitions", "Only allow-listed states are accepted; closure requires a reason code, actor and timestamp."],
            ["Evidence preserved", "Cases reference immutable assessment and evidence versions; corrections create new records."],
          ].map(([title, body]) => (
            <div key={title} className="rounded-2xl border border-line bg-white/40 p-4">
              <p className="text-sm font-semibold">{title}</p>
              <p className="mt-1.5 text-xs leading-5 text-muted">{body}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
