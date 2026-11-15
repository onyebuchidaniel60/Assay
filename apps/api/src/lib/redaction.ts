import { normalizeSpans, tokenize, type PresidioClient, type PresidioEntity } from "@assay/document";

export type PageText = { number: number; text: string };

export type RedactedRevision = {
  pages: PageText[];
  modelText: string;
  tokenMap: Record<string, string>;
  entities: Array<PresidioEntity & { page: number }>;
};

function pageOffsets(pages: PageText[]) {
  const offsets: Array<{ page: number; start: number; end: number }> = [];
  let cursor = 0;
  for (const page of pages) {
    offsets.push({ page: page.number, start: cursor, end: cursor + page.text.length });
    cursor += page.text.length + 2;
  }
  return { offsets, length: cursor };
}

function joinPages(pages: PageText[]): string {
  return pages.map((page) => page.text).join("\n\n");
}

function modelText(pages: PageText[]): string {
  return pages.map((page) => `--- PAGE ${page.number} ---\n${page.text}`).join("\n\n");
}

function tokenizeWithEntities(
  pages: PageText[],
  entities: Array<PresidioEntity & { page: number }>,
  scope: string,
  adjustments: {
    falsePositiveSpans?: Array<{ page: number; start: number; end: number }>;
    additionalSpans?: Array<PresidioEntity & { page: number }>;
  } = {},
): RedactedRevision {
  const mergedTokenMap: Record<string, string> = {};
  const keptEntities: Array<PresidioEntity & { page: number }> = [];
  const redactedPages = pages.map((page) => {
    const pageEntities = entities.filter((entity) => entity.page === page.number);
    const removed = (adjustments.falsePositiveSpans ?? []).filter((span) => span.page === page.number);
    const additions = (adjustments.additionalSpans ?? []).filter((entity) => entity.page === page.number);
    const result = tokenize(page.text, pageEntities, scope, {
      falsePositiveSpans: removed,
      additionalSpans: additions,
    });
    Object.assign(mergedTokenMap, result.tokenMap);
    for (const entity of result.entities) keptEntities.push({ ...entity, page: page.number });
    return { number: page.number, text: result.redactedText };
  });
  return {
    pages: redactedPages,
    modelText: modelText(redactedPages),
    tokenMap: mergedTokenMap,
    entities: keptEntities,
  };
}

export async function buildRedaction(
  pages: PageText[],
  presidio: PresidioClient,
  scope: string,
): Promise<RedactedRevision> {
  const fullText = joinPages(pages);
  const raw = await presidio.analyze(fullText);
  const normalized = normalizeSpans(raw, fullText.length);
  const { offsets } = pageOffsets(pages);
  const entities: Array<PresidioEntity & { page: number }> = [];
  for (const entity of normalized) {
    const page = offsets.find((item) => entity.start >= item.start && entity.end <= item.end);
    if (!page) continue;
    entities.push({
      entityType: entity.entityType,
      start: entity.start - page.start,
      end: entity.end - page.start,
      score: entity.score,
      page: page.page,
    });
  }
  return tokenizeWithEntities(pages, entities, scope);
}

export function applyRedactionAdjustments(
  pages: PageText[],
  entities: Array<PresidioEntity & { page: number }>,
  scope: string,
  adjustments: {
    falsePositiveSpans?: Array<{ page: number; start: number; end: number }>;
    additionalSpans?: Array<PresidioEntity & { page: number }>;
  },
): RedactedRevision {
  return tokenizeWithEntities(pages, entities, scope, adjustments);
}
