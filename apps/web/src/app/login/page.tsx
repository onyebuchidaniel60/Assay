import Link from "next/link";
import { ArrowLeft, ArrowUpRight, KeyRound, LockKeyhole } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";

export const metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <main className="grid min-h-screen lg:grid-cols-[1fr_0.85fr]">
      <section className="flex flex-col justify-between px-5 py-6 sm:px-8 lg:px-14 lg:py-10">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-full bg-ink text-lg font-black text-acid">A</span>
            <span className="text-sm font-bold uppercase tracking-[0.24em]">Assay</span>
          </Link>
          <Link href="/dashboard" className="inline-flex items-center gap-2 text-xs font-semibold text-muted hover:text-ink">
            Preview workspace <ArrowUpRight className="size-3.5" />
          </Link>
        </div>

        <div className="mx-auto w-full max-w-md py-16">
          <StatusBadge tone="proof">Invite-only staff access</StatusBadge>
          <h1 className="display mt-5 text-5xl font-semibold sm:text-6xl">Sign in to review.</h1>
          <p className="mt-4 text-sm leading-6 text-muted">
            Assay accounts are provisioned by a workspace administrator. Public signup is disabled.
          </p>

          <form className="mt-8 space-y-5" action="/dashboard">
            <div>
              <label htmlFor="email" className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                Work email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="analyst@example.test"
                className="w-full rounded-xl border border-line bg-paper px-4 py-3 text-sm outline-none transition placeholder:text-muted/50 focus:border-ink"
              />
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label htmlFor="password" className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                  Password
                </label>
                <span className="text-[10px] font-medium text-muted">Reset via administrator</span>
              </div>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••••••"
                className="w-full rounded-xl border border-line bg-paper px-4 py-3 text-sm outline-none transition placeholder:text-muted/50 focus:border-ink"
              />
            </div>
            <button
              type="submit"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-ink px-4 py-3 text-sm font-semibold text-paper transition hover:bg-ink-soft"
            >
              Continue to preview <ArrowUpRight className="size-4" />
            </button>
          </form>

          <div className="mt-6 rounded-2xl border border-dashed border-ink/20 bg-paper/60 p-4 text-xs leading-5 text-muted">
            <span className="mb-1 block font-semibold text-ink">Phase 1 shell</span>
            Authentication is not wired yet. The form is a preview; use the preview workspace link to inspect the route shell.
            Supabase/Neon authentication is configured in Phase 2.
          </div>
        </div>

        <p className="text-xs text-muted">
          <LockKeyhole className="mr-1 inline size-3.5" />
          Secure session handling, invite acceptance and role checks arrive in Phase 2.
        </p>
      </section>

      <aside className="hidden bg-ink px-10 py-10 text-paper lg:flex lg:flex-col lg:justify-between">
        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/50">
          <KeyRound className="size-3.5" /> Control boundary
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-acid">What the reviewer sees</p>
          <h2 className="display mt-5 text-5xl font-semibold">
            Human authority,
            <br />
            exact versions.
          </h2>
          <div className="mt-8 space-y-4 border-t border-white/10 pt-6 text-sm leading-6 text-white/60">
            <p>Analysts confirm redaction, terms and financial inputs before any model call.</p>
            <p>Managers see a restricted summary, proof state and scenario risk — not raw financial values.</p>
            <p>Every approval is bound to an immutable snapshot and becomes stale when material evidence changes.</p>
          </div>
        </div>
        <div className="flex items-center justify-between border-t border-white/10 pt-6 text-xs text-white/50">
          <span>Assay preview · synthetic data</span>
          <Link href="/" className="inline-flex items-center gap-1 text-white/70 hover:text-white">
            <ArrowLeft className="size-3.5" /> Back
          </Link>
        </div>
      </aside>
    </main>
  );
}
