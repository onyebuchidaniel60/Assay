import type { FastifyReply, FastifyRequest } from "fastify";
import { createAuthServer } from "@neon/auth/server";
import { and, createDb, eq, memberships, organizations, profiles } from "@assay/db";

const db = createDb();

type AuthUser = {
  userId: string;
  email: string | null;
  name: string | null;
  organizationId: string;
  organizationName: string;
  role: string;
};

function cookieHeader(request: FastifyRequest): string {
  return typeof request.headers.cookie === "string" ? request.headers.cookie : "";
}

function appendSetCookie(reply: FastifyReply, cookie: string) {
  const existing = reply.getHeader("set-cookie");
  if (!existing) {
    reply.header("set-cookie", cookie);
    return;
  }
  const values = Array.isArray(existing) ? existing.map(String) : [String(existing)];
  reply.header("set-cookie", [...values, cookie]);
}

function authForRequest(request: FastifyRequest, reply: FastifyReply) {
  const baseUrl = process.env.NEON_AUTH_BASE_URL;
  const cookieSecret = process.env.NEON_AUTH_COOKIE_SECRET;
  if (!baseUrl || !cookieSecret) throw new Error("Neon Auth configuration is missing.");

  return createAuthServer({
    baseUrl,
    cookieSecret,
    context: () => ({
      getCookies: () => cookieHeader(request),
      setCookie: (name, value, options) => {
        const parts = [`${name}=${value}`, `Path=${options.path ?? "/"}`, "HttpOnly", "SameSite=Lax"];
        if (options.maxAge !== undefined) parts.push(`Max-Age=${options.maxAge}`);
        if (options.secure !== false) parts.push("Secure");
        appendSetCookie(reply, parts.join("; "));
      },
      getHeader: (name) => {
        const value = request.headers[name.toLowerCase()];
        return Array.isArray(value) ? value[0] ?? null : value ?? null;
      },
      getOrigin: () => (typeof request.headers.origin === "string" ? request.headers.origin : ""),
      getFramework: () => "fastify",
    }),
  });
}

export async function resolveAuthUser(request: FastifyRequest, reply: FastifyReply): Promise<AuthUser | null> {
  const auth = authForRequest(request, reply);
  const result = (await auth.getSession()) as
    | { data?: { user?: { id?: string; email?: string | null; name?: string | null } } | null; error?: unknown }
    | { user?: { id?: string; email?: string | null; name?: string | null } }
    | null;

  const session = (result && "data" in result ? result.data : result) as
    | { user?: { id?: string; email?: string | null; name?: string | null } }
    | null
    | undefined;
  const user = session?.user;
  if (!user?.id) return null;

  const rows = await db
    .select({
      userId: memberships.userId,
      role: memberships.role,
      organizationId: organizations.id,
      organizationName: organizations.name,
      displayName: profiles.displayName,
    })
    .from(memberships)
    .innerJoin(organizations, eq(organizations.id, memberships.organizationId))
    .leftJoin(profiles, eq(profiles.userId, memberships.userId))
    .where(and(eq(memberships.userId, user.id), eq(memberships.status, "ACTIVE"), eq(organizations.status, "active")))
    .limit(1);

  const row = rows[0];
  if (!row) return null;
  return {
    userId: row.userId,
    email: user.email ?? null,
    name: row.displayName ?? user.name ?? null,
    organizationId: row.organizationId,
    organizationName: row.organizationName,
    role: row.role,
  };
}
