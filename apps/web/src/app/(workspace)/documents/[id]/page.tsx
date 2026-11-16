import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, LockKeyhole } from "lucide-react";
import { PageHeader, SectionLabel } from "@/components/page-header";
import { FeedbackBanner } from "@/components/feedback-banner";
import { apiFetch, errorCode, errorMessage, getMe, type ApiEnvelope } from "@/lib/api-server";

export const metadata = { title: "Document view" };
export const dynamic = "force-dynamic";

type Preview = {
  id: string;
  facilityId: string;
  mimeType: string;
  pageCount: number;
  pages: Array<{ number: number; text: string }>;
};

export default async function DocumentPreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const me = await getMe();
    if (me.user.role !== "ANALYST" && me.user.role !== "ADMIN") {
      return (
        <div className="space-y-6">
          <PageHeader title="Document restricted" description="Only an analyst may decrypt the original agreement." />
          <FeedbackBanner error="FORBIDDEN" message="Your role cannot retrieve original document bytes." />
        </div>
      );
    }
    const preview = (await apiFetch<ApiEnvelope<Preview>>(`/v1/documents/${id}/preview`)).data;
    return (
      <div className="space-y-8">
        <Link href={`/facilities/${preview.facilityId}`} className="inline-flex items-center gap-2 text-xs font-semibold text-muted hover:text-ink">
          <ArrowLeft className="size-3.5" /> Back to facility
        </Link>
        <PageHeader
          eyebrow="Analyst-only · decrypted in server memory"
          title="Agreement text"
          description="This view decrypts the stored ciphertext for the authorized analyst. It is never cached and never written to a plaintext temporary file."
        />
        <div className="rounded-2xl border border-warning/25 bg-warning/10 px-4 py-3 text-xs text-warning">
          <LockKeyhole className="mr-2 inline size-3.5" /> {preview.mimeType} · {preview.pageCount} pages · no-store response
        </div>
        <div className="space-y-5">
          {preview.pages.map((page) => (
            <section key={page.number} className="rounded-3xl border border-line bg-paper p-5 sm:p-7">
              <SectionLabel>Page {page.number}</SectionLabel>
              <pre className="mt-4 whitespace-pre-wrap break-words font-sans text-sm leading-7 text-ink">{page.text || "(no text on this page)"}</pre>
            </section>
          ))}
        </div>
      </div>
    );
  } catch (error) {
    if (errorCode(error) === "NOT_FOUND") notFound();
    return (
      <div className="space-y-6">
        <PageHeader title="Document unavailable" description="The document could not be decrypted or parsed." />
        <FeedbackBanner error={errorCode(error)} message={errorMessage(error)} />
      </div>
    );
  }
}
