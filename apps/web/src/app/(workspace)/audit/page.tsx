import Link from "next/link";
import { CheckCircle2, Hash, ShieldCheck } from "lucide-react";
import { PageHeader, SectionLabel } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { FeedbackBanner } from "@/components/feedback-banner";
import { apiFetch, errorCode, errorMessage, getMe, type ApiEnvelope, type Borrower } from "@/lib/api-server";
import { verifyAuditAction } from "@/lib/actions";
import { formatDateTime } from "@/lib/money";

export const metadata = { title: "Audit trail" };
export const dynamic = "force-dynamic";

type AuditEvent = {
  id: string;
  sequenceNo: number;
  eventType: string;
  actorType: string;
  actorId: string | null;
  actorName: string | null;
  entityType: string;
  entityId: string;
  metadata: Record<string, unknown>;
  previousHash: string;
  eventHash: string;
  signature: string;
  createdAt: string;
  payloadAvailable: boolean;
};

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ borrower?: string; verified?: string; ok?: string; error?: string; message?: string }>;
}) {
  const params = await searchParams;
  let me: Awaited<ReturnType<typeof getMe>> | undefined;
  let borrowers: Borrower[] = [];
  let events: AuditEvent[] = [];
  let selected: Borrower | null = null;
  let loadError: { code: string; message: string } | null = null;
  try {
    const [meData, list] = await Promise.all([getMe(), apiFetch<ApiEnvelope<Borrower[]>>("/v1/borrowers")]);
    me = meData;
    borrowers = list.data;
    selected = borrowers.find((item) => item.id === params.borrower) ?? borrowers[0] ?? null;
    if (selected) {
      events = (
        await apiFetch<ApiEnvelope<AuditEvent[]>>(`/v1/borrowers/${selected.id}/audit-events?limit=200`)
      ).data;
    }
  } catch (error) {
    loadError = { code: errorCode(error), message: errorMessage(error) };
  }
  const verification = params.verified?.split(":") ?? null;
  const chainHead = events.at(-1)?.eventHash;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Evidence chain"
        title="Audit trail"
        description="Per-borrower sequence, actor, action, hash chain and Ed25519 signature. The chain is signed and tamper-evident; it is not claimed to be immutable against a fully compromised signing key."
        actions={
          selected ? (
            <form action={`/audit?borrower=${selected.id}`} method="get" className="flex flex-wrap items-center gap-2">
              <input type="hidden" name="borrower" value={selected.id} />
              <StatusBadge tone="proof">{events.length} EVENTS</StatusBadge>
            </form>
          ) : null
        }
      />
      <FeedbackBanner error={params.error} message={params.message} ok={params.ok} />
      {loadError ? <FeedbackBanner error={loadError.code} message={loadError.message} /> : null}

      {borrowers.length > 0 ? (
        <div className="flex flex-wrap items-end gap-3 rounded-3xl border border-line bg-paper p-5">
          <form method="get" className="flex flex-wrap items-end gap-3">
            <label className="text-xs">
              <span className="mb-1.5 block font-semibold uppercase tracking-[0.12em] text-muted">Borrower</span>
              <select name="borrower" defaultValue={selected?.id} className="min-w-64 rounded-xl border border-line bg-white/60 px-3 py-2.5 text-sm outline-none focus:border-ink">
                {borrowers.map((borrower) => (
                  <option key={borrower.id} value={borrower.id}>{borrower.referenceToken} · {borrower.displayAlias}</option>
                ))}
              </select>
            </label>
            <button type="submit" className="rounded-full border border-line bg-white/60 px-4 py-2.5 text-xs font-semibold text-ink hover:border-ink/30">
              Load chain
            </button>
          </form>
          {selected ? (
            <form action={verifyAuditAction}>
              <input type="hidden" name="borrowerId" value={selected.id} />
              <button type="submit" className="inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2.5 text-xs font-semibold text-paper">
                <ShieldCheck className="size-3.5" /> Verify chain
              </button>
            </form>
          ) : null}
        </div>
      ) : null}

      {verification ? (
        <div
          role="status"
          className={`flex items-start gap-3 rounded-2xl border p-4 text-sm ${
            verification[0] === "VALID"
              ? "border-positive/25 bg-positive/10 text-positive"
              : "border-danger/25 bg-danger/10 text-danger"
          }`}
        >
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
          <div>
            <p className="font-semibold">Chain verification: {verification[0]}</p>
            <p className="mt-1 opacity-80">{verification[1] ?? "0"} events checked for the selected borrower. Signatures and the recomputed hash chain must both pass.</p>
          </div>
        </div>
      ) : null}

      {borrowers.length === 0 && !loadError ? (
        <section className="rounded-3xl border border-dashed border-ink/20 bg-paper p-10 text-center text-sm text-muted">
          Create a synthetic borrower to start an audit chain.
        </section>
      ) : null}

      {selected ? (
        <section className="overflow-hidden rounded-3xl border border-line bg-paper">
          <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line px-5 py-5 sm:px-7">
            <div>
              <SectionLabel>Chain</SectionLabel>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight">{selected.referenceToken}</h2>
            </div>
            <p className="break-all font-mono text-[10px] text-muted">Head {chainHead ?? "GENESIS"}</p>
          </div>
          {events.length === 0 ? (
            <p className="p-6 text-sm text-muted">No events recorded for this borrower.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[880px] text-left text-sm">
                <thead>
                  <tr className="border-b border-line text-[10px] uppercase tracking-[0.14em] text-muted">
                    <th className="px-5 py-3 font-semibold sm:px-7">Seq</th>
                    <th className="px-3 py-3 font-semibold">Event</th>
                    <th className="px-3 py-3 font-semibold">Actor</th>
                    <th className="px-3 py-3 font-semibold">Entity</th>
                    <th className="px-3 py-3 font-semibold">Hash</th>
                    <th className="px-5 py-3 font-semibold sm:px-7">Time (UTC)</th>
                  </tr>
                </thead>
                <tbody>
                  {[...events].reverse().map((event) => (
                    <tr key={event.id} className="border-b border-line/70 last:border-0">
                      <td className="px-5 py-4 font-mono text-xs sm:px-7">{String(event.sequenceNo).padStart(4, "0")}</td>
                      <td className="px-3 py-4">
                        <span className="font-semibold">{event.eventType.replaceAll("_", " ")}</span>
                        <span className="mt-0.5 block text-[10px] text-muted">{event.signature ? "signed" : "unsigned"}</span>
                      </td>
                      <td className="px-3 py-4 text-xs">
                        {event.actorType === "SYSTEM" ? "SYSTEM" : (event.actorName ?? event.actorId?.slice(0, 8))}
                      </td>
                      <td className="px-3 py-4 text-xs text-muted">{event.entityType} · {event.entityId.slice(0, 8)}</td>
                      <td className="px-3 py-4">
                        <span className="inline-flex items-center gap-1 font-mono text-[10px] text-muted"><Hash className="size-3" />{event.eventHash.slice(0, 10)}…</span>
                      </td>
                      <td className="px-5 py-4 text-xs text-muted sm:px-7">{formatDateTime(event.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : null}

      <p className="text-xs leading-5 text-muted">
        Audit payloads are encrypted per borrower. Chain verification never requires decrypting them, so a demo crypto-shred
        can remove the key while the signed sequence remains verifiable.
      </p>
    </div>
  );
}
