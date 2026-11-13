import "server-only";
import { asc, desc, sql } from "drizzle-orm";
import { db } from "@/db";
import { members } from "@/db/schema";

export type Member = typeof members.$inferSelect;

/** Active members first (owners, then by name), removed members last. */
export async function listMembers(): Promise<Member[]> {
  return db
    .select()
    .from(members)
    .orderBy(
      sql`${members.disabledAt} is not null`,
      desc(sql`${members.role} = 'owner'`),
      asc(members.name),
    );
}

export type PendingSignIn = {
  authUserId: string;
  email: string;
  name: string;
  emailVerified: boolean;
  firstSignedInAt: Date;
};

/**
 * People who signed in with Microsoft but have no team membership (e.g. their
 * email wasn't verified or isn't on an allowed domain). Only Microsoft logins
 * are listed: the provider is restricted to our tenant, whereas a password
 * sign-up made directly against the auth URL could use anyone's email.
 * Reads Neon Auth's own tables (neon_auth schema, same database).
 */
export async function listPendingSignIns(): Promise<PendingSignIn[]> {
  const result = await db.execute<{
    id: string;
    email: string;
    name: string | null;
    email_verified: boolean;
    created_at: Date | string;
  }>(sql`
    select u.id::text as id, u.email, u.name, u."emailVerified" as email_verified, u."createdAt" as created_at
    from neon_auth."user" u
    where exists (
      select 1 from neon_auth.account a
      where a."userId" = u.id and a."providerId" = 'microsoft'
    )
    -- neon_auth ids are uuid; members.auth_user_id is text.
    and not exists (select 1 from ${members} m where m.auth_user_id = u.id::text)
    order by u."createdAt" desc
    limit 100
  `);
  return result.rows.map((r) => ({
    authUserId: r.id,
    email: r.email,
    name: r.name || r.email,
    emailVerified: r.email_verified,
    firstSignedInAt: new Date(r.created_at),
  }));
}

/** A single pending Microsoft sign-in, or null (re-checked when adding someone). */
export async function getPendingSignIn(authUserId: string): Promise<PendingSignIn | null> {
  const all = await listPendingSignIns();
  return all.find((p) => p.authUserId === authUserId) ?? null;
}
