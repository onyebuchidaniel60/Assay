import { createHash } from "node:crypto";
import { PDFParse } from "pdf-parse";

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export const MAX_PDF_PAGES = 40;
const MIN_EXTRACTED_TEXT_CHARS = 40;

export type DocumentKind = "application/pdf" | "text/plain";

export type ParsedPage = { number: number; text: string };

export type ParsedDocument = {
  kind: DocumentKind;
  pages: ParsedPage[];
  text: string;
  pageCount: number;
};

export class DocumentRejectedError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "TOO_LARGE"
      | "UNSUPPORTED_TYPE"
      | "MAGIC_BYTES"
      | "ENCRYPTED_PDF"
      | "SCANNED_PDF"
      | "PAGE_LIMIT"
      | "EMPTY_TEXT"
      | "PARSE_FAILED",
  ) {
    super(message);
    this.name = "DocumentRejectedError";
  }
}

function startsWithPdfMagic(bytes: Uint8Array): boolean {
  const header = new TextDecoder("latin1").decode(bytes.slice(0, 1024));
  return header.includes("%PDF-");
}

function isUtf8Text(bytes: Uint8Array): boolean {
  try {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    if (text.includes("\u0000")) return false;
    const sample = text.slice(0, 4096);
    if (sample.length === 0) return false;
    const printable = [...sample].filter((char) => {
      const code = char.codePointAt(0) ?? 0;
      return code === 9 || code === 10 || code === 13 || (code >= 32 && code !== 127);
    }).length;
    return printable / sample.length >= 0.95;
  } catch {
    return false;
  }
}

export function detectDocumentKind(
  bytes: Uint8Array,
  declaredMime: string | undefined,
  filename: string,
): DocumentKind {
  if (bytes.byteLength === 0) throw new DocumentRejectedError("The file is empty.", "EMPTY_TEXT");
  if (bytes.byteLength > MAX_UPLOAD_BYTES) throw new DocumentRejectedError("The file exceeds 10 MiB.", "TOO_LARGE");
  const mime = (declaredMime ?? "").toLowerCase();
  const extension = filename.toLowerCase().split(".").pop() ?? "";

  if (mime === "application/pdf" || extension === "pdf") {
    if (!startsWithPdfMagic(bytes)) {
      throw new DocumentRejectedError("The PDF signature does not match the declared type.", "MAGIC_BYTES");
    }
    return "application/pdf";
  }
  if (mime === "text/plain" || extension === "txt") {
    if (!isUtf8Text(bytes)) {
      throw new DocumentRejectedError("The text file must be valid UTF-8 without binary content.", "MAGIC_BYTES");
    }
    return "text/plain";
  }
  throw new DocumentRejectedError("Only PDF and plain-text agreements are accepted.", "UNSUPPORTED_TYPE");
}

export function sanitizeFilename(filename: string): string {
  const base = filename.replace(/\\/g, "/").split("/").pop() ?? "agreement";
  const cleaned = base.replace(/[^A-Za-z0-9._() -]/g, "_").replace(/\s+/g, " ").trim();
  return (cleaned.length > 0 ? cleaned : "agreement").slice(0, 180);
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export async function parseDocument(
  bytes: Uint8Array,
  kind: DocumentKind,
  filename = "agreement",
): Promise<ParsedDocument> {
  if (kind === "text/plain") {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    const pages = text.split(/\f/).map((pageText, index) => ({ number: index + 1, text: pageText }));
    if (normalizeWhitespace(text).length < MIN_EXTRACTED_TEXT_CHARS) {
      throw new DocumentRejectedError("The document does not contain enough text.", "EMPTY_TEXT");
    }
    return { kind, pages, text, pageCount: pages.length };
  }

  let parser: PDFParse | undefined;
  try {
    parser = new PDFParse({ data: bytes });
    const result = await parser.getText();
    const pages = result.pages.map((page) => ({
      number: page.num,
      text: page.text.replace(/\n*--\s*\d+\s+of\s+\d+\s*--\n*$/i, "").trim(),
    }));
    const pageCount = result.total ?? pages.length;
    if (pageCount > MAX_PDF_PAGES) {
      throw new DocumentRejectedError("The PDF exceeds the 40-page limit.", "PAGE_LIMIT");
    }
    const text = pages.map((page) => page.text).join("\n\n");
    if (normalizeWhitespace(text).length < MIN_EXTRACTED_TEXT_CHARS) {
      throw new DocumentRejectedError(
        "This PDF has no extractable text layer. Scanned agreements are not supported in the MVP.",
        "SCANNED_PDF",
      );
    }
    return { kind, pages, text, pageCount };
  } catch (error) {
    if (error instanceof DocumentRejectedError) throw error;
    const message = error instanceof Error ? error.message.toLowerCase() : "";
    if (message.includes("password") || message.includes("encrypt")) {
      throw new DocumentRejectedError("Password-protected PDFs are not supported.", "ENCRYPTED_PDF");
    }
    throw new DocumentRejectedError(`The PDF could not be parsed (${sanitizeFilename(filename)}).`, "PARSE_FAILED");
  } finally {
    await parser?.destroy().catch(() => undefined);
  }
}

/** Evidence quotes must appear on the cited page after whitespace normalization. */
export function quoteAppearsOnPage(pages: ParsedPage[], page: number, quote: string): boolean {
  const target = pages.find((item) => item.number === page);
  if (!target) return false;
  const haystack = normalizeWhitespace(target.text).toLowerCase();
  const needle = normalizeWhitespace(quote).toLowerCase();
  if (needle.length === 0) return false;
  return haystack.includes(needle);
}

export type PresidioEntity = {
  entityType: string;
  start: number;
  end: number;
  score: number;
};

export type PresidioClientConfig = {
  baseUrl?: string | undefined;
  token?: string | undefined;
  timeoutMs?: number | undefined;
};

export class PresidioUnavailableError extends Error {
  constructor(message = "The redaction service is unavailable.") {
    super(message);
    this.name = "PresidioUnavailableError";
  }
}

function stableToken(entityType: string, value: string, scope: string): string {
  const digest = createHash("sha256").update(`${entityType}:${value}:${scope}`).digest("hex").slice(0, 8).toUpperCase();
  return `[${entityType}_${digest}]`;
}

const ENTITY_PRIORITY: Record<string, number> = {
  ASSAY_REFERENCE: 5,
  ASSAY_EMAIL: 5,
  ASSAY_ACCOUNT: 4,
  EMAIL_ADDRESS: 4,
  PERSON: 3,
  ORGANIZATION: 2,
};

export function normalizeSpans(entities: PresidioEntity[], textLength: number): PresidioEntity[] {
  const valid = entities
    .filter((entity) => entity.start >= 0 && entity.end > entity.start && entity.end <= textLength)
    .sort((left, right) => {
      const priority = (ENTITY_PRIORITY[right.entityType] ?? 1) - (ENTITY_PRIORITY[left.entityType] ?? 1);
      return priority !== 0 ? priority : right.score - left.score;
    });
  const kept: PresidioEntity[] = [];
  for (const entity of valid) {
    if (kept.some((item) => entity.start < item.end && entity.end > item.start)) continue;
    kept.push(entity);
  }
  return kept.sort((left, right) => left.start - right.start);
}

export type TokenizationResult = {
  redactedText: string;
  tokenMap: Record<string, string>;
  entities: PresidioEntity[];
};

export function tokenize(
  text: string,
  entities: PresidioEntity[],
  scope: string,
  adjustments: { falsePositiveSpans?: Array<{ start: number; end: number }>; additionalSpans?: PresidioEntity[] } = {},
): TokenizationResult {
  const removed = adjustments.falsePositiveSpans ?? [];
  const filtered = entities.filter(
    (entity) => !removed.some((span) => entity.start < span.end && entity.end > span.start),
  );
  const merged = normalizeSpans([...filtered, ...(adjustments.additionalSpans ?? [])], text.length);

  let redactedText = text;
  const tokenMap: Record<string, string> = {};
  for (const entity of [...merged].reverse()) {
    const value = text.slice(entity.start, entity.end);
    const token = stableToken(entity.entityType, value, scope);
    tokenMap[token] = value;
    redactedText = redactedText.slice(0, entity.start) + token + redactedText.slice(entity.end);
  }
  return { redactedText, tokenMap, entities: merged };
}

export class PresidioClient {
  private readonly baseUrl: string;
  private awake = false;
  constructor(private readonly config: PresidioClientConfig = {}) {
    this.baseUrl = (config.baseUrl ?? "http://127.0.0.1:5001").replace(/\/$/, "");
  }

  /**
   * Render free services sleep. Wake the redaction service before the real
   * request and allow a cold start rather than treating it as a failed run.
   */
  private async ensureAwake(): Promise<void> {
    if (this.awake) return;
    for (let attempt = 0; attempt < 60; attempt += 1) {
      try {
        const response = await fetch(`${this.baseUrl}/health`, { signal: AbortSignal.timeout(15_000) });
        if (response.ok) {
          this.awake = true;
          return;
        }
      } catch {
        // Keep waiting through a cold start or a transient network failure.
      }
      await new Promise((resolve) => setTimeout(resolve, 5_000));
    }
    throw new PresidioUnavailableError("The redaction service did not wake up.");
  }

  async analyze(text: string, scoreThreshold = 0.35): Promise<PresidioEntity[]> {
    await this.ensureAwake();
    let lastError: unknown;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        return await this.analyzeOnce(text, scoreThreshold);
      } catch (error) {
        lastError = error;
        if (attempt === 0) await new Promise((resolve) => setTimeout(resolve, 2_000));
      }
    }
    throw lastError instanceof PresidioUnavailableError ? lastError : new PresidioUnavailableError();
  }

  private async analyzeOnce(text: string, scoreThreshold: number): Promise<PresidioEntity[]> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs ?? 90_000);
    try {
      const headers: Record<string, string> = { "content-type": "application/json" };
      if (this.config.token) headers.authorization = `Bearer ${this.config.token}`;
      const response = await fetch(`${this.baseUrl}/analyze`, {
        method: "POST",
        headers,
        body: JSON.stringify({ text, language: "en", score_threshold: scoreThreshold }),
        signal: controller.signal,
      });
      if (!response.ok) throw new PresidioUnavailableError(`Redaction service returned HTTP ${response.status}.`);
      const body = (await response.json()) as {
        entities?: Array<{ entity_type?: string; entityType?: string; start: number; end: number; score: number; text?: string }>;
      };
      if (!Array.isArray(body.entities)) throw new PresidioUnavailableError("Redaction service returned an invalid body.");
      const allowed = new Set([
        "PERSON",
        "ORGANIZATION",
        "EMAIL_ADDRESS",
        "PHONE_NUMBER",
        "ASSAY_REFERENCE",
        "ASSAY_ACCOUNT",
        "ASSAY_EMAIL",
      ]);
      const generic = new Set([
        "borrower",
        "borrowers",
        "lender",
        "lenders",
        "facility",
        "facilities",
        "agent",
        "administrative agent",
        "company",
        "agreement",
        "bank",
        "usd",
        "dollars",
        "article",
        "schedule",
        "lender a",
        "lender b",
      ]);
      const corporateSuffix = /\b(ltd|limited|inc|incorporated|llc|plc|corp|corporation|gmbh|lp|llp|co|company|group|holdings|bank)\b/i;
      return body.entities
        .map((entity) => ({
          entityType: entity.entity_type ?? entity.entityType ?? "",
          start: entity.start,
          end: entity.end,
          score: entity.score,
          text: entity.text ?? "",
        }))
        .filter((entity) => {
          if (!allowed.has(entity.entityType)) return false;
          const value = entity.text.trim();
          if (value.length < 3) return false;
          if (generic.has(value.toLowerCase())) return false;
          if (/(consolidated|ebitda|debt|leverage|covenant|test period|interest|principal|financial|borrowings|equity|maximum|period|agreement|facility|borrower|lender)/i.test(value)) {
            return false;
          }
          if (entity.entityType === "ORGANIZATION") {
            return corporateSuffix.test(value) || value.split(/\s+/).length >= 2;
          }
          if (entity.entityType === "PERSON") {
            return value.split(/\s+/).length >= 2;
          }
          return true;
        })
        .map((entity) => ({
          entityType: entity.entityType,
          start: entity.start,
          end: entity.end,
          score: entity.score,
        }));
    } catch (error) {
      if (error instanceof PresidioUnavailableError) throw error;
      throw new PresidioUnavailableError();
    } finally {
      clearTimeout(timeout);
    }
  }
}

export function presidioFromEnv(env: NodeJS.ProcessEnv = process.env): PresidioClient {
  return new PresidioClient({
    baseUrl: env.PRESIDIO_URL,
    token: env.PRESIDIO_SERVICE_TOKEN,
  });
}
