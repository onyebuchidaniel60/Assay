import type { FastifyReply, FastifyRequest } from "fastify";
import type { ZodType } from "zod";
import { canonicalize, sha256 } from "@assay/domain";
import { and, eq } from "@assay/db";
import type { AssayDb } from "@assay/db";
import { idempotencyRecords } from "@assay/db";
import { resolveAuthUser, type AuthUser } from "../auth.js";
import { ApiError, conflict, unprocessable, zodDetails } from "./errors.js";

export const WRITE_ROLES = ["ANALYST", "ADMIN"] as const;
export const MANAGER_ROLES = ["MANAGER", "ADMIN"] as const;
export const READ_ROLES = ["ANALYST", "MANAGER", "AUDITOR", "ADMIN"] as const;

export async function requireAuth(request: FastifyRequest, reply: FastifyReply): Promise<AuthUser> {
  const user = await resolveAuthUser(request, reply);
  if (!user) throw new ApiError(401, "UNAUTHENTICATED", "Sign in with an invited staff account.");
  return user;
}

export function requireRole(user: AuthUser, roles: readonly AuthUser["role"][]): void {
  if (!roles.includes(user.role)) {
    throw new ApiError(403, "FORBIDDEN", "Your role cannot perform this action.");
  }
}

export function parseBody<T>(schema: ZodType<T>, body: unknown): T {
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw unprocessable("VALIDATION_ERROR", "Check the highlighted fields.", zodDetails(parsed.error));
  }
  return parsed.data;
}

export function requestHash(route: string, body: unknown): string {
  return sha256(`${route}:${canonicalize(body ?? null)}`);
}

export function requireIdempotencyKey(request: FastifyRequest): string {
  const key = request.headers["idempotency-key"];
  if (typeof key !== "string" || key.trim().length < 8 || key.length > 200) {
    throw unprocessable(
      "IDEMPOTENCY_KEY_REQUIRED",
      "Send an Idempotency-Key header of 8–200 characters for this operation.",
    );
  }
  return key.trim();
}

export function optionalIdempotencyKey(request: FastifyRequest): string | null {
  const key = request.headers["idempotency-key"];
  if (key === undefined) return null;
  return requireIdempotencyKey(request);
}

export type IdempotencyPointer = { resourceType: string; resourceId: string };

export async function findIdempotency(
  db: AssayDb,
  input: { organizationId: string; actorId: string; key: string; route: string; hash: string },
): Promise<IdempotencyPointer | null> {
  const [record] = await db
    .select()
    .from(idempotencyRecords)
    .where(
      and(
        eq(idempotencyRecords.organizationId, input.organizationId),
        eq(idempotencyRecords.actorId, input.actorId),
        eq(idempotencyRecords.key, input.key),
      ),
    )
    .limit(1);
  if (!record) return null;
  if (record.route !== input.route || record.requestHash !== input.hash) {
    throw conflict("IDEMPOTENCY_CONFLICT", "This idempotency key was already used with a different request.");
  }
  return { resourceType: record.responseResourceType, resourceId: record.responseResourceId };
}

export async function saveIdempotency(
  tx: Pick<AssayDb, "insert">,
  input: {
    organizationId: string;
    actorId: string;
    key: string;
    method: string;
    route: string;
    hash: string;
    responseStatus: number;
    resourceType: string;
    resourceId: string;
  },
): Promise<void> {
  try {
    await tx.insert(idempotencyRecords).values({
      organizationId: input.organizationId,
      actorId: input.actorId,
      key: input.key,
      method: input.method,
      route: input.route,
      requestHash: input.hash,
      responseStatus: input.responseStatus,
      responseResourceType: input.resourceType,
      responseResourceId: input.resourceId,
    });
  } catch (error) {
    const code = typeof error === "object" && error !== null && "code" in error ? String(error.code) : "";
    if (code === "23505") {
      throw conflict("IDEMPOTENCY_CONFLICT", "This idempotency key was already used for another request.");
    }
    throw error;
  }
}

export function meta(request: FastifyRequest) {
  return { requestId: String(request.id) };
}

export function noStore(reply: FastifyReply): void {
  reply.header("cache-control", "no-store, private");
  reply.header("pragma", "no-cache");
  reply.header("x-content-type-options", "nosniff");
}
