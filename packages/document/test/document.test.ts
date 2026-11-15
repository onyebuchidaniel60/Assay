import { describe, expect, it } from "vitest";
import {
  DocumentRejectedError,
  MAX_UPLOAD_BYTES,
  detectDocumentKind,
  normalizeSpans,
  parseDocument,
  quoteAppearsOnPage,
  sanitizeFilename,
  tokenize,
} from "../src/index.js";

function minimalPdf(text: string, pages = 1): Uint8Array {
  const kids = Array.from({ length: pages }, (_, index) => `${3 + index * 2} 0 R`).join(" ");
  const pageObjects = Array.from({ length: pages }, (_, index) => {
    const pageId = 3 + index * 2;
    const contentId = pageId + 1;
    const escaped = text.replace(/[()\\]/g, "\\$&");
    return `${pageId} 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents ${contentId} 0 R /Resources << /Font << /F1 ${3 + pages * 2} 0 R >> >> >> endobj
${contentId} 0 obj << /Length ${escaped.length + 58} >> stream
BT /F1 12 Tf 72 720 Td (${escaped}) Tj ET
endstream endobj`;
  }).join("\n");
  const fontId = 3 + pages * 2;
  return new TextEncoder().encode(`%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [${kids}] /Count ${pages} >> endobj
${pageObjects}
${fontId} 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj
xref
0 ${fontId + 1}
0000000000 65535 f 
trailer << /Size ${fontId + 1} /Root 1 0 R >>
startxref
0
%%EOF`);
}

describe("upload validation", () => {
  it("accepts PDF magic bytes and UTF-8 text only", () => {
    expect(detectDocumentKind(minimalPdf("Agreement"), "application/pdf", "a.pdf")).toBe("application/pdf");
    expect(detectDocumentKind(new TextEncoder().encode("Covenant text"), "text/plain", "a.txt")).toBe("text/plain");
    expect(() => detectDocumentKind(new TextEncoder().encode("not a pdf"), "application/pdf", "a.pdf")).toThrow(
      DocumentRejectedError,
    );
    expect(() => detectDocumentKind(new TextEncoder().encode("MZ binary"), "application/zip", "a.zip")).toThrow(
      /PDF and plain-text/,
    );
  });

  it("rejects files over the 10 MiB cap before parsing", () => {
    const oversized = new Uint8Array(MAX_UPLOAD_BYTES + 1);
    expect(() => detectDocumentKind(oversized, "text/plain", "big.txt")).toThrow(/10 MiB/);
  });

  it("sanitizes filenames without preserving paths", () => {
    expect(sanitizeFilename("../../etc/passwd")).toBe("passwd");
    expect(sanitizeFilename("Synthetic Agreement (final).pdf")).toBe("Synthetic Agreement (final).pdf");
  });
});

describe("document parsing", () => {
  it("extracts page text and page count from a real PDF", async () => {
    const bytes = minimalPdf("Consolidated Total Debt shall not exceed 3.50x Adjusted EBITDA.", 2);
    const parsed = await parseDocument(bytes, "application/pdf");
    expect(parsed.pageCount).toBe(2);
    expect(parsed.pages).toHaveLength(2);
    expect(parsed.text).toContain("3.50x");
    expect(quoteAppearsOnPage(parsed.pages, 1, "shall not exceed")).toBe(true);
    expect(quoteAppearsOnPage(parsed.pages, 2, "shall not exceed")).toBe(true);
  });

  it("rejects an image-only/scanned PDF with no text layer", async () => {
    const bytes = minimalPdf("   ");
    await expect(parseDocument(bytes, "application/pdf")).rejects.toMatchObject({ code: "SCANNED_PDF" });
  });

  it("splits text documents on form feeds", async () => {
    const parsed = await parseDocument(
      new TextEncoder().encode("Page one covenant text with enough characters to pass.\fPage two evidence."),
      "text/plain",
    );
    expect(parsed.pageCount).toBe(2);
  });
});

describe("redaction tokenization", () => {
  it("produces stable tokens and honors false positives and additions", () => {
    const text = "Northwind Components Ltd facility NWC-2026-001.";
    const entities = [
      { entityType: "ORGANIZATION", start: 0, end: 25, score: 0.9 },
      { entityType: "ASSAY_REFERENCE", start: 35, end: 47, score: 0.85 },
    ];
    const first = tokenize(text, entities, "run-1");
    const second = tokenize(text, entities, "run-1");
    expect(first.tokenMap).toEqual(second.tokenMap);
    expect(first.redactedText).not.toContain("Northwind");
    expect(first.redactedText).not.toContain("NWC-2026-001");
    expect(Object.keys(first.tokenMap)).toHaveLength(2);

    const corrected = tokenize(text, entities, "run-1", { falsePositiveSpans: [{ start: 0, end: 25 }] });
    expect(corrected.redactedText).toContain("Northwind Components Ltd");
    expect(Object.keys(corrected.tokenMap)).toHaveLength(1);
  });

  it("drops overlapping lower-priority spans", () => {
    const spans = normalizeSpans(
      [
        { entityType: "DATE_TIME", start: 0, end: 12, score: 0.9 },
        { entityType: "ASSAY_ACCOUNT", start: 0, end: 12, score: 0.65 },
      ],
      20,
    );
    expect(spans).toHaveLength(1);
    expect(spans[0]?.entityType).toBe("ASSAY_ACCOUNT");
  });
});
