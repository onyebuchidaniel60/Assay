"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ApiClientError, apiFetch, type ApiEnvelope } from "./api-server";
import { decimalToMinor } from "./money";
import { auth } from "./auth/server";

type ActionResult = { ok: true } | { ok: false; code: string; message: string };

async function perform<T>(
  path: string,
  init: RequestInit,
): Promise<{ ok: true; data: T } | { ok: false; code: string; message: string }> {
  try {
    const data = await apiFetch<T>(path, init);
    return { ok: true, data };
  } catch (error) {
    if (error instanceof ApiClientError) {
      return { ok: false, code: error.code, message: error.message };
    }
    return { ok: false, code: "UNEXPECTED_ERROR", message: "The API could not be reached." };
  }
}

function withQuery(base: string, values: Record<string, string>): string {
  const url = new URL(base, "http://assay.local");
  for (const [key, value] of Object.entries(values)) url.searchParams.set(key, value);
  return `${url.pathname}${url.search}`;
}

function field(form: FormData, name: string): string {
  return String(form.get(name) ?? "").trim();
}

export async function createBorrowerAction(formData: FormData): Promise<void> {
  const result = await perform<ApiEnvelope<{ id: string }>>("/v1/borrowers", {
    method: "POST",
    headers: { "idempotency-key": `borrower-${randomUUID()}` },
    body: JSON.stringify({
      displayAlias: field(formData, "displayAlias"),
      referenceToken: field(formData, "referenceToken"),
    }),
  });
  if (!result.ok) {
    redirect(withQuery("/borrowers/new", { error: result.code, message: result.message }));
  }
  revalidatePath("/borrowers");
  redirect(withQuery("/borrowers", { ok: "Borrower created" }));
}

export async function createFacilityAction(formData: FormData): Promise<void> {
  const borrowerId = field(formData, "borrowerId");
  const result = await perform<ApiEnvelope<{ id: string }>>(`/v1/borrowers/${borrowerId}/facilities`, {
    method: "POST",
    body: JSON.stringify({
      facilityReferenceToken: field(formData, "facilityReferenceToken"),
      label: field(formData, "label"),
      currency: field(formData, "currency") || "USD",
    }),
  });
  if (!result.ok) {
    redirect(withQuery(`/borrowers/${borrowerId}`, { error: result.code, message: result.message }));
  }
  revalidatePath("/facilities");
  redirect(withQuery(`/facilities/${result.data.data.id}`, { ok: "Facility created" }));
}

export async function uploadDocumentAction(formData: FormData): Promise<void> {
  const facilityId = field(formData, "facilityId");
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    redirect(withQuery(`/facilities/${facilityId}`, { error: "FILE_REQUIRED", message: "Choose a PDF or text agreement." }));
  }
  if (file.size > 10 * 1024 * 1024) {
    redirect(withQuery(`/facilities/${facilityId}`, { error: "TOO_LARGE", message: "The file exceeds the 10 MiB limit." }));
  }
  const upload = new FormData();
  upload.append("file", file, file.name);
  const result = await perform<ApiEnvelope<{ id: string }>>(`/v1/facilities/${facilityId}/documents`, {
    method: "POST",
    body: upload,
  });
  if (!result.ok) {
    redirect(withQuery(`/facilities/${facilityId}`, { error: result.code, message: result.message }));
  }
  revalidatePath(`/facilities/${facilityId}`);
  redirect(withQuery(`/facilities/${facilityId}`, { ok: "Agreement uploaded" }));
}

export async function createAnalysisAction(formData: FormData): Promise<void> {
  const facilityId = field(formData, "facilityId");
  const documentId = field(formData, "documentId");
  const result = await perform<ApiEnvelope<{ id: string }>>("/v1/analysis-runs", {
    method: "POST",
    headers: { "idempotency-key": `analysis-${randomUUID()}` },
    body: JSON.stringify({ facilityId, documentId }),
  });
  if (!result.ok) {
    redirect(withQuery(`/facilities/${facilityId}`, { error: result.code, message: result.message }));
  }
  revalidatePath("/analysis-runs");
  revalidatePath(`/facilities/${facilityId}`);
  redirect(`/analysis-runs/${result.data.data.id}`);
}

function runPath(runId: string) {
  return `/analysis-runs/${runId}`;
}

export async function confirmRedactionAction(formData: FormData): Promise<void> {
  const runId = field(formData, "runId");
  const result = await perform(`/v1/analysis-runs/${runId}/redaction-review`, {
    method: "POST",
    body: JSON.stringify({ revision: Number(field(formData, "revision")), decision: "CONFIRM" }),
  });
  if (!result.ok) redirect(withQuery(runPath(runId), { error: result.code, message: result.message }));
  revalidatePath(runPath(runId));
  redirect(withQuery(runPath(runId), { ok: "Redaction confirmed" }));
}

export async function rejectRedactionAction(formData: FormData): Promise<void> {
  const runId = field(formData, "runId");
  const result = await perform(`/v1/analysis-runs/${runId}/redaction-review`, {
    method: "POST",
    body: JSON.stringify({
      revision: Number(field(formData, "revision")),
      decision: "REJECT",
      rationale: field(formData, "rationale") || "Rejected during redaction review.",
    }),
  });
  if (!result.ok) redirect(withQuery(runPath(runId), { error: result.code, message: result.message }));
  revalidatePath(runPath(runId));
  redirect(withQuery(runPath(runId), { ok: "Run stopped at redaction review" }));
}

export async function startExtractionAction(formData: FormData): Promise<void> {
  const runId = field(formData, "runId");
  const result = await perform(`/v1/analysis-runs/${runId}/extraction`, { method: "POST" });
  if (!result.ok) redirect(withQuery(runPath(runId), { error: result.code, message: result.message }));
  revalidatePath(runPath(runId));
  redirect(withQuery(runPath(runId), { ok: "Confidential extraction started" }));
}

export async function reviewTermsAction(formData: FormData): Promise<void> {
  const runId = field(formData, "runId");
  const decision = field(formData, "decision") === "REJECT" ? "REJECT" : "CONFIRM";
  const body: Record<string, unknown> = {
    revision: Number(field(formData, "revision")),
    decision,
  };
  if (decision === "REJECT") {
    body.rationale = field(formData, "rationale") || "Terms rejected during analyst review.";
  } else {
    const threshold = Number(field(formData, "thresholdBps"));
    if (Number.isFinite(threshold) && threshold > 0) {
      body.edits = { thresholdBps: threshold };
    }
  }
  const result = await perform(`/v1/analysis-runs/${runId}/terms-review`, {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (!result.ok) redirect(withQuery(runPath(runId), { error: result.code, message: result.message }));
  revalidatePath(runPath(runId));
  redirect(withQuery(runPath(runId), { ok: decision === "CONFIRM" ? "Covenant terms confirmed" : "Run stopped at terms review" }));
}

export async function saveFinancialsAction(formData: FormData): Promise<void> {
  const runId = field(formData, "runId");
  const currency = field(formData, "currency") || "USD";
  const reported = decimalToMinor(field(formData, "reportedEbitda"));
  const debt = decimalToMinor(field(formData, "totalDebt"));
  if (!reported || !debt) {
    redirect(withQuery(runPath(runId), { error: "INVALID_AMOUNT", message: "Enter positive dollar amounts with up to two decimals." }));
  }
  const codes = formData.getAll("addbackCode").map(String);
  const amounts = formData.getAll("addbackAmount").map(String);
  const addbacks = codes
    .map((code, index) => ({ code, amount: amounts[index] ?? "" }))
    .filter((item) => item.code && item.amount.trim().length > 0)
    .map((item) => {
      const amountMinor = decimalToMinor(item.amount);
      return amountMinor ? { code: item.code, amountMinor } : null;
    })
    .filter((item): item is { code: string; amountMinor: string } => item !== null);
  if (formData.get("attest") !== "on") {
    redirect(withQuery(runPath(runId), { error: "ATTESTATION_REQUIRED", message: "Confirm the analyst attestation before saving." }));
  }
  const result = await perform(`/v1/analysis-runs/${runId}/financial-inputs`, {
    method: "PUT",
    body: JSON.stringify({
      currency,
      reportedEbitdaMinor: reported,
      totalDebtMinor: debt,
      addbacks,
      attest: true,
      termsVersion: Number(field(formData, "termsVersion")),
    }),
  });
  if (!result.ok) redirect(withQuery(runPath(runId), { error: result.code, message: result.message }));
  revalidatePath(runPath(runId));
  redirect(withQuery(runPath(runId), { ok: "Financial inputs confirmed" }));
}

export async function calculateAction(formData: FormData): Promise<void> {
  const runId = field(formData, "runId");
  const result = await perform(`/v1/analysis-runs/${runId}/calculate`, { method: "POST" });
  if (!result.ok) redirect(withQuery(runPath(runId), { error: result.code, message: result.message }));
  revalidatePath(runPath(runId));
  redirect(withQuery(runPath(runId), { ok: "Deterministic calculation complete" }));
}

export async function generateProofAction(formData: FormData): Promise<void> {
  const runId = field(formData, "runId");
  const result = await perform(`/v1/analysis-runs/${runId}/proof`, {
    method: "POST",
    headers: { "idempotency-key": `proof-${runId}` },
    body: JSON.stringify({}),
  });
  if (!result.ok) redirect(withQuery(runPath(runId), { error: result.code, message: result.message }));
  revalidatePath(runPath(runId));
  redirect(withQuery(runPath(runId), { ok: "Compliance proof verified" }));
}

export async function approvalAction(formData: FormData): Promise<void> {
  const runId = field(formData, "runId");
  const decision = field(formData, "decision") === "REJECT" ? "REJECT" : "APPROVE";
  const result = await perform(`/v1/analysis-runs/${runId}/approvals`, {
    method: "POST",
    headers: { "idempotency-key": `approval-${runId}-${decision}` },
    body: JSON.stringify({
      decision,
      proofArtifactId: field(formData, "proofArtifactId"),
      analysisVersion: Number(field(formData, "analysisVersion")),
      riskAcknowledged: formData.get("riskAcknowledged") === "on",
      ...(field(formData, "rationale") ? { rationale: field(formData, "rationale") } : {}),
    }),
  });
  if (!result.ok) redirect(withQuery(`/approvals?run=${runId}`, { error: result.code, message: result.message }));
  revalidatePath("/approvals");
  revalidatePath(runPath(runId));
  redirect(withQuery("/approvals", { ok: decision === "APPROVE" ? "Analysis approved" : "Analysis rejected" }));
}

export async function cancelRunAction(formData: FormData): Promise<void> {
  const runId = field(formData, "runId");
  const result = await perform(`/v1/analysis-runs/${runId}/cancel`, { method: "POST", body: JSON.stringify({}) });
  if (!result.ok) redirect(withQuery(runPath(runId), { error: result.code, message: result.message }));
  revalidatePath(runPath(runId));
  redirect(withQuery(runPath(runId), { ok: "Analysis cancelled" }));
}

export async function submitFeedbackAction(formData: FormData): Promise<void> {
  const runId = field(formData, "runId");
  const changedField = field(formData, "changedField") || "correction";
  const before = field(formData, "beforeValue");
  const after = field(formData, "afterValue");
  const result = await perform<ApiEnvelope<{ id: string; reppo: { id?: string; status: string; errorMessage?: string } }>>(
    "/v1/feedback",
    {
      method: "POST",
      body: JSON.stringify({
        analysisRunId: runId,
        correctionType: field(formData, "correctionType") || "OTHER",
        beforeValue: { [changedField]: before },
        afterValue: { [changedField]: after },
        note: field(formData, "note") || undefined,
        submitToReppo: formData.get("submitToReppo") === "on",
        maxWaitMinutes: Number(field(formData, "maxWaitMinutes")) || 10,
      }),
    },
  );
  if (!result.ok) redirect(withQuery(runPath(runId), { error: result.code, message: result.message }));
  const reppoId = result.data.data.reppo?.id;
  revalidatePath(runPath(runId));
  if (reppoId) redirect(`/evaluations/${reppoId}`);
  redirect(withQuery(runPath(runId), { ok: "Correction recorded; Reppo submission not requested" }));
}

export async function requestSecEvidenceAction(formData: FormData): Promise<void> {
  const runId = field(formData, "runId");
  const result = await perform(`/v1/analysis-runs/${runId}/external-evidence/free`, {
    method: "POST",
    headers: { "idempotency-key": `evidence-sec-${runId}-${randomUUID()}` },
    body: JSON.stringify({
      kind: field(formData, "kind") || "REVENUE_VERIFICATION",
      providerId: "sec-edgar",
      ...(field(formData, "ticker") ? { ticker: field(formData, "ticker") } : {}),
      ...(field(formData, "cik") ? { cik: field(formData, "cik") } : {}),
      ...(field(formData, "fiscalYear") ? { fiscalYear: Number(field(formData, "fiscalYear")) } : {}),
      linkedField: field(formData, "linkedField") || "reported revenue",
      reason: field(formData, "reason") || "Independent verification of a public-company financial figure.",
      publicReferenceConfirmed: formData.get("publicReferenceConfirmed") === "on",
    }),
  });
  if (!result.ok) redirect(withQuery(runPath(runId), { error: result.code, message: result.message }));
  revalidatePath(runPath(runId));
  redirect(withQuery(runPath(runId), { ok: "External evidence retrieved and linked to this run" }));
}

export async function quotePaidEvidenceAction(formData: FormData): Promise<void> {
  const runId = field(formData, "runId");
  const result = await perform(`/v1/analysis-runs/${runId}/external-evidence/quote`, {
    method: "POST",
    headers: { "idempotency-key": `evidence-quote-${runId}-${randomUUID()}` },
    body: JSON.stringify({
      kind: field(formData, "kind") || "EQUITY_FUNDAMENTALS",
      providerId: field(formData, "providerId") || "lonestar-oracle",
      ticker: field(formData, "ticker"),
      ...(field(formData, "fiscalYear") ? { fiscalYear: Number(field(formData, "fiscalYear")) } : {}),
      linkedField: field(formData, "linkedField") || "public-company reference",
      reason: field(formData, "reason") || "Optional market-context evidence for the linked public reference.",
      publicReferenceConfirmed: formData.get("publicReferenceConfirmed") === "on",
    }),
  });
  if (!result.ok) redirect(withQuery(runPath(runId), { error: result.code, message: result.message }));
  revalidatePath(runPath(runId));
  redirect(withQuery(runPath(runId), { ok: "Payment quote recorded — review the deterministic policy decision" }));
}

export async function authorizePaymentAction(formData: FormData): Promise<void> {
  const runId = field(formData, "runId");
  const result = await perform(`/v1/analysis-runs/${runId}/external-evidence/authorize`, {
    method: "POST",
    body: JSON.stringify({
      paymentIntentId: field(formData, "paymentIntentId"),
      expectedQuoteSha256: field(formData, "expectedQuoteSha256"),
      confirm: true,
    }),
  });
  if (!result.ok) redirect(withQuery(runPath(runId), { error: result.code, message: result.message }));
  revalidatePath(runPath(runId));
  redirect(withQuery(runPath(runId), { ok: "Payment authorized and queued for execution" }));
}

export async function reconcilePaymentAction(formData: FormData): Promise<void> {
  const runId = field(formData, "runId");
  const paymentIntentId = field(formData, "paymentIntentId");
  const result = await perform(`/v1/analysis-runs/${runId}/external-evidence/payments/${paymentIntentId}/reconcile`, {
    method: "POST",
    body: JSON.stringify({}),
  });
  if (!result.ok) redirect(withQuery(runPath(runId), { error: result.code, message: result.message }));
  revalidatePath(runPath(runId));
  redirect(withQuery(runPath(runId), { ok: "Payment reconciliation queued — no second payment will be created" }));
}

export async function verifyAuditAction(formData: FormData): Promise<void> {
  const borrowerId = field(formData, "borrowerId");
  const result = await perform<ApiEnvelope<{ result: string; checkedCount: number }>>(
    `/v1/borrowers/${borrowerId}/audit/verify`,
    { method: "POST", body: JSON.stringify({}) },
  );
  if (!result.ok) redirect(withQuery(`/audit?borrower=${borrowerId}`, { error: result.code, message: result.message }));
  redirect(
    withQuery(`/audit?borrower=${borrowerId}`, {
      verified: `${result.data.data.result}:${result.data.data.checkedCount}`,
    }),
  );
}

export async function signOutAction(): Promise<void> {
  await auth.signOut();
  redirect("/login");
}

export type { ActionResult };
