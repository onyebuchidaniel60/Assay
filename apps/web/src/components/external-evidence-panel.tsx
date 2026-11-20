import { CircleAlert, CircleCheck, Database, ExternalLink, FileSearch, Landmark, RefreshCw, ShieldCheck } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { SectionLabel } from "@/components/page-header";
import { formatDateTime, formatUsdcMinor } from "@/lib/money";
import {
  authorizePaymentAction,
  quotePaidEvidenceAction,
  reconcilePaymentAction,
  requestSecEvidenceAction,
} from "@/lib/actions";

type EvidenceNeed = {
  key: string;
  kind: string;
  title: string;
  reason: string;
  providerCandidates: Array<{
    providerId: string;
    displayName: string;
    requiresPayment: boolean;
    paymentNetwork: string | null;
    availability: string;
  }>;
  limitations: string[];
};

type EvidenceFact = {
  tag: string;
  label: string;
  value: number;
  unit: string;
  periodEnd: string;
  fiscalYear: number | null;
  form: string | null;
  accession: string | null;
};

type EvidencePayload = {
  company?: { name?: string; ticker?: string | null; cik?: string; exchange?: string | null };
  reportingPeriod?: { fiscalYear?: number; periodEnd?: string | null; form?: string | null };
  facts?: EvidenceFact[];
};

type Evidence = {
  id: string;
  providerId: string;
  providerName: string;
  kind: string;
  sourceUrl: string;
  publisher: string;
  reportingPeriod: string;
  linkedField: string | null;
  retrievedAt: string;
  contentSha256: string;
  validationStatus: string;
  validationErrors: string[];
  limitations: string[];
  paymentIntentId: string | null;
  requestContext: Record<string, unknown>;
  payload?: EvidencePayload;
};

type PaymentIntent = {
  id: string;
  providerId: string;
  providerName: string;
  status: string;
  network: string;
  asset: string;
  payTo: string;
  amountMinor: string;
  authorizedAmountMinor: string | null;
  settledAmountMinor: string | null;
  quoteSha256: string;
  quoteExpiresAt: string | null;
  rejectionCode: string | null;
  rejectionReason: string | null;
  failureCode: string | null;
  failureMessage: string | null;
  dataStatus: string;
  providerTransaction: string | null;
  transactionHash: string | null;
  transferId: string | null;
  createdAt: string;
};

type PaymentSession = {
  configured: boolean;
  executionEnabled: boolean;
  maxPerPaymentMinor: string;
  maxTotalMinor: string;
  spentTotalMinor: string;
  reservedTotalMinor: string;
  remainingTotalMinor: string;
  expiresAt: string | null;
  allowedProviders: string[];
  allowedNetworks: string[];
  allowedAssets: string[];
};

type ProviderStatus = {
  providerId: string;
  displayName: string;
  configured: boolean;
  available: boolean;
  dataMode: string;
  paymentNetwork: string | null;
  arcCompatible: boolean;
  note: string;
};

export type ExternalEvidenceData = {
  plan: EvidenceNeed[];
  evidence: Evidence[];
  payments: PaymentIntent[];
  paymentSession: PaymentSession | null;
  providerStatuses: ProviderStatus[];
};

function paymentLabel(status: string): { label: string; detail: string } {
  switch (status) {
    case "PROPOSED":
      return { label: "Policy approved · not paid", detail: "The deterministic policy approved the quote. No payment exists until the analyst authorizes it and the worker records a verified receipt." };
    case "POLICY_REJECTED":
      return { label: "Rejected by policy · not paid", detail: "The transaction never reached the payment execution layer." };
    case "AUTHORIZED":
      return { label: "Authorized · queued", detail: "The budget is reserved. Settlement is not claimed until the worker verifies a receipt or reconciles the transfer." };
    case "SUBMITTING":
      return { label: "Submitted · awaiting receipt", detail: "The signed authorization was submitted. A timeout requires reconciliation, never a second payment." };
    case "SUBMITTED":
      return { label: "Submitted · awaiting receipt", detail: "Settlement is not yet confirmed." };
    case "CONFIRMED":
      return { label: "Settled · verified receipt", detail: "The provider returned a verifiable payment receipt. This is distinct from the analyst's covenant conclusion." };
    case "RECONCILIATION_REQUIRED":
      return { label: "Settlement unknown · reconcile", detail: "Assay will look up the original authorization. It will not create a second payment." };
    case "RECONCILED":
      return { label: "Reconciled · settled", detail: "The original authorization was matched to a verified onchain or provider settlement record." };
    case "FAILED":
      return { label: "Failed · no payment", detail: "The provider rejected the payment or it never settled. No automatic retry was made." };
    case "CANCELLED":
      return { label: "Cancelled", detail: "No payment was executed." };
    default:
      return { label: status, detail: "" };
  }
}

function factValue(fact: EvidenceFact): string {
  return `${fact.value.toLocaleString("en-US")} ${fact.unit}`;
}

export function ExternalEvidencePanel({
  runId,
  role,
  editable,
  data,
}: {
  runId: string;
  role: string;
  editable: boolean;
  data: ExternalEvidenceData;
}) {
  const analyst = role === "ANALYST" || role === "ADMIN";
  const canRequest = analyst && editable;
  const session = data.paymentSession;
  const executionEnabled = Boolean(session?.executionEnabled);

  return (
    <section className="rounded-3xl border border-line bg-paper p-5 sm:p-7">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <SectionLabel>External evidence · source-linked</SectionLabel>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight">Independent financial information</h2>
        </div>
        <StatusBadge tone="info">{data.evidence.length} RETRIEVED</StatusBadge>
      </div>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">
        The bounded evidence planner proposes checks from the structured run. It never authorizes a payment or changes the
        covenant calculation. Public-company data is an independent reference, not proof of a private borrower&apos;s position.
      </p>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-line bg-white/40 p-4">
          <p className="flex items-center gap-2 text-xs font-semibold"><FileSearch className="size-4" /> Proposed evidence needs</p>
          <ul className="mt-3 space-y-3">
            {data.plan.map((need) => (
              <li key={need.key} className="rounded-xl border border-line bg-white/50 p-3">
                <p className="text-sm font-semibold">{need.title}</p>
                <p className="mt-1 text-xs leading-5 text-muted">{need.reason}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {need.providerCandidates.map((provider) => (
                    <StatusBadge key={`${need.key}-${provider.providerId}`} tone={provider.requiresPayment ? "warning" : "positive"}>
                      {provider.displayName}{provider.requiresPayment ? " · paid" : " · free"}
                    </StatusBadge>
                  ))}
                </div>
                <ul className="mt-2 space-y-1 text-[11px] leading-5 text-muted">
                  {need.limitations.map((limitation) => (
                    <li key={limitation}>· {limitation}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-line bg-white/40 p-4">
          <p className="flex items-center gap-2 text-xs font-semibold"><Database className="size-4" /> Provider compatibility</p>
          <ul className="mt-3 space-y-2">
            {data.providerStatuses.map((provider) => (
              <li key={provider.providerId} className="rounded-xl border border-line bg-white/50 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold">{provider.displayName}</p>
                  <StatusBadge tone={provider.available ? "positive" : provider.configured ? "warning" : "neutral"}>
                    {provider.available ? "AVAILABLE" : provider.configured ? "RESTRICTED" : "NOT CONFIGURED"}
                  </StatusBadge>
                </div>
                <p className="mt-1 text-[11px] leading-5 text-muted">{provider.note}</p>
                <p className="mt-1 font-mono text-[10px] text-muted">
                  {provider.dataMode}{provider.paymentNetwork ? ` · ${provider.paymentNetwork}` : ""} · Arc compatible: {provider.arcCompatible ? "yes" : "no"}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {analyst && !editable ? (
        <p className="mt-4 rounded-2xl border border-line bg-white/40 px-4 py-3 text-xs text-muted">
          Evidence requests are closed for this run state. Retrieved evidence remains visible and auditable.
        </p>
      ) : null}

      {canRequest ? (
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <form action={requestSecEvidenceAction} className="rounded-2xl border border-line bg-white/40 p-4">
            <p className="flex items-center gap-2 text-xs font-semibold"><Landmark className="size-4" /> Free SEC EDGAR check</p>
            <p className="mt-1 text-[11px] leading-5 text-muted">No payment. Requires an explicit public-company reference confirmation.</p>
            <input type="hidden" name="runId" value={runId} />
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="text-xs">
                <span className="mb-1 block font-semibold uppercase tracking-[0.12em] text-muted">Kind</span>
                <select name="kind" className="w-full rounded-xl border border-line bg-white/60 px-3 py-2.5 outline-none focus:border-ink">
                  <option value="REVENUE_VERIFICATION">Revenue verification</option>
                  <option value="COMPANY_FACTS">Company facts</option>
                  <option value="INCOME_STATEMENT">Income statement</option>
                  <option value="BALANCE_SHEET">Balance sheet</option>
                  <option value="CASH_FLOW_STATEMENT">Cash-flow statement</option>
                </select>
              </label>
              <label className="text-xs">
                <span className="mb-1 block font-semibold uppercase tracking-[0.12em] text-muted">Fiscal year</span>
                <input name="fiscalYear" inputMode="numeric" placeholder="2025" className="w-full rounded-xl border border-line bg-white/60 px-3 py-2.5 font-mono outline-none focus:border-ink" />
              </label>
              <label className="text-xs">
                <span className="mb-1 block font-semibold uppercase tracking-[0.12em] text-muted">Public ticker</span>
                <input name="ticker" placeholder="AAPL" className="w-full rounded-xl border border-line bg-white/60 px-3 py-2.5 font-mono uppercase outline-none focus:border-ink" />
              </label>
              <label className="text-xs">
                <span className="mb-1 block font-semibold uppercase tracking-[0.12em] text-muted">or CIK</span>
                <input name="cik" inputMode="numeric" placeholder="0000320193" className="w-full rounded-xl border border-line bg-white/60 px-3 py-2.5 font-mono outline-none focus:border-ink" />
              </label>
            </div>
            <label className="mt-3 block text-xs">
              <span className="mb-1 block font-semibold uppercase tracking-[0.12em] text-muted">Why this is needed</span>
              <input name="reason" placeholder="Independently confirm the linked public entity's reported revenue." className="w-full rounded-xl border border-line bg-white/60 px-3 py-2.5 outline-none focus:border-ink" />
            </label>
            <label className="mt-3 block text-xs">
              <span className="mb-1 block font-semibold uppercase tracking-[0.12em] text-muted">Linked finding (optional)</span>
              <input name="linkedField" placeholder="reported revenue" className="w-full rounded-xl border border-line bg-white/60 px-3 py-2.5 outline-none focus:border-ink" />
            </label>
            <label className="mt-3 flex items-start gap-2 text-[11px] leading-5">
              <input type="checkbox" name="publicReferenceConfirmed" className="mt-0.5 size-4" />
              <span>I confirm the ticker or CIK identifies the public entity I intend to check. I will not treat it as proof of a different private borrower&apos;s figures.</span>
            </label>
            <button type="submit" className="mt-3 inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2.5 text-xs font-semibold text-paper">
              <ExternalLink className="size-3.5" /> Retrieve free SEC evidence
            </button>
          </form>

          <form action={quotePaidEvidenceAction} className="rounded-2xl border border-line bg-white/40 p-4">
            <p className="flex items-center gap-2 text-xs font-semibold"><ShieldCheck className="size-4" /> Paid provider quote</p>
            <p className="mt-1 text-[11px] leading-5 text-muted">
              Records the provider&apos;s actual x402 requirement and runs the deterministic policy. A quote is not a payment.
            </p>
            <input type="hidden" name="runId" value={runId} />
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="text-xs sm:col-span-2">
                <span className="mb-1 block font-semibold uppercase tracking-[0.12em] text-muted">Provider</span>
                <select name="providerId" className="w-full rounded-xl border border-line bg-white/60 px-3 py-2.5 outline-none focus:border-ink">
                  <option value="lonestar-oracle">LoneStar Oracle EquityScope (Arc mainnet)</option>
                  <option value="financial-datasets">Financial Datasets (Base mainnet)</option>
                </select>
              </label>
              <label className="text-xs">
                <span className="mb-1 block font-semibold uppercase tracking-[0.12em] text-muted">Public ticker</span>
                <input name="ticker" required placeholder="AAPL" className="w-full rounded-xl border border-line bg-white/60 px-3 py-2.5 font-mono uppercase outline-none focus:border-ink" />
              </label>
              <label className="text-xs">
                <span className="mb-1 block font-semibold uppercase tracking-[0.12em] text-muted">Fiscal year</span>
                <input name="fiscalYear" inputMode="numeric" placeholder="2025" className="w-full rounded-xl border border-line bg-white/60 px-3 py-2.5 font-mono outline-none focus:border-ink" />
              </label>
            </div>
            <label className="mt-3 block text-xs">
              <span className="mb-1 block font-semibold uppercase tracking-[0.12em] text-muted">Why this is needed</span>
              <input name="reason" placeholder="Optional market-context evidence for the linked public reference." className="w-full rounded-xl border border-line bg-white/60 px-3 py-2.5 outline-none focus:border-ink" />
            </label>
            <label className="mt-3 flex items-start gap-2 text-[11px] leading-5">
              <input type="checkbox" name="publicReferenceConfirmed" className="mt-0.5 size-4" />
              <span>I confirm the public reference. I understand that a policy rejection is a final deterministic decision, not a payment.</span>
            </label>
            <button type="submit" className="mt-3 inline-flex items-center gap-2 rounded-full border border-line px-4 py-2.5 text-xs font-semibold hover:border-ink/30">
              <FileSearch className="size-3.5" /> Request quote and policy check
            </button>
            <p className="mt-2 text-[10px] leading-4 text-muted">
              Current policy: {session?.allowedNetworks.join(", ") || "not configured"}; per payment {session ? formatUsdcMinor(session.maxPerPaymentMinor) : "—"}; execution {executionEnabled ? "enabled" : "disabled"}. The provider requirement is checked against this session, and only an explicit analyst authorization can settle a payment.
            </p>
          </form>
        </div>
      ) : null}

      {data.evidence.length > 0 ? (
        <div className="mt-6">
          <SectionLabel>Retrieved evidence</SectionLabel>
          <div className="mt-3 space-y-3">
            {data.evidence.map((item) => (
              <article key={item.id} className="rounded-2xl border border-line bg-white/40 p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold">{item.publisher}</p>
                    <p className="mt-0.5 text-[11px] text-muted">{item.kind.replaceAll("_", " ")} · {item.reportingPeriod}</p>
                  </div>
                  <StatusBadge>{item.validationStatus}</StatusBadge>
                </div>
                <div className="mt-3 grid gap-2 text-[11px] sm:grid-cols-2">
                  <p><span className="text-muted">Retrieved</span> {formatDateTime(item.retrievedAt)}</p>
                  <p className="break-all"><span className="text-muted">SHA-256</span> {item.contentSha256}</p>
                  <p className="break-all sm:col-span-2"><span className="text-muted">Source</span> {item.sourceUrl}</p>
                  {item.linkedField ? <p className="sm:col-span-2"><span className="text-muted">Linked finding</span> {item.linkedField}</p> : null}
                </div>
                {item.payload?.company ? (
                  <p className="mt-2 text-xs text-muted">
                    {item.payload.company.name}{item.payload.company.ticker ? ` · ${item.payload.company.ticker}` : ""}{item.payload.company.cik ? ` · CIK ${item.payload.company.cik}` : ""}
                  </p>
                ) : null}
                {item.payload?.facts && item.payload.facts.length > 0 ? (
                  <div className="mt-3 overflow-x-auto">
                    <table className="w-full text-left text-[11px]">
                      <thead className="border-b border-line text-muted">
                        <tr>
                          <th className="py-1.5 pr-3 font-semibold">Tag</th>
                          <th className="py-1.5 pr-3 font-semibold">Value</th>
                          <th className="py-1.5 pr-3 font-semibold">Period end</th>
                          <th className="py-1.5 font-semibold">Form</th>
                        </tr>
                      </thead>
                      <tbody>
                        {item.payload.facts.slice(0, 8).map((fact) => (
                          <tr key={`${item.id}-${fact.tag}-${fact.periodEnd}`} className="border-b border-line/60">
                            <td className="py-1.5 pr-3 font-mono">{fact.tag}</td>
                            <td className="py-1.5 pr-3 font-mono">{factValue(fact)}</td>
                            <td className="py-1.5 pr-3">{fact.periodEnd}</td>
                            <td className="py-1.5">{fact.form ?? "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : null}
                {item.validationErrors.length > 0 ? (
                  <p className="mt-2 text-[11px] text-warning">{item.validationErrors.join(" ")}</p>
                ) : null}
                <ul className="mt-2 space-y-1 text-[10px] leading-4 text-muted">
                  {item.limitations.map((limitation) => (
                    <li key={limitation}>· {limitation}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>
      ) : null}

      {analyst && data.payments.length > 0 ? (
        <div className="mt-6">
          <SectionLabel>Payment intents</SectionLabel>
          <div className="mt-3 space-y-3">
            {data.payments.map((intent) => {
              const label = paymentLabel(intent.status);
              const canAuthorize = intent.status === "PROPOSED" && executionEnabled;
              return (
                <article key={intent.id} className="rounded-2xl border border-line bg-white/40 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold">{intent.providerName}</p>
                      <p className="mt-0.5 text-[11px] text-muted">{label.label} · {formatUsdcMinor(intent.amountMinor)} · {intent.network}</p>
                    </div>
                    <StatusBadge>{intent.status}</StatusBadge>
                  </div>
                  <p className="mt-2 text-[11px] leading-5 text-muted">{label.detail}</p>
                  <div className="mt-2 grid gap-1 text-[10px] sm:grid-cols-2">
                    <p className="break-all"><span className="text-muted">Recipient</span> {intent.payTo}</p>
                    <p className="break-all"><span className="text-muted">Quote</span> {intent.quoteSha256.slice(0, 24)}…</p>
                    {intent.authorizedAmountMinor ? <p><span className="text-muted">Authorized</span> {formatUsdcMinor(intent.authorizedAmountMinor)}</p> : null}
                    {intent.settledAmountMinor ? <p><span className="text-muted">Settled</span> {formatUsdcMinor(intent.settledAmountMinor)}</p> : null}
                    {intent.transactionHash ? <p className="break-all sm:col-span-2"><span className="text-muted">Transaction</span> {intent.transactionHash}</p> : null}
                    {intent.transferId ? <p className="break-all sm:col-span-2"><span className="text-muted">Gateway transfer</span> {intent.transferId}</p> : null}
                    {intent.rejectionCode ? <p className="sm:col-span-2 text-warning"><span className="text-muted">Rejection</span> {intent.rejectionCode}: {intent.rejectionReason}</p> : null}
                    {intent.failureCode ? <p className="sm:col-span-2 text-warning"><span className="text-muted">Failure</span> {intent.failureCode}: {intent.failureMessage}</p> : null}
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {canAuthorize ? (
                      <form action={authorizePaymentAction}>
                        <input type="hidden" name="runId" value={runId} />
                        <input type="hidden" name="paymentIntentId" value={intent.id} />
                        <input type="hidden" name="expectedQuoteSha256" value={intent.quoteSha256} />
                        <button type="submit" className="inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2.5 text-xs font-semibold text-paper">
                          <ShieldCheck className="size-3.5" /> Authorize within policy
                        </button>
                      </form>
                    ) : intent.status === "PROPOSED" ? (
                      <button type="button" disabled title="Payment execution is disabled or in dry-run mode" className="cursor-not-allowed rounded-full border border-line px-4 py-2.5 text-xs font-semibold text-muted">
                        Authorization disabled · execution off
                      </button>
                    ) : null}
                    {["RECONCILIATION_REQUIRED", "SUBMITTING", "SUBMITTED"].includes(intent.status) ? (
                      <form action={reconcilePaymentAction}>
                        <input type="hidden" name="runId" value={runId} />
                        <input type="hidden" name="paymentIntentId" value={intent.id} />
                        <button type="submit" className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-2.5 text-xs font-semibold">
                          <RefreshCw className="size-3.5" /> Reconcile, do not repay
                        </button>
                      </form>
                    ) : null}
                    {intent.status === "CONFIRMED" || intent.status === "RECONCILED" ? (
                      <span className="inline-flex items-center gap-1.5 text-[11px] text-positive"><CircleCheck className="size-3.5" /> Verified by a provider receipt or Gateway transfer</span>
                    ) : null}
                    {intent.status === "POLICY_REJECTED" || intent.status === "FAILED" ? (
                      <span className="inline-flex items-center gap-1.5 text-[11px] text-warning"><CircleAlert className="size-3.5" /> No payment reached the chain</span>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
          {session ? (
            <p className="mt-3 text-[10px] leading-4 text-muted">
              Session {session.configured ? "configured" : "not configured"} · per-payment {formatUsdcMinor(session.maxPerPaymentMinor)} · total {formatUsdcMinor(session.maxTotalMinor)} · remaining {formatUsdcMinor(session.remainingTotalMinor)} · expires {formatDateTime(session.expiresAt)}
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
