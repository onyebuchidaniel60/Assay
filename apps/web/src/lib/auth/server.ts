import { createNeonAuth } from "@neon/auth/next/server";

const baseUrl = process.env.NEON_AUTH_BASE_URL;
const cookieSecret = process.env.NEON_AUTH_COOKIE_SECRET;

if (!baseUrl || !cookieSecret) {
  throw new Error("NEON_AUTH_BASE_URL and NEON_AUTH_COOKIE_SECRET are required for auth.");
}

export const auth = createNeonAuth({
  baseUrl,
  cookies: {
    secret: cookieSecret,
    sessionDataTtl: 60,
  },
  logLevel: "warn",
});
