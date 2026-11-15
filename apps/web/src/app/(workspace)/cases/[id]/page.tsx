import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight, Clock3, FileText } from "lucide-react";
import { PageHeader, PlaceholderNote, SectionLabel } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";

export const metadata = { title: "Case detail" };

const caseData = {
  id: "case-harborline",
  title: "Maximum leverage threshold exceeded",
  borrower: "Harborline Logistics",
  assessment: "run-harbor-q3",
  severity: "HIGH",
  status: "INVESTIGATING",
  owner: "Maya Chen",
  due: "20 Nov 2026",
};

const notes = [
  ["15 Nov 2026 · 10:02", "Maya Chen", "Opened investigation. Verified actual leverage 3.70x against the 3.50x maximum. Requesting updated debt schedule from the borrower file."],
  ["15 Nov 2026 · 10:18", "Jon Bell", "Cross-checked the synthetic debt schedule against the confirmed evidence snapshot. The excess is driven by the $5m revolver draw, not an EBITDA adjustment."],
];

export default async function CaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (id !== caseData.id) notFound();

  return (
    <div className="space-y-8">
      <Link href="/cases" className="inline-flex items-center gap-2 text-xs font-semibold text-muted hover:text-ink">
        <ArrowLeft className="size-3.5" /> Exception cases
      </Link>
      <PageHeader
        eyebrow={`${caseData.borrower} · ${caseData.id}`}
        title={caseData.title}
        description="Structured investigation, append-only notes and resolution evidence. No external notices or legal actions are available in the MVP."
        actions={
          <>
            <StatusBadge tone="danger">{caseData.severity}</StatusBadge>
            <StatusBadge>{caseData.status}</StatusBadge>
            <Link href={`/analysis-runs/${caseData.assessment}`} className="inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2.5 text-xs font-semibold text-paper hover:bg-ink-soft">
              Source assessment <ArrowUpRight className="size-3.5" />
            </Link>
          </>
        }
      />
      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-3xl border border-line bg-paper p-5 sm:p-7">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <SectionLabel>Investigation</SectionLabel>
            <span className="inline-flex items-center gap-1 text-xs text-muted"><Clock3 className="size-3.5" /> Due {caseData.due}</span>
          </div>
          <div className="mt-5 divide-y divide-line">
            {notes.map(([time, author, body]) => (
              <div key={time} className="py-5 first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                  <span className="font-semibold text-ink">{author}</span>
                  <span>·</span>
                  <span>{time}</span>
                  <StatusBadge tone="neutral">Internal note</StatusBadge>
                </div>
                <p className="mt-2 text-sm leading-6 text-ink-soft">{body}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 rounded-2xl border border-dashed border-ink/20 bg-white/40 p-4 text-xs text-muted">
            Note entry, assignment and controlled state transitions are wired in Phase 3. This preview is read-only.
          </div>
        </section>
        <aside className="space-y-4">
          <section className="rounded-3xl bg-ink p-5 text-paper">
            <SectionLabel><span className="text-white/50">Resolution controls</span></SectionLabel>
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between"><span className="text-white/60">Owner</span><span>{caseData.owner}</span></div>
              <div className="flex items-center justify-between"><span className="text-white/60">Severity</span><span>{caseData.severity}</span></div>
              <div className="flex items-center justify-between"><span className="text-white/60">Status</span><span>{caseData.status}</span></div>
            </div>
            <div className="mt-5 border-t border-white/10 pt-4 text-xs leading-5 text-white/50">
              Closing requires a manager role, a resolution code and an explanation. No external borrower communication is sent.
            </div>
          </section>
          <section className="rounded-3xl border border-line bg-paper p-5">
            <SectionLabel>Evidence</SectionLabel>
            <div className="mt-3 flex items-start gap-3">
              <span className="grid size-9 place-items-center rounded-full border border-line bg-white/50"><FileText className="size-4" /></span>
              <div>
                <p className="text-sm font-semibold">Debt schedule v2</p>
                <p className="mt-0.5 text-xs text-muted">Confirmed evidence · page 2</p>
              </div>
            </div>
            <Link href="/analysis-runs/run-harbor-q3" className="mt-4 inline-flex items-center gap-1 text-xs font-semibold underline decoration-line underline-offset-4 hover:text-ink">Inspect snapshot <ArrowUpRight className="size-3.5" /></Link>
          </section>
        </aside>
      </div>
      <PlaceholderNote>Case state transitions, memo drafting and approval are implemented in Phase 3; no resolution or external action is recorded here.</PlaceholderNote>
    </div>
  );
}
