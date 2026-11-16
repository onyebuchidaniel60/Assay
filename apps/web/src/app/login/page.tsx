import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, ArrowUpRight, KeyRound, LockKeyhole } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { signIn } from "./actions";

export const metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <main className="grid min-h-screen lg:grid-cols-[1fr_0.85fr]">
      <section className="flex flex-col justify-between px-5 py-6 sm:px-8 lg:px-14 lg:py-10">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <Image src="/brand/assay-logo.png" alt="Assay" width={40} height={40} priority className="size-10 rounded-xl" />
            <span className="text-sm font-bold uppercase tracking-[0.24em]">Assay</span>
          </Link>
          <Link href="/dashboard" className="inline-flex items-center gap-2 text-xs font-semibold text-muted hover:text-ink">
            Open app <ArrowUpRight className="size-3.5" />
          </Link>
        </div>

        <div className="mx-auto w-full max-w-md py-16">
          <Image src="/brand/assay-logo.png" alt="Assay" width={88} height={88} priority className="mb-6 size-20 rounded-3xl" />
          <StatusBadge tone="proof">Invite-only staff access</StatusBadge>
          <h1 className="display mt-5 text-5xl font-semibold sm:text-6xl">Sign in to Assay.</h1>
          <p className="mt-4 text-sm leading-6 text-muted">
            Assay accounts are provisioned by a workspace administrator. Public signup is disabled.
          </p>

          {error ? (
            <div role="alert" className="mt-6 rounded-xl border border-danger/25 bg-danger/10 px-4 py-3 text-sm text-danger">
              {error === "missing"
                ? "Enter your work email and password."
                : "The email or password did not match an active invited account."}
            </div>
          ) : null}
          <form className="mt-8 space-y-5" action={signIn}>
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
              Sign in <ArrowUpRight className="size-4" />
            </button>
          </form>

          <div className="mt-6 rounded-2xl border border-dashed border-ink/20 bg-paper/60 p-4 text-xs leading-5 text-muted">
            <span className="mb-1 block font-semibold text-ink">Neon Auth · invite-only</span>
            Sign-in is handled server-side by Neon managed Better Auth. Public signup remains disabled. Use an invited synthetic
            staff account; contact the workspace administrator if you do not have one.
          </div>
        </div>

        <p className="text-xs text-muted">
          <LockKeyhole className="mr-1 inline size-3.5" />
          Sessions, invite-only access and role checks are enforced server-side.
        </p>
      </section>

      <aside className="hidden bg-ink px-10 py-10 text-paper lg:flex lg:flex-col lg:justify-between">
        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/70">
          <KeyRound className="size-3.5" /> Control boundary
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-acid">What the reviewer sees</p>
          <h2 className="display mt-5 text-5xl font-semibold">
            Human authority,
            <br />
            exact versions.
          </h2>
          <div className="mt-8 space-y-4 border-t border-white/10 pt-6 text-sm leading-6 text-white/75">
            <p>Analysts confirm redaction, terms and financial inputs before any model call.</p>
            <p>Managers see a restricted summary, proof state and scenario risk — not raw financial values.</p>
            <p>Every approval is bound to an immutable snapshot and becomes stale when material evidence changes.</p>
          </div>
        </div>
        <div className="flex items-center justify-between border-t border-white/10 pt-6 text-xs text-white/70">
          <span className="flex items-center gap-2"><Image src="/brand/assay-logo.png" alt="Assay" width={18} height={18} className="size-4 rounded" /> Assay · synthetic data</span>
          <Link href="/" className="inline-flex items-center gap-1 text-white/80 hover:text-white">
            <ArrowLeft className="size-3.5" /> Back
          </Link>
        </div>
      </aside>
    </main>
  );
}
