import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader, PlaceholderNote } from "@/components/page-header";

export const metadata = { title: "New borrower" };

export default function NewBorrowerPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <Link href="/borrowers" className="inline-flex items-center gap-2 text-xs font-semibold text-muted hover:text-ink">
        <ArrowLeft className="size-3.5" /> Back to borrowers
      </Link>
      <PageHeader
        eyebrow="Portfolio · Phase 1 shell"
        title="New borrower"
        description="The final form will create a synthetic borrower, validate the normalized reference and write an audit event transactionally."
      />
      <PlaceholderNote>
        Form wiring arrives with the Phase 3 borrower API. This route confirms the navigation and layout without pretending to save a record.
      </PlaceholderNote>
      <form className="space-y-5 rounded-3xl border border-line bg-paper p-5 sm:p-7">
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-muted">Legal name</span>
            <input className="w-full rounded-xl border border-line bg-white/50 px-4 py-3 outline-none focus:border-ink" placeholder="Synthetic borrower name" />
          </label>
          <label className="block text-sm">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-muted">Reference</span>
            <input className="w-full rounded-xl border border-line bg-white/50 px-4 py-3 outline-none focus:border-ink" placeholder="BRW-001" />
          </label>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-muted">Classification</span>
            <select className="w-full rounded-xl border border-line bg-white/50 px-4 py-3 outline-none focus:border-ink" defaultValue="CORPORATE">
              <option value="CORPORATE">Corporate</option>
              <option value="OTHER">Other</option>
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-muted">Default currency</span>
            <input className="w-full rounded-xl border border-line bg-white/50 px-4 py-3 outline-none focus:border-ink" defaultValue="USD" />
          </label>
        </div>
        <button
          type="button"
          disabled
          title="Borrower creation is wired in Phase 3"
          className="inline-flex cursor-not-allowed items-center gap-2 rounded-full bg-ink px-5 py-3 text-sm font-semibold text-paper opacity-50"
        >
          Create synthetic borrower
        </button>
        <p className="text-xs text-muted">Disabled until the Phase 3 API and audit transaction are implemented.</p>
      </form>
    </div>
  );
}
