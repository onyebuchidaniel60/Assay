import Link from "next/link";
import { ArrowUpRight, CircleAlert, CircleCheck, CircleDashed, PlugZap } from "lucide-react";
import { PageHeader, SectionLabel } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";

export const metadata = { title: "Integrations" };

function presence(value: string | undefined) {
  return value && value.trim().length > 0;
}

export default function IntegrationsPage() {
  const rows = [
    {
      name: "NEAR AI Cloud",
      role: "Layer 2 confidential extraction",
      configured: presence(process.env.NEARAI_API_KEY),
      state: "Credential absent",
      detail: "TEE-verifiable model + Intel TDX/NVIDIA NRAS attestation required before extraction can be marked live.",
    },
    {
      name: "OpenRouter",
      role: "SERV judgement + generation",
      configured: presence(process.env.OPENROUTER_API_KEY),
      state: "Credential absent",
      detail: "Model IDs must exist in the catalog; structured, already-extracted data only.",
    },
    {
      name: "OpenServ SERV",
      role: "Bounded reasoning orchestration",
      configured: presence(process.env.SERV_REASONING_API_KEY),
      state: "Credential absent",
      detail: "SERV structures, validates and audits node calls. It does not itself perform inference.",
    },
    {
      name: "Neon / Postgres",
      role: "Canonical data + jobs",
      configured: presence(process.env.DATABASE_URL),
      state: "Configured · migrations applied",
      detail: "24 Drizzle tables applied to Neon PostgreSQL 18.7; tenant-scoped repositories and the SKIP LOCKED worker are wired.",
    },
    {
      name: "Neon Auth",
      role: "Invite-only staff authentication",
      configured: presence(process.env.NEON_AUTH_BASE_URL) && presence(process.env.NEON_AUTH_COOKIE_SECRET),
      state: "Configured · sign-in verified",
      detail: "Managed Better Auth proxies through /api/auth; Fastify validates the session server-side and resolves organization membership.",
    },
    {
      name: "Presidio",
      role: "PII detection / tokenization",
      configured: presence(process.env.PRESIDIO_URL),
      state: "REDUCED_PII_MODE",
      detail: "Small spaCy model + deterministic financial recognizers on the free Render tier. Analyst review remains mandatory.",
    },
    {
      name: "Reppo",
      role: "Optional synthetic feedback evaluation",
      configured: presence(process.env.REPPO_API_KEY) && process.env.REPPO_ENABLED === "true",
      state: "Disabled",
      detail: "Synthetic/de-identified records only. No key or enabled flag is present.",
    },
    {
      name: "Kite Passport",
      role: "Optional testnet x402 payments",
      configured: presence(process.env.KITE_SESSION_ID) && process.env.KITE_ENABLED === "true",
      state: "Testnet session · provider-blocked",
      detail: "Active 5/20 PIEUSD session; over-cap request rejected with session_rule_exceeded. The test payment endpoint returned provider internal error twice; no receipt.",
    },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Provider boundaries"
        title="Integrations"
        description="Provider state is shown honestly. Missing credentials, disabled integrations and provider failures are never replaced by fixture success."
        actions={<StatusBadge tone="warning">Partial configuration</StatusBadge>}
      />
      <div className="rounded-3xl border border-line bg-paper p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-acid"><PlugZap className="size-4" /></span>
          <div>
            <p className="text-sm font-semibold">Phase 1 shell: no provider calls are made.</p>
            <p className="mt-1 text-sm leading-6 text-muted">
              The UI reports configuration presence only. Phase 2/3 add live adapters, attestation checks, retries, schema validation and audit metadata. A missing key is a visible blocker, not a fallback to fabricated output.
            </p>
          </div>
        </div>
      </div>
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
      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-3xl border border-line bg-paper p-5">
          <SectionLabel>Deployment</SectionLabel>
          <div className="mt-3 space-y-2 text-sm">
            <p className="flex items-center justify-between"><span className="text-muted">Vercel</span><span className="font-semibold">Preview shell verified</span></p>
            <p className="flex items-center justify-between"><span className="text-muted">Render</span><span className="font-semibold">Deferred to Phase 5 (Option B)</span></p>
            <p className="flex items-center justify-between"><span className="text-muted">Production</span><span className="font-semibold">Authorized after gates</span></p>
          </div>
          <Link href="/settings" className="mt-4 inline-flex items-center gap-1 text-xs font-semibold underline decoration-line underline-offset-4 hover:text-ink">Workspace settings <ArrowUpRight className="size-3.5" /></Link>
        </section>
        <section className="rounded-3xl bg-ink p-5 text-paper">
          <SectionLabel><span className="text-white/50">Wording guardrail</span></SectionLabel>
          <p className="mt-3 text-sm leading-6 text-white/70">
            “Sensitive inference is routed to NEAR AI Cloud's TEE-attested gateway. Each request can be verified against Intel TDX and NVIDIA NRAS attestation evidence.”
          </p>
          <p className="mt-3 text-xs leading-5 text-white/40">
            Do not claim zero retention, unconditional TEE protection, or that cryptography proves data was never logged.
          </p>
        </section>
      </div>
    </div>
  );
}
