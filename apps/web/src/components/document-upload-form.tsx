"use client";

import { useState } from "react";
import { Upload } from "lucide-react";
import { uploadDocumentAction } from "@/lib/actions";

const MAX_BYTES = 10 * 1024 * 1024;

export function DocumentUploadForm({ facilityId }: { facilityId: string }) {
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [clientError, setClientError] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-start gap-2 sm:items-end">
      <form
        action={uploadDocumentAction}
        encType="multipart/form-data"
        onSubmit={(event) => {
          const input = event.currentTarget.elements.namedItem("file") as HTMLInputElement | null;
          const file = input?.files?.[0];
          if (file && file.size > MAX_BYTES) {
            event.preventDefault();
            setClientError("TOO LARGE: The file exceeds the 10 MiB limit.");
          } else {
            setClientError(null);
          }
        }}
        className="flex flex-wrap items-center gap-2"
      >
        <input type="hidden" name="facilityId" value={facilityId} />
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-line bg-paper px-4 py-2 text-xs font-semibold text-ink transition hover:border-ink/40 hover:bg-white focus-within:outline-3 focus-within:outline-offset-2 focus-within:outline-ink">
          <Upload className="size-3.5" aria-hidden />
          <span>{selectedName ? `Choose PDF/TXT (${selectedName})` : "Choose PDF/TXT"}</span>
          <input
            type="file"
            name="file"
            accept=".pdf,.txt,application/pdf,text/plain"
            required
            aria-label="Choose PDF or UTF-8 text agreement"
            onChange={(event) => {
              const file = event.currentTarget.files?.[0];
              setSelectedName(file ? file.name : null);
              if (file && file.size > MAX_BYTES) {
                setClientError("TOO LARGE: The file exceeds the 10 MiB limit.");
              } else {
                setClientError(null);
              }
            }}
            className="sr-only"
          />
        </label>
        <button
          type="submit"
          className="inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-xs font-semibold text-paper transition hover:bg-ink-soft"
        >
          Upload agreement
        </button>
      </form>
      {clientError ? (
        <p role="alert" className="text-xs font-semibold text-danger">
          {clientError}
        </p>
      ) : null}
    </div>
  );
}
