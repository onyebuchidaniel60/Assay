import Link from "next/link";
import { ArrowLeft, ShieldAlert } from "lucide-react";

export const metadata = { title: "Access denied" };

export default function ForbiddenPage() {
  return (
    <main className="grid min-h-screen place-items-center px-5">
      <div className="max-w-lg text-center">
        <span className="mx-auto grid size-14 place-items-center rounded-full bg-ink text-acid"><ShieldAlert className="size-6" /></span>
        <p className="mt-6 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted">403 · Access denied</p>
        <h1 className="display mt-3 text-5xl font-semibold">This view is outside your role.</h1>
        <p className="mt-4 text-sm leading-6 text-muted">
          Assay authorizes every server request against the active organization membership. The UI does not grant access by hiding or showing a control.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Link href="/dashboard" className="inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2.5 text-xs font-semibold text-paper hover:bg-ink-soft">
            <ArrowLeft className="size-3.5" /> Back to overview
          </Link>
          <Link href="/login" className="inline-flex items-center gap-2 rounded-full border border-line bg-paper px-4 py-2.5 text-xs font-semibold text-ink hover:bg-white">
            Sign in with another account
          </Link>
        </div>
      </div>
    </main>
  );
}
