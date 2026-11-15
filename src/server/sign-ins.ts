import "server-only";
import { count, desc, eq, gte, lt, ne } from "drizzle-orm";
import { headers } from "next/headers";
import { db } from "@/db";
import { members, signInAttempts } from "@/db/schema";
import { env } from "@/env";
import { isAllowedDomain } from "@/lib/email-domain";
import { clientIp, clientUserAgent, normaliseEmail } from "@/lib/sign-in-context";

export type SignInAttempt = typeof signInAttempts.$inferSelect;
type Method = SignInAttempt["method"];
type Outcome = SignInAttempt["outcome"];

/** How long attempts are kept. Older rows are pruned when an owner opens the log. */
const RETENTION_DAYS = 180;

/**
 * Record one sign-in attempt. Never throws: a logging failure must not stop
 * anyone signing in (or reveal anything to the person trying).
 */
export async function recordSignIn(entry: {
  method: Method;
  outcome: Outcome;
  email?: unknown;
  authUserId?: string | null;
  reason?: string | null;
  sessionId?: string | null;
}): Promise<void> {
  try {
    const h = await headers();
    await db
      .insert(signInAttempts)
      .values({
        method: entry.method,
        outcome: entry.outcome,
        email: normaliseEmail(entry.email),
        authUserId: entry.authUserId ?? null,
        reason: entry.reason ?? null,
        sessionId: entry.sessionId ?? null,
        ipAddress: clientIp(h),
        userAgent: clientUserAgent(h),
      })
      // Same session id = the Microsoft landing page was reloaded; already logged.
      .onConflictDoNothing({ target: signInAttempts.sessionId });
  } catch (e) {
    console.error("Failed to record sign-in attempt", e);
  }
}

/**
 * Whether a freshly authenticated account actually gets into the app. Mirrors
 * getCurrentUser(): an active member, or someone eligible to auto-join.
 */
export async function accessOutcome(user: {
  id: string;
  email: string;
  emailVerified: boolean;
}): Promise<{ outcome: Outcome; reason: string | null }> {
  const [member] = await db
    .select({ disabledAt: members.disabledAt })
    .from(members)
    .where(eq(members.authUserId, user.id));
  if (member) {
    return member.disabledAt
      ? { outcome: "blocked", reason: "removed" }
      : { outcome: "success", reason: null };
  }
  if (user.emailVerified && isAllowedDomain(user.email, env.ALLOWED_EMAIL_DOMAINS)) {
    return { outcome: "success", reason: null };
  }
  return { outcome: "blocked", reason: "not_on_team" };
}

export type SignInFilter = "all" | "problems";

/** Most recent attempts first; "problems" = failed or blocked only. */
export async function listSignIns(filter: SignInFilter, limit = 200): Promise<SignInAttempt[]> {
  return db
    .select()
    .from(signInAttempts)
    .where(filter === "problems" ? ne(signInAttempts.outcome, "success") : undefined)
    .orderBy(desc(signInAttempts.createdAt))
    .limit(limit);
}

/** Counts for the last 24 hours, for the summary cards. */
export async function signInSummary(): Promise<Record<Outcome, number>> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const rows = await db
    .select({ outcome: signInAttempts.outcome, n: count() })
    .from(signInAttempts)
    .where(gte(signInAttempts.createdAt, since))
    .groupBy(signInAttempts.outcome);
  const totals: Record<Outcome, number> = { success: 0, blocked: 0, failed: 0 };
  for (const r of rows) totals[r.outcome] = r.n;
  return totals;
}

export async function pruneOldSignIns(): Promise<void> {
  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);
  await db.delete(signInAttempts).where(lt(signInAttempts.createdAt, cutoff));
}

export const SIGN_IN_RETENTION_DAYS = RETENTION_DAYS;
