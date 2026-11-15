import { and, eq, inArray, lte, sql } from "drizzle-orm";
import type { AssayDb } from "./client.js";
import { jobs } from "./schema.js";

export type EnqueueJobInput = {
  organizationId: string;
  jobType: string;
  payload: Record<string, unknown>;
  idempotencyKey: string;
  maxAttempts?: number;
  nextRunAt?: Date;
};

export type ClaimedJob = {
  id: string;
  organizationId: string;
  jobType: string;
  payload: Record<string, unknown>;
  attempts: number;
  maxAttempts: number;
  idempotencyKey: string;
};

export async function enqueueJob(db: AssayDb, input: EnqueueJobInput): Promise<{ id: string; duplicate: boolean }> {
  const existing = await db
    .select({ id: jobs.id })
    .from(jobs)
    .where(eq(jobs.idempotencyKey, input.idempotencyKey))
    .limit(1);
  if (existing[0]) return { id: existing[0].id, duplicate: true };
  const [created] = await db
    .insert(jobs)
    .values({
      organizationId: input.organizationId,
      jobType: input.jobType,
      payload: input.payload,
      idempotencyKey: input.idempotencyKey,
      maxAttempts: input.maxAttempts ?? 3,
      ...(input.nextRunAt ? { nextRunAt: input.nextRunAt } : {}),
    })
    .returning({ id: jobs.id });
  if (!created) throw new Error("Job insert did not return an id.");
  return { id: created.id, duplicate: false };
}

export async function claimJob(db: AssayDb, workerId = "assay-worker", leaseSeconds = 300): Promise<ClaimedJob | null> {
  const result = await db.execute(sql`
    WITH next_job AS (
      SELECT id
      FROM jobs
      WHERE status IN ('QUEUED', 'RETRY') AND next_run_at <= now()
      ORDER BY next_run_at, created_at
      LIMIT 1
      FOR UPDATE SKIP LOCKED
    )
    UPDATE jobs
    SET status = 'RUNNING',
        attempts = jobs.attempts + 1,
        locked_at = now(),
        locked_by = ${workerId},
        lease_until = now() + (${leaseSeconds} * interval '1 second'),
        updated_at = now()
    FROM next_job
    WHERE jobs.id = next_job.id
    RETURNING jobs.id, jobs.organization_id, jobs.job_type, jobs.payload, jobs.attempts, jobs.max_attempts, jobs.idempotency_key
  `);
  const row = (result as unknown as { rows?: Array<Record<string, unknown>> }).rows?.[0];
  if (!row) return null;
  return {
    id: String(row.id),
    organizationId: String(row.organization_id),
    jobType: String(row.job_type),
    payload: (row.payload ?? {}) as Record<string, unknown>,
    attempts: Number(row.attempts),
    maxAttempts: Number(row.max_attempts),
    idempotencyKey: String(row.idempotency_key),
  };
}

export async function completeJob(db: AssayDb, jobId: string): Promise<void> {
  await db
    .update(jobs)
    .set({ status: "SUCCEEDED", leaseUntil: null, lockedAt: null, lockedBy: null, updatedAt: new Date() })
    .where(eq(jobs.id, jobId));
}

export async function failJob(db: AssayDb, jobId: string, errorCode: string): Promise<"RETRY" | "FAILED"> {
  const [job] = await db.select().from(jobs).where(eq(jobs.id, jobId)).limit(1);
  if (!job) throw new Error("Job not found.");
  const exhausted = job.attempts >= job.maxAttempts;
  const nextStatus = exhausted ? "FAILED" : "RETRY";
  await db
    .update(jobs)
    .set({
      status: nextStatus,
      lastErrorCode: errorCode.slice(0, 120),
      leaseUntil: null,
      lockedAt: null,
      lockedBy: null,
      nextRunAt: new Date(Date.now() + Math.min(300, 2 ** job.attempts) * 1000),
      updatedAt: new Date(),
    })
    .where(and(eq(jobs.id, jobId), eq(jobs.status, "RUNNING")));
  return nextStatus;
}

export async function reclaimExpiredJobs(db: AssayDb): Promise<number> {
  const result = await db
    .update(jobs)
    .set({ status: "QUEUED", leaseUntil: null, lockedAt: null, lockedBy: null, updatedAt: new Date() })
    .where(and(inArray(jobs.status, ["RUNNING"]), lte(jobs.leaseUntil, new Date())))
    .returning({ id: jobs.id });
  return result.length;
}
