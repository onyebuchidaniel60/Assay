import Link from "next/link";
import { ArrowUpRight, CheckCircle2, Hash, ShieldCheck } from "lucide-react";
import { PageHeader, PlaceholderNote, SectionLabel } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";

export const metadata = { title: "Audit trail" };

const events = [
  { seq: "0187", time: "15 Nov 2026 · 09:41", actor: "Maya Chen", action: "APPROVAL_REQUESTED", entity: "memo_draft v1", hash: "7a1c…9e2f" },
  { seq: "0186", time: "15 Nov 2026 · 09:38", actor: "Maya Chen", action: "ASSESSMENT_VERIFIED", entity: "run-northwind-q3", hash: "41bd…0c7a" },
  { seq: "0185", time: "15 Nov 2026 · 09:36", actor: "SYSTEM", action: "PROOF_VERIFIED", entity: "circuit-v1", hash: "d03e…6b18" },
  { seq: "0184", time: "15 Nov 2026 · 09:35", actor: "Maya Chen", action: "FINANCIALS_CONFIRMED", entity: "gross_debt · evidence_01", hash: "b31c…9e0d" },
  { seq: "0183", time: "15 Nov 2026 · 09:32", actor: "SYSTEM", action: "EVIDENCE_SUGGESTED", entity: "ltm_ebitda · evidence_02", hash: "77bd…01aa" },
  { seq: "0182", time: "15 Nov 2026 · 09:20", actor: "Priya Raman", action: "COVENANT_ACTIVATED", entity: "covenant v1", hash: "9f2a…c41e" },
];

export default async function AuditPage({ searchParams }: { searchParams: Promise<{ verify?: string }> }) {
  const { verify } = await searchParams;
  const verified = verify === "1";

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Evidence chain"
        title="Audit trail"
        description="A preview of the per-borrower sequence, actor, action, entity and hash prefix. The chain is signed and tamper-evident, not immutable against a fully compromised key."
        actions={
          <Link
            href={verified ? "/audit" : "/audit?verify=1"}
            className={`inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-xs font-semibold transition ${
              verified ? "border border-line bg-paper text-ink hover:bg-white" : "bg-ink text-paper hover:bg-ink-soft"
            }`}
          >
            <ShieldCheck className="size-3.5" /> {verified ? "Reset fixture" : "Run chain check"}
          </Link>
        }
      />

      {verified ? (
        <div className="flex items-start gap-3 rounded-2xl border border-positive/25 bg-positive/10 p-4 text-sm text-positive">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
          <div>
            <p className="font-semibold">Fixture chain check complete — 6 events checked.</p>
            <p className="mt-1 text-positive/80">This preview uses synthetic hash prefixes. Live signature and sequence verification arrive in Phase 3.</p>
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-line bg-paper p-5">
          <p className="text-[10px] uppercase tracking-[0.16em] text-muted">Events</p>
          <p className="mt-3 text-3xl font-semibold">187</p>
        </div>
        <div className="rounded-2xl border border-line bg-paper p-5">
          <p className="text-[10px] uppercase tracking-[0.16em] text-muted">Chain head</p>
          <p className="mt-3 font-mono text-sm font-semibold">7a1c…9e2f</p>
        </div>
        <div className="rounded-2xl border border-line bg-paper p-5">
          <p className="text-[10px] uppercase tracking-[0.16em] text-muted">Verification</p>
          <div className="mt-3"><StatusBadge tone={verified ? "positive" : "neutral"}>{verified ? "FIXTURE VERIFIED" : "NOT RUN"}</StatusBadge></div>
        </div>
      </div>

      <section className="overflow-hidden rounded-3xl border border-line bg-paper">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line px-5 py-5 sm:px-7">
          <div>
            <SectionLabel>Event stream</SectionLabel>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">Northwind Components</h2>
          </div>
          <span className="inline-flex items-center gap-1 text-xs text-muted"><Hash className="size-3.5" /> hash prefixes truncated</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead>
              <tr className="border-b border-line text-[10px] uppercase tracking-[0.14em] text-muted">
                <th className="px-5 py-3 font-semibold sm:px-7">Seq</th>
                <th className="px-3 py-3 font-semibold">Time</th>
                <th className="px-3 py-3 font-semibold">Actor</th>
                <th className="px-3 py-3 font-semibold">Action</th>
                <th className="px-3 py-3 font-semibold">Entity</th>
                <th className="px-5 py-3 font-semibold sm:px-7">Hash</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <tr key={event.seq} className="border-b border-line/70 last:border-0">
                  <td className="px-5 py-3 font-mono text-xs sm:px-7">{event.seq}</td>
                  <td className="px-3 py-3 text-xs text-muted">{event.time}</td>
                  <td className="px-3 py-3 text-xs">{event.actor}</td>
                  <td className="px-3 py-3 text-xs font-medium">{event.action}</td>
                  <td className="px-3 py-3 text-xs text-muted">{event.entity}</td>
                  <td className="px-5 py-3 font-mono text-xs sm:px-7">{event.hash}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="flex flex-col gap-3 rounded-2xl border border-dashed border-ink/20 bg-paper/40 p-4 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
        <span>Audit events are append-only and hash-linked. Do not call the chain immutable; it is tamper-evident.</span>
        <Link href="/analysis-runs/run-northwind-q3" className="inline-flex shrink-0 items-center gap-1 font-semibold text-ink underline decoration-line underline-offset-4">
          Inspect source run <ArrowUpRight className="size-3.5" />
        </Link>
      </div>
      <PlaceholderNote>Live chain verification, signature validation and scoped audit queries are implemented in Phase 3.</PlaceholderNote>
    </div>
  );
}
