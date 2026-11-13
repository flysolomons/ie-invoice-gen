import "server-only";
import { eq } from "drizzle-orm";
import { forbidden, redirect } from "next/navigation";
import { cache } from "react";
import { db } from "@/db";
import { members } from "@/db/schema";
import { env } from "@/env";
import { auth, type Role } from "./auth";
import { isAllowedDomain } from "./email-domain";

export type SessionUser = { id: string; email: string; name: string; role: Role };

/** Neon Auth user for this request, or null. Cached per request. */
const getAuthUser = cache(async () => {
  const { data } = await auth.getSession();
  return data?.user ?? null;
});

type AuthUser = NonNullable<Awaited<ReturnType<typeof getAuthUser>>>;

/**
 * Company staff join automatically on their first sign-in, but only when BOTH:
 * - the email domain is in ALLOWED_EMAIL_DOMAINS, and
 * - the email is verified. For Microsoft sign-in, Neon Auth marks it verified
 *   only when Microsoft confirms the user's home tenant owns the domain (the
 *   `xms_edov` + `acct` claims), so guests, personal accounts and plain
 *   email/password sign-ups made against the auth URL never qualify.
 */
async function autoJoin(user: AuthUser) {
  if (!user.emailVerified || !isAllowedDomain(user.email, env.ALLOWED_EMAIL_DOMAINS)) {
    return null;
  }
  const [row] = await db
    .insert(members)
    .values({
      authUserId: user.id,
      email: user.email.toLowerCase(),
      name: user.name || user.email,
      role: "member",
    })
    // An existing row (e.g. a removed member) is never overwritten here.
    .onConflictDoNothing()
    .returning();
  return row ?? null;
}

/**
 * Signed-in team member, or null. A Neon Auth account without an active
 * `members` row (and not eligible to auto-join) is not a member.
 */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const authUser = await getAuthUser();
  if (!authUser) return null;
  const [existing] = await db.select().from(members).where(eq(members.authUserId, authUser.id));
  const member = existing ?? (await autoJoin(authUser));
  if (!member || member.disabledAt) return null;
  return { id: authUser.id, email: member.email, name: member.name, role: member.role };
});

/** Use in pages, layouts and server actions that need a signed-in member. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (user) return user;
  // Signed in to Neon Auth but not (or no longer) on the team.
  if (await getAuthUser()) redirect("/no-access");
  redirect("/login");
}

/** Owner-only guard. Always enforce on the server, not just by hiding UI. */
export async function requireOwner(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "owner") forbidden();
  return user;
}
