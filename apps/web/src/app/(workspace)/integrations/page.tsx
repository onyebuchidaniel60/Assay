import Link from "next/link";
import { ArrowUpRight, CircleAlert, CircleCheck, CircleDashed, PlugZap } from "lucide-react";
import { PageHeader, SectionLabel } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { FeedbackBanner } from "@/components/feedback-banner";
import { apiFetch, errorCode, errorMessage, getMe, type ApiEnvelope } from "@/lib/api-server";

export const metadata = { title: "Integrations" };
export const dynamic = "force-dynamic";

type IntegrationStatus = {
  nearai: { configured: boolean; model: string | null; attestationRequired: boolean };
  openrouter: { configured: boolean; judgementModel: string | null; generationModel: string | null };
  serv: { configured: boolean; model: string | null };
  presidio: { configured: boolean; mode: string };
  storage: { configured: boolean };
  reppo: { enabled: boolean; configured?: boolean; status: string };
  kite: {
    enabled: boolean;
    paymentPath: string;
    providerBlocked: boolean;
    note: string;
    session: { sessionId: string; status: string; asset: string; maxPerTransaction: string; maxTotal: string; spentTotal: string; expiresAt: string };
  };
};

export default async function IntegrationsPage() {
  let me;
  let status: IntegrationStatus | null = null;
  let loadError: { code: string; message: string } | null = null;
  try {
    me = await getMe();
    if (me.user.role === "ANALYST" || me.user.role === "ADMIN") {
      status = (await apiFetch<ApiEnvelope<IntegrationStatus>>("/v1/integrations/status")).data;
    }
  } catch (error) {
    loadError = { code: errorCode(error), message: errorMessage(error) };
  }

  const rows = status
    ? [
        {
          name: "NEAR AI Cloud",
          role: "Layer 2 confidential extraction",
          configured: status.nearai.configured,
          state: status.nearai.configured ? "Attestation required" : "Not configured",
          detail: `${status.nearai.model ?? "No model"} · Intel TDX + NVIDIA NRAS evidence, nonce binding and response ECDSA signature are checked for every extraction.`,
        },
        {
          name: "OpenRouter",
          role: "SERV judgement + generation",
          configured: status.openrouter.configured,
          state: status.openrouter.configured ? "Configured" : "Not configured",
          detail: `Judgement ${status.openrouter.judgementModel ?? "—"} · generation ${status.openrouter.generationModel ?? "—"}. Structured, already-extracted data only.`,
        },
        {
          name: "OpenServ SERV",
          role: "Bounded reasoning orchestration",
          configured: status.serv.configured,
          state: status.serv.configured ? "Configured" : "Not configured",
          detail: `${status.serv.model ?? "No model"}. Deterministic logic remains authoritative; SERV confirms or flags the structured reasoning branch.`,
        },
        {
          name: "Neon / Postgres",
          role: "Canonical data + jobs",
          configured: true,
          state: "Configured · migrated",
          detail: "Postgres is the canonical store and job queue. Workers claim jobs with FOR UPDATE SKIP LOCKED; no Redis or external queue.",
        },
        {
          name: "Private object storage",
          role: "Encrypted document and proof objects",
          configured: status.storage.configured,
          state: status.storage.configured ? "Private bucket" : "Not configured",
          detail: "Ciphertext only, path-style S3-compatible access, checksum calculation WHEN_REQUIRED. No public bucket.",
        },
        {
          name: "Presidio",
          role: "PII detection / tokenization",
          configured: status.presidio.configured,
          state: status.presidio.mode,
          detail: "Reduced mode: en_core_web_sm plus deterministic financial recognizers. Analyst review remains mandatory before any provider call.",
        },
        {
          name: "Reppo Eval Router",
          role: "Synthetic feedback evaluation",
          configured: status.reppo.enabled && (status.reppo.configured ?? true),
          state: status.reppo.status === "live" ? "LIVE" : status.reppo.status === "missing-key" ? "Missing key" : "Disabled",
          detail: "Live endpoint eval.reppo.xyz. Only field-level, de-identified correction traces are submitted after a 50 KB preflight; verdicts stay PENDING/COMPLETED/FAILED exactly as returned.",
        },
        {
          name: "Kite Passport",
          role: "Optional testnet x402 payments",
          configured: status.kite.enabled,
          state: status.kite.providerBlocked ? "Testnet · provider-blocked" : "Testnet",
          detail: `${status.kite.session.asset} · per-payment ${status.kite.session.maxPerTransaction} / total ${status.kite.session.maxTotal}. ${status.kite.note}`,
        },
      ]
    : [];

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Provider boundaries"
        title="Integrations"
        description="Provider state is shown honestly. Missing credentials, disabled integrations and provider failures are never replaced by fixture success."
        actions={<StatusBadge tone={status ? "positive" : "neutral"}>{status ? "LIVE STATUS" : "RESTRICTED"}</StatusBadge>}
      />
      {loadError ? <FeedbackBanner error={loadError.code} message={loadError.message} /> : null}

      {!status && !loadError ? (
        <div className="rounded-3xl border border-line bg-paper p-6 text-sm leading-6 text-muted">
          Provider diagnostics are restricted to analyst and admin roles. The operational workflow remains available to your
          role without exposing deployment configuration.
        </div>
      ) : null}

      <div className="rounded-3xl border border-line bg-paper p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-acid"><PlugZap className="size-4" /></span>
          <div>
            <p className="text-sm font-semibold">No silent fallback.</p>
            <p className="mt-1 text-sm leading-6 text-muted">
              A provider failure is visible in the run state. Extraction cannot complete without confidential inference
              attestation, and approval cannot complete without a server-verified proof.
            </p>
          </div>
        </div>
      </div>

      {status ? (
        <section className="overflow-hidden rounded-3xl border border-line bg-paper">
          <div className="border-b border-line px-5 py-5 sm:px-7">
            <SectionLabel>Adapter status</SectionLabel>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">Configured, disabled or blocked</h2>
          </div>
          <div className="divide-y divide-line">
            {rows.map((row) => (
              <div key={row.name} className="grid gap-3 px-5 py-5 sm:grid-cols-[1fr_auto] sm:px-7">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5">
                    {row.configured ? <CircleCheck className="size-4 text-positive" /> : row.state.includes("blocked") ? <CircleAlert className="size-4 text-warning" /> : <CircleDashed className="size-4 text-muted" />}
                  </span>
                  <div>
                    <p className="font-semibold">{row.name}</p>
                    <p className="mt-0.5 text-xs text-muted">{row.role}</p>
                    <p className="mt-2 max-w-2xl text-xs leading-5 text-muted">{row.detail}</p>
                  </div>
                </div>
                <div className="pl-7 sm:pl-0">
                  <StatusBadge tone={row.configured ? (row.state.includes("blocked") ? "warning" : "positive") : "neutral"}>{row.state}</StatusBadge>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-3xl border border-line bg-paper p-5">
          <SectionLabel>Feedback evaluations</SectionLabel>
          <p className="mt-3 text-sm leading-6 text-muted">
            Review the real Reppo provider state, score, decision, confidence and critique for synthetic correction traces.
          </p>
          <Link href="/evaluations" className="mt-4 inline-flex items-center gap-1 text-xs font-semibold underline decoration-line underline-offset-4 hover:text-ink">
            Evaluation register <ArrowUpRight className="size-3.5" />
          </Link>
        </section>
        <section className="rounded-3xl border border-line bg-paper p-5">
          <SectionLabel>Deployment</SectionLabel>
          <div className="mt-3 space-y-2 text-sm">
            <p className="flex items-center justify-between"><span className="text-muted">Vercel</span><span className="font-semibold">Authenticated preview</span></p>
            <p className="flex items-center justify-between"><span className="text-muted">Render</span><span className="font-semibold">API + Presidio live</span></p>
            <p className="flex items-center justify-between"><span className="text-muted">Production</span><span className="font-semibold">Gated on final checks</span></p>
          </div>
          <Link href="/settings" className="mt-4 inline-flex items-center gap-1 text-xs font-semibold underline decoration-line underline-offset-4 hover:text-ink">
            Workspace settings <ArrowUpRight className="size-3.5" />
          </Link>
        </section>
        <section className="rounded-3xl bg-ink p-5 text-paper">
          <SectionLabel><span className="text-white/50">Wording guardrail</span></SectionLabel>
          <p className="mt-3 text-sm leading-6 text-white/70">
            &ldquo;Sensitive inference is routed to NEAR AI Cloud&apos;s TEE-attested gateway. Each extraction is verified
            against fresh Intel TDX and NVIDIA NRAS evidence bound to a request nonce.&rdquo;
          </p>
          <p className="mt-3 text-xs leading-5 text-white/40">
            The proof proves only that the private witness satisfies the fixed circuit predicate. It does not prove that the
            source figures are accurate.
          </p>
        </section>
      </div>
    </div>
  );
}
