import "server-only";
import { createNeonAuth } from "@neon/auth/next/server";
import { env } from "@/env";

/**
 * Neon Auth (Managed Better Auth). Accounts, passwords and sessions are handled
 * by Neon; app access and roles come from our own `members` table.
 */
export const auth = createNeonAuth({
  baseUrl: env.NEON_AUTH_BASE_URL,
  cookies: {
    secret: env.NEON_AUTH_COOKIE_SECRET,
    // `lax` so links from emails (e.g. invite links) arrive with the session cookie.
    sameSite: "lax",
  },
});

export type Role = "owner" | "member";
