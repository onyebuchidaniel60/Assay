import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { FeedbackBanner } from "@/components/feedback-banner";
import { createBorrowerAction } from "@/lib/actions";
import { getMe } from "@/lib/api-server";
import { redirect } from "next/navigation";

export const metadata = { title: "New borrower" };
export const dynamic = "force-dynamic";

export default async function NewBorrowerPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const params = await searchParams;
  const me = await getMe().catch(() => null);
  if (me && !me.capabilities.writeCovenant) redirect("/forbidden");

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <Link href="/borrowers" className="inline-flex items-center gap-2 text-xs font-semibold text-muted hover:text-ink">
        <ArrowLeft className="size-3.5" /> Back to borrowers
      </Link>
      <PageHeader
        eyebrow="Portfolio · Synthetic records only"
        title="New borrower"
        description="Creates a synthetic borrower, generates its per-borrower data key and starts a signed audit chain in one transaction."
      />
      <FeedbackBanner {...params} />
      <form action={createBorrowerAction} className="space-y-5 rounded-3xl border border-line bg-paper p-5 sm:p-7">
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-muted">Display alias</span>
            <input
              name="displayAlias"
              required
              minLength={1}
              maxLength={120}
              className="w-full rounded-xl border border-line bg-white/50 px-4 py-3 outline-none focus:border-ink"
              placeholder="Borrower 05"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-muted">Reference token</span>
            <input
              name="referenceToken"
              required
              pattern="[A-Za-z0-9][A-Za-z0-9_-]{1,63}"
              className="w-full rounded-xl border border-line bg-white/50 px-4 py-3 outline-none focus:border-ink"
              placeholder="BOR-005"
            />
          </label>
        </div>
        <div className="rounded-2xl border border-dashed border-ink/20 bg-white/40 p-4 text-xs leading-5 text-muted">
          <p className="flex items-center gap-2 font-semibold text-ink"><ShieldCheck className="size-3.5" /> Data boundary</p>
          <p className="mt-1">
            Never enter real borrower information. The MVP stores a synthetic alias and reference token only; the
            borrower DEK is wrapped by the environment KEK and the audit chain is signed with the server Ed25519 key.
          </p>
        </div>
        <button
          type="submit"
          className="inline-flex items-center gap-2 rounded-full bg-ink px-5 py-3 text-sm font-semibold text-paper transition hover:bg-ink-soft"
        >
          Create synthetic borrower
        </button>
      </form>
    </div>
  );
}
