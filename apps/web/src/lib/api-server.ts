import { cookies } from "next/headers";

export type ApiEnvelope<T> = { data: T; meta?: { requestId?: string; replayed?: boolean } };

export class ApiClientError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

function apiBase(): string {
  return (
    process.env.API_PUBLIC_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    "http://localhost:3001"
  ).replace(/\/$/, "");
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const cookieHeader = (await cookies()).toString();
  const response = await fetch(`${apiBase()}${path}`, {
    ...init,
    headers: {
      ...(typeof init.body === "string" ? { "content-type": "application/json" } : {}),
      ...(init.headers ?? {}),
      cookie: cookieHeader,
    },
    cache: "no-store",
  });
  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }
  if (!response.ok) {
    const error = (body as { error?: { code?: string; message?: string; details?: unknown } } | null)?.error;
    throw new ApiClientError(
      response.status,
      error?.code ?? "REQUEST_FAILED",
      error?.message ?? "The API request failed.",
      error?.details,
    );
  }
  return body as T;
}

export type CurrentUser = {
  userId: string;
  email: string | null;
  name: string | null;
  organizationId: string;
  organizationName: string;
  role: "ANALYST" | "MANAGER" | "AUDITOR" | "ADMIN";
};

export type MeResponse = ApiEnvelope<{
  user: CurrentUser;
  capabilities: { writeCovenant: boolean; approve: boolean; verifyAudit: boolean; administrate: boolean };
}>;

export async function getMe(): Promise<MeResponse["data"]> {
  return (await apiFetch<MeResponse>("/v1/me")).data;
}

export type Borrower = {
  id: string;
  displayAlias: string;
  referenceToken: string;
  status: "ACTIVE" | "ARCHIVED";
  version: number;
  facilityCount?: number;
  createdAt: string;
  updatedAt: string;
};

export type Facility = {
  id: string;
  borrowerId: string;
  facilityReferenceToken: string;
  label: string;
  currency: string;
  status: "ACTIVE" | "CLOSED";
  version: number;
  createdAt: string;
  updatedAt: string;
};

export type DocumentSummary = {
  id: string;
  facilityId: string;
  status: string;
  mimeType: string;
  sizeBytes: number;
  pageCount: number | null;
  failureCode: string | null;
  originalFilename?: string;
  createdAt: string;
};

export type RunSummary = {
  id: string;
  runNumber: number;
  status: string;
  resultCode: string | null;
  failureCode: string | null;
  termsVersion: number | null;
  financialInputsHash: string | null;
  version: number;
  documentId?: string;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
};

export type FacilityListItem = Facility & {
  borrowerAlias: string;
  borrowerReference: string;
};

export type RunListItem = RunSummary & {
  thresholdBps: number | null;
  borrowerId: string;
  borrowerReference: string;
  borrowerAlias: string | null;
  facilityId: string;
  facilityReference: string;
  facilityLabel: string;
};

export type FacilityDetail = Facility & {
  borrower: Borrower;
  documents: DocumentSummary[];
  analysisRuns: RunSummary[];
};

export type RunDetail = RunSummary & {
  borrower: { id: string; displayAlias: string; referenceToken: string };
  facility: { id: string; label: string; facilityReferenceToken: string; currency: string };
  document: { id: string; status: string; pageCount: number | null; mimeType: string };
  terms: Record<string, unknown> | null;
  proof: Record<string, unknown> | null;
  redaction: Array<{ revision: number; entityCount: number; reviewedAt: string | null }>;
};

export type ReppoEvaluation = {
  id: string;
  feedbackRecordId: string;
  providerEvalId: string | null;
  status: "PENDING" | "COMPLETED" | "FAILED" | "TIMEOUT" | string;
  providerStatus: string | null;
  score: number | null;
  decision: string | null;
  confidence: string | null;
  route: string | null;
  result: Record<string, unknown> | null;
  creditsCharged: number | null;
  errorCode: string | null;
  errorMessage: string | null;
  maxWaitMinutes: number;
  submittedAt: string | null;
  completedAt: string | null;
  lastPolledAt: string | null;
};

export function errorMessage(error: unknown): string {
  if (error instanceof ApiClientError) return error.message;
  if (error instanceof Error) return error.message;
  return "Something went wrong.";
}

export function errorCode(error: unknown): string {
  return error instanceof ApiClientError ? error.code : "UNEXPECTED_ERROR";
}
