import "server-only";
import { eq } from "drizzle-orm";
import { forbidden, redirect } from "next/navigation";
import { cache } from "react";
import { db } from "@/db";
import { members } from "@/db/schema";
import { auth, type Role } from "./auth";

export type SessionUser = { id: string; email: string; name: string; role: Role };

/** Neon Auth user for this request, or null. Cached per request. */
const getAuthUser = cache(async () => {
  const { data } = await auth.getSession();
  return data?.user ?? null;
});

/**
 * Signed-in team member, or null. A Neon Auth account without a `members`
 * row (e.g. someone who signed up directly against the auth URL) is not a member.
 */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const authUser = await getAuthUser();
  if (!authUser) return null;
  const [member] = await db.select().from(members).where(eq(members.authUserId, authUser.id));
  if (!member) return null;
  return { id: authUser.id, email: member.email, name: member.name, role: member.role };
});

/** Use in pages, layouts and server actions that need a signed-in member. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (user) return user;
  // Signed in to Neon Auth but not on the team.
  if (await getAuthUser()) redirect("/no-access");
  redirect("/login");
}

/** Owner-only guard. Always enforce on the server, not just by hiding UI. */
export async function requireOwner(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "owner") forbidden();
  return user;
}
