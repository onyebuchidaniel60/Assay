import Link from "next/link";
import { ArrowUpRight, CircleAlert, CircleCheck, CircleDashed, ExternalLink, PlugZap } from "lucide-react";
import { PageHeader, SectionLabel } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { FeedbackBanner } from "@/components/feedback-banner";
import { apiFetch, errorCode, errorMessage, getMe, type ApiEnvelope } from "@/lib/api-server";
import { formatDateTime, formatUsdcMinor } from "@/lib/money";

export const metadata = { title: "Integrations" };
export const dynamic = "force-dynamic";

type FinancialProviderStatus = {
  providerId: string;
  displayName: string;
  configured: boolean;
  available: boolean;
  dataMode: string;
  paymentNetwork: string | null;
  arcCompatible: boolean;
  note: string;
};

type PaymentStatus = {
  rail: string;
  enabled: boolean;
  ready: boolean;
  executionEnabled: boolean;
  dryRun: boolean;
  network: string;
  asset: string;
  assetSymbol: string;
  assetDecimals: number;
  chainId: number;
  gatewayWallet: string;
  gatewayDomain: number;
  facilitatorUrl: string;
  payerAddress: string | null;
  signingKeyConfigured: boolean;
  providerError: string | null;
  configError: string | null;
  facilitator: {
    reachable: boolean;
    supportedNetwork: boolean;
    supportedAsset: boolean;
    error: string | null;
  };
  balances: {
    wallet: { balance: string; formatted: string } | null;
    gateway: { total: string; available: string; formattedTotal: string; formattedAvailable: string };
  } | null;
  session: {
    configured: boolean;
    status: string;
    maxPerPaymentMinor: string;
    maxTotalMinor: string;
    spentTotalMinor: string;
    reservedTotalMinor: string;
    remainingTotalMinor: string;
    expiresAt: string | null;
    allowedProviders: string[];
    allowedEndpoints: string[];
    allowedRecipients: string[];
    allowedNetworks: string[];
    allowedAssets: string[];
  } | null;
  financialDataProviders: FinancialProviderStatus[];
  compatibility: Record<string, string>;
};

type IntegrationStatus = {
  nearai: { configured: boolean; model: string | null; attestationRequired: boolean };
  openrouter: { configured: boolean; judgementModel: string | null; generationModel: string | null };
  serv: { configured: boolean; model: string | null };
  presidio: { configured: boolean; mode: string };
  storage: { configured: boolean };
  reppo: { enabled: boolean; configured?: boolean; status: string };
  payments: PaymentStatus;
};

function paymentState(payments: PaymentStatus): { state: string; tone: "positive" | "warning" | "danger" | "neutral" } {
  if (payments.configError) return { state: "CONFIG ERROR", tone: "danger" };
  if (!payments.enabled) return { state: "DISABLED", tone: "neutral" };
  if (payments.dryRun) return { state: "DRY RUN", tone: "warning" };
  if (payments.executionEnabled && payments.signingKeyConfigured && payments.ready) return { state: "TESTNET EXECUTION ENABLED", tone: "positive" };
  return { state: "QUOTES ONLY", tone: "warning" };
}

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

  const row = status
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
          role: "Encrypted document, proof and evidence objects",
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
          name: "Arc Testnet · Circle Gateway",
          role: "Agentic x402 payment rail",
          configured: status.payments.enabled,
          state: paymentState(status.payments).state,
          detail: `${status.payments.network} · ${status.payments.assetSymbol} ${status.payments.asset} · Gateway domain ${status.payments.gatewayDomain}. ${status.payments.configError ?? status.payments.providerError ?? "Deterministic allowlists, caps and idempotency gate every payment."}`,
        },
      ]
    : [];

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Provider boundaries"
        title="Integrations"
        description="Provider state is shown honestly. Missing credentials, disabled integrations and provider failures are never replaced by fixture success. A policy approval is not a payment receipt."
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
              Extraction cannot complete without confidential inference attestation, approval cannot complete without a
              server-verified proof, and a paid data purchase is not reported as settled without a provider receipt or a
              reconciled Gateway transfer.
            </p>
          </div>
        </div>
      </div>

      {status ? (
        <>
          <section className="overflow-hidden rounded-3xl border border-line bg-paper">
            <div className="border-b border-line px-5 py-5 sm:px-7">
              <SectionLabel>Adapter status</SectionLabel>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight">Configured, disabled or blocked</h2>
            </div>
            <div className="divide-y divide-line">
              {row.map((item) => (
                <div key={item.name} className="grid gap-3 px-5 py-5 sm:grid-cols-[1fr_auto] sm:px-7">
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5">
                      {item.configured ? <CircleCheck className="size-4 text-positive" /> : item.state.includes("blocked") || item.state.includes("ERROR") ? <CircleAlert className="size-4 text-warning" /> : <CircleDashed className="size-4 text-muted" />}
                    </span>
                    <div>
                      <p className="font-semibold">{item.name}</p>
                      <p className="mt-0.5 text-xs text-muted">{item.role}</p>
                      <p className="mt-2 max-w-2xl text-xs leading-5 text-muted">{item.detail}</p>
                    </div>
                  </div>
                  <div className="pl-7 sm:pl-0">
                    <StatusBadge tone={item.configured ? (item.state.includes("blocked") || item.state.includes("ERROR") ? "warning" : "positive") : "neutral"}>{item.state}</StatusBadge>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-3xl border border-line bg-paper p-5 sm:p-7">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <SectionLabel>Arc payment rail</SectionLabel>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight">Circle Gateway · Arc Testnet</h2>
              </div>
              <StatusBadge tone={paymentState(status.payments).tone}>{paymentState(status.payments).state}</StatusBadge>
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                ["Network", status.payments.network],
                ["Chain ID", String(status.payments.chainId)],
                ["USDC", `${status.payments.assetSymbol} · ${status.payments.asset.slice(0, 10)}…`],
                ["Gateway domain", String(status.payments.gatewayDomain)],
                ["Facilitator", status.payments.facilitator.reachable ? (status.payments.facilitator.supportedNetwork ? "Reachable · network supported" : "Reachable · network missing") : "Unreachable"],
                ["Payer wallet", status.payments.payerAddress ? `${status.payments.payerAddress.slice(0, 8)}…${status.payments.payerAddress.slice(-6)}` : "Not configured"],
                ["Signing key", status.payments.signingKeyConfigured ? "Server-side only" : "Not configured"],
                ["Gateway balance", status.payments.balances ? formatUsdcMinor(status.payments.balances.gateway.available) : "Unavailable"],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl border border-line bg-white/40 p-4">
                  <p className="text-[10px] uppercase tracking-[0.14em] text-muted">{label}</p>
                  <p className="mt-2 break-all font-mono text-xs font-semibold">{value}</p>
                </div>
              ))}
            </div>
            <p className="mt-4 break-all font-mono text-[10px] text-muted">
              Gateway Wallet {status.payments.gatewayWallet} · Facilitator {status.payments.facilitatorUrl}
            </p>
            {status.payments.session ? (
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  ["Per payment", formatUsdcMinor(status.payments.session.maxPerPaymentMinor)],
                  ["Total cap", formatUsdcMinor(status.payments.session.maxTotalMinor)],
                  ["Remaining", formatUsdcMinor(status.payments.session.remainingTotalMinor)],
                  ["Expires", formatDateTime(status.payments.session.expiresAt)],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-2xl border border-line bg-white/40 p-4">
                    <p className="text-[10px] uppercase tracking-[0.14em] text-muted">{label}</p>
                    <p className="mt-2 font-mono text-xs font-semibold">{value}</p>
                  </div>
                ))}
              </div>
            ) : null}
            {status.payments.configError ? <p className="mt-3 text-xs text-danger">{status.payments.configError}</p> : null}
            {status.payments.facilitator.error ? <p className="mt-3 text-xs text-warning">Facilitator: {status.payments.facilitator.error}</p> : null}
            <p className="mt-4 text-xs leading-5 text-muted">
              The policy engine checks the actual provider terms: provider, endpoint, network, USDC asset, recipient,
              per-payment cap, aggregate budget, expiry, idempotency and duplicate nonce. A rejection never reaches the
              execution layer. A timeout becomes <span className="font-mono">RECONCILIATION_REQUIRED</span> and is looked up,
              not paid again.
            </p>
            <a href="https://developers.circle.com/gateway" target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-xs font-semibold underline decoration-line underline-offset-4 hover:text-ink">
              Circle Gateway documentation <ExternalLink className="size-3.5" />
            </a>
          </section>

          <section className="rounded-3xl border border-line bg-paper p-5 sm:p-7">
            <SectionLabel>Financial data providers</SectionLabel>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">Compatibility is verified, not assumed</h2>
            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              {status.payments.financialDataProviders.map((provider) => (
                <article key={provider.providerId} className="rounded-2xl border border-line bg-white/40 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold">{provider.displayName}</p>
                    <StatusBadge tone={provider.available ? "positive" : provider.configured ? "warning" : "neutral"}>
                      {provider.available ? "AVAILABLE" : provider.configured ? "RESTRICTED" : "NOT CONFIGURED"}
                    </StatusBadge>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-muted">{provider.note}</p>
                  <p className="mt-2 font-mono text-[10px] text-muted">
                    {provider.dataMode}
                    {provider.paymentNetwork ? ` · ${provider.paymentNetwork}` : ""} · Arc compatible: {provider.arcCompatible ? "yes" : "no"}
                  </p>
                </article>
              ))}
            </div>
            <div className="mt-4 space-y-2 rounded-2xl border border-line bg-white/40 p-4 text-xs leading-5 text-muted">
              {Object.entries(status.payments.compatibility).map(([key, value]) => (
                <p key={key}><span className="font-semibold text-ink">{key}</span> · {value}</p>
              ))}
            </div>
          </section>
        </>
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
            <p className="flex items-center justify-between"><span className="text-muted">Vercel</span><span className="font-semibold">Public production · invite-only</span></p>
            <p className="flex items-center justify-between"><span className="text-muted">Render</span><span className="font-semibold">API + Presidio live</span></p>
            <p className="flex items-center justify-between"><span className="text-muted">Production</span><span className="font-semibold">Live · smoke tested</span></p>
          </div>
          <Link href="/settings" className="mt-4 inline-flex items-center gap-1 text-xs font-semibold underline decoration-line underline-offset-4 hover:text-ink">
            Workspace settings <ArrowUpRight className="size-3.5" />
          </Link>
        </section>
        <section className="rounded-3xl bg-ink p-5 text-paper">
          <SectionLabel><span className="text-white/70">Wording guardrail</span></SectionLabel>
          <p className="mt-3 text-sm leading-6 text-white/80">
            &ldquo;Sensitive inference is routed to NEAR AI Cloud&apos;s TEE-attested gateway. Each extraction is verified
            against fresh Intel TDX and NVIDIA NRAS evidence bound to a request nonce.&rdquo;
          </p>
          <p className="mt-3 text-xs leading-5 text-white/70">
            The proof proves only that the private witness satisfies the fixed circuit predicate. It does not prove that the
            source figures are accurate.
          </p>
        </section>
      </div>
    </div>
  );
}
