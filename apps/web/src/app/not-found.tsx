import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, SearchX } from "lucide-react";

export const metadata = { title: "Not found" };

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center px-5">
      <div className="max-w-lg text-center">
        <Image src="/brand/assay-logo.png" alt="Assay" width={64} height={64} priority className="mx-auto mb-6 rounded-2xl" />
        <span className="mx-auto grid size-14 place-items-center rounded-full bg-ink text-acid"><SearchX className="size-6" /></span>
        <p className="mt-6 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted">404 · Not found</p>
        <h1 className="display mt-3 text-5xl font-semibold">That record is not in this workspace.</h1>
        <p className="mt-4 text-sm leading-6 text-muted">
          The requested resource does not exist or is not accessible within the active membership. Assay avoids revealing cross-tenant existence.
        </p>
        <Link href="/dashboard" className="mt-7 inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2.5 text-xs font-semibold text-paper hover:bg-ink-soft">
          <ArrowLeft className="size-3.5" /> Back to overview
        </Link>
      </div>
    </main>
  );
}
