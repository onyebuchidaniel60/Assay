import Link from "next/link";
import { ArrowLeft, ArrowUpRight, Download, FileText, ShieldCheck } from "lucide-react";
import { PageHeader, PlaceholderNote, SectionLabel } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";

export const metadata = { title: "Facility detail" };

const documents = [
  { name: "Credit Agreement — Northwind Components", category: "CREDIT_AGREEMENT", version: "v1", pages: 42, sha: "9f2a…c41e", state: "PROCESSED" },
  { name: "Q3 2026 Financial Statement", category: "FINANCIAL_STATEMENT", version: "v1", pages: 18, sha: "77bd…01aa", state: "NEEDS_REVIEW" },
  { name: "Debt Schedule — 30 Sep 2026", category: "DEBT_SCHEDULE", version: "v2", pages: 3, sha: "b31c…9e0d", state: "PROCESSED" },
];

export default function FacilityDetailPage() {
  return (
    <div className="space-y-8">
      <Link href="/facilities" className="inline-flex items-center gap-2 text-xs font-semibold text-muted hover:text-ink">
        <ArrowLeft className="size-3.5" /> All facilities
      </Link>

      <PageHeader
        eyebrow="Northwind Components Ltd. · NWC-2026-001"
        title="Term Loan A"
        description="Facility overview, covenant definition, document evidence and the current review trail. Synthetic preview data."
        actions={
          <>
            <StatusBadge tone="positive">Active</StatusBadge>
            <StatusBadge>COMPLIANT</StatusBadge>
            <Link href="/covenants/demo" className="inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2.5 text-xs font-semibold text-paper hover:bg-ink-soft">
              Open covenant <ArrowUpRight className="size-3.5" />
            </Link>
          </>
        }
      />

      <nav className="flex gap-2 overflow-x-auto border-b border-line pb-3 text-xs font-semibold" aria-label="Facility sections">
        {["Overview", "Covenants", "Documents", "Cases", "Audit"].map((item) => (
          <a key={item} href={`#${item.toLowerCase()}`} className="whitespace-nowrap rounded-full border border-line bg-paper px-3.5 py-2 text-muted hover:border-ink/30 hover:text-ink">
            {item}
          </a>
        ))}
      </nav>

      <section id="overview" className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-3xl border border-line bg-paper p-5 sm:p-7">
          <SectionLabel>Facility terms</SectionLabel>
          <dl className="mt-5 grid gap-5 sm:grid-cols-2">
            {[
              ["Borrower", "Northwind Components Ltd."],
              ["Reference", "FAC-001"],
              ["Currency", "USD"],
              ["Committed amount", "$50,000,000.00"],
              ["Agreement date", "01 Jan 2026"],
              ["Maturity", "31 Dec 2030"],
              ["Facility type", "Term loan"],
              ["Contract timezone", "UTC"],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">{label}</dt>
                <dd className="mt-1.5 text-sm font-medium">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="rounded-3xl bg-ink p-5 text-paper sm:p-7">
          <SectionLabel><span className="text-white/50">Current position</span></SectionLabel>
          <p className="mt-5 font-mono text-5xl font-semibold tracking-tight">3.20x</p>
          <p className="mt-2 text-sm text-white/60">Verified actual leverage against ≤ 3.50x</p>
          <div className="mt-6 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-acid p-4 text-ink">
              <p className="text-[10px] uppercase tracking-[0.14em]">Actual</p>
              <p className="mt-2 text-lg font-semibold">Compliant</p>
            </div>
            <div className="rounded-2xl border border-white/10 p-4">
              <p className="text-[10px] uppercase tracking-[0.14em] text-white/50">Forecast</p>
              <p className="mt-2 text-lg font-semibold">At risk</p>
            </div>
          </div>
          <p className="mt-5 text-xs leading-5 text-white/50">
            Forecast is a separate scenario. It does not change the actual compliance status.
          </p>
        </div>
      </section>

      <section id="covenants" className="rounded-3xl border border-line bg-paper p-5 sm:p-7">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <SectionLabel>Covenant</SectionLabel>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">Maximum Debt / Adjusted EBITDA</h2>
          </div>
          <StatusBadge tone="proof">Manager approved · v1</StatusBadge>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-line bg-white/40 p-4">
            <p className="text-[10px] uppercase tracking-[0.14em] text-muted">Threshold</p>
            <p className="mt-2 font-mono text-2xl font-semibold">≤ 3.50x</p>
          </div>
          <div className="rounded-2xl border border-line bg-white/40 p-4">
            <p className="text-[10px] uppercase tracking-[0.14em] text-muted">Test frequency</p>
            <p className="mt-2 text-lg font-semibold">Quarterly</p>
          </div>
          <div className="rounded-2xl border border-line bg-white/40 p-4">
            <p className="text-[10px] uppercase tracking-[0.14em] text-muted">Evidence</p>
            <p className="mt-2 text-lg font-semibold">2 confirmed inputs</p>
          </div>
        </div>
        <Link href="/covenants/demo" className="mt-5 inline-flex items-center gap-1 text-xs font-semibold underline decoration-line underline-offset-4 hover:text-ink">
          Inspect clause and formula <ArrowUpRight className="size-3.5" />
        </Link>
      </section>

      <section id="documents" className="rounded-3xl border border-line bg-paper p-5 sm:p-7">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <SectionLabel>Evidence</SectionLabel>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">Documents</h2>
          </div>
          <button type="button" disabled title="Upload is wired in Phase 3" className="cursor-not-allowed rounded-full border border-line bg-paper px-4 py-2 text-xs font-semibold text-muted opacity-60">
            Upload PDF
          </button>
        </div>
        <div className="mt-5 divide-y divide-line">
          {documents.map((doc) => (
            <div key={doc.name} className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-full border border-line bg-white/50"><FileText className="size-4" /></span>
                <div>
                  <p className="text-sm font-semibold">{doc.name}</p>
                  <p className="mt-0.5 text-xs text-muted">{doc.category} · {doc.version} · {doc.pages} pages · SHA-256 {doc.sha}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 pl-12 sm:pl-0">
                <StatusBadge>{doc.state}</StatusBadge>
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-muted"><Download className="size-3.5" /> Preview later</span>
              </div>
            </div>
          ))}
        </div>
        <PlaceholderNote>Document upload, scanning, parser output and download are wired in Phase 3. No file bytes are accepted yet.</PlaceholderNote>
      </section>

      <section id="cases" className="grid gap-4 md:grid-cols-2">
        <div className="rounded-3xl border border-line bg-paper p-5">
          <SectionLabel>Cases</SectionLabel>
          <p className="mt-3 text-2xl font-semibold">No open cases</p>
          <p className="mt-2 text-sm text-muted">A verified actual breach creates an exception case in Phase 3.</p>
        </div>
        <div id="audit" className="rounded-3xl border border-line bg-paper p-5">
          <SectionLabel>Audit</SectionLabel>
          <div className="mt-3 flex items-center gap-2"><ShieldCheck className="size-4 text-positive" /><p className="text-sm font-semibold">Hash-linked event trail available</p></div>
          <Link href="/audit" className="mt-3 inline-flex items-center gap-1 text-xs font-semibold underline decoration-line underline-offset-4 hover:text-ink">Open audit trail <ArrowUpRight className="size-3.5" /></Link>
        </div>
      </section>
    </div>
  );
}
