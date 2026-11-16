import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight, LockKeyhole, Scale, ShieldCheck, Sparkles } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";

const pillars = [
  {
    icon: Scale,
    title: "One covenant, precisely defined",
    body: "A contract-configurable maximum Debt / Adjusted EBITDA definition with source-linked terms and an approved formula.",
  },
  {
    icon: Sparkles,
    title: "AI proposes; code calculates",
    body: "Bounded extraction and reasoning propose terms. Decimal arithmetic, scenario checks and policy decisions stay deterministic.",
  },
  {
    icon: ShieldCheck,
    title: "Proof-backed, human-approved",
    body: "A fixed-circuit proof binds the compliance predicate to the exact input snapshot. A manager approves the result.",
  },
];

export default function LandingPage() {
  return (
    <main className="min-h-screen">
      <header className="mx-auto flex max-w-[1180px] items-center justify-between px-5 py-6 sm:px-8">
        <div className="flex items-center gap-3">
          <Image src="/brand/assay-logo.png" alt="Assay" width={40} height={40} priority className="size-10 rounded-xl" />
          <span className="text-sm font-bold uppercase tracking-[0.24em]">Assay</span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="rounded-full border border-line bg-paper px-4 py-2 text-xs font-semibold text-ink transition hover:bg-white"
          >
            Sign in
          </Link>
          <Link
            href="/dashboard"
            className="hidden items-center gap-2 rounded-full bg-ink px-4 py-2 text-xs font-semibold text-paper transition hover:bg-ink-soft sm:inline-flex"
          >
            Open app <ArrowUpRight className="size-3.5" />
          </Link>
        </div>
      </header>

      <section className="mx-auto grid max-w-[1180px] gap-10 px-5 pb-20 pt-12 sm:px-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-end lg:pb-28 lg:pt-20">
        <div>
          <p className="mb-5 text-[10px] font-semibold uppercase tracking-[0.24em] text-muted">Covenant operations · synthetic data</p>
          <h1 className="display max-w-4xl text-6xl font-semibold sm:text-7xl lg:text-[6.6rem]">
            Read the clause.
            <br />
            <span className="text-muted">Prove the result.</span>
          </h1>
          <p className="mt-8 max-w-2xl text-base leading-7 text-muted sm:text-lg">
            Assay turns a credit agreement into a reviewable covenant workflow: source-linked extraction, analyst-confirmed
            terms, deterministic leverage calculations and a manager decision bound to the exact evidence and proof.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-full bg-ink px-5 py-3 text-sm font-semibold text-paper transition hover:bg-ink-soft"
            >
              Enter the workspace <ArrowUpRight className="size-4" />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-full border border-line bg-paper px-5 py-3 text-sm font-semibold text-ink transition hover:bg-white"
            >
              <LockKeyhole className="size-4" /> Invite-only sign-in
            </Link>
          </div>
          <p className="mt-5 max-w-xl text-xs leading-5 text-muted">
            Synthetic borrower records only. Live provider calls happen only inside an authorized analyst run; no real borrower data or production credit decision is used.
          </p>
        </div>

        <div className="relative">
          <div className="absolute -left-4 -top-4 size-24 rounded-full bg-acid blur-[1px]" aria-hidden />
          <div className="relative overflow-hidden rounded-[2rem] border border-ink/10 bg-ink p-6 text-paper shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/50">Illustrative attention queue</p>
              <StatusBadge tone="danger">1 actual breach</StatusBadge>
            </div>
            <div className="mt-5 space-y-4">
              <div className="rounded-2xl bg-acid p-4 text-ink">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em]">Harborline Logistics</p>
                    <p className="mt-2 text-3xl font-semibold tracking-tight">3.70x</p>
                    <p className="mt-1 text-xs font-medium">Verified actual · limit ≤ 3.50x</p>
                  </div>
                  <StatusBadge tone="danger">BREACHED</StatusBadge>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-white/10 p-4">
                  <p className="text-[10px] uppercase tracking-[0.16em] text-white/40">Forecast</p>
                  <p className="mt-2 text-2xl font-semibold">3.63x</p>
                  <StatusBadge tone="warning" className="mt-2">AT RISK</StatusBadge>
                </div>
                <div className="rounded-2xl border border-white/10 p-4">
                  <p className="text-[10px] uppercase tracking-[0.16em] text-white/40">Proof</p>
                  <p className="mt-2 text-2xl font-semibold">Verified</p>
                  <StatusBadge tone="proof" className="mt-2">BOUND</StatusBadge>
                </div>
              </div>
              <div className="flex items-center justify-between border-t border-white/10 pt-4 text-xs text-white/50">
                <span>Northwind Components</span>
                <span className="text-white/100">3.20x · compliant</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-line bg-paper/60">
        <div className="mx-auto grid max-w-[1180px] gap-px bg-line sm:grid-cols-3">
          {pillars.map((pillar) => {
            const Icon = pillar.icon;
            return (
              <div key={pillar.title} className="bg-paper px-5 py-8 sm:px-8 sm:py-10">
                <Icon className="size-5" />
                <h2 className="mt-5 text-lg font-semibold tracking-tight">{pillar.title}</h2>
                <p className="mt-2 text-sm leading-6 text-muted">{pillar.body}</p>
              </div>
            );
          })}
        </div>
      </section>

      <footer className="mx-auto flex max-w-[1180px] flex-col gap-3 px-5 py-8 text-xs text-muted sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <p className="flex items-center gap-2"><Image src="/brand/assay-logo.png" alt="Assay" width={20} height={20} className="size-5 rounded" /> Assay · synthetic-data workspace · not a production credit decision system.</p>
        <div className="flex gap-4">
          <a className="underline decoration-line underline-offset-4 hover:text-ink" href="https://github.com/onyebuchidaniel60/Assay/tree/main/docs">
            Documentation
          </a>
          <a className="underline decoration-line underline-offset-4 hover:text-ink" href="https://github.com/onyebuchidaniel60/Assay">
            GitHub
          </a>
        </div>
      </footer>
    </main>
  );
}
