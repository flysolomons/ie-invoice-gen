"use server";

import { and, count, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db, type Tx } from "@/db";
import { members } from "@/db/schema";
import { requireOwner } from "@/lib/session";
import { getPendingSignIn } from "@/server/members";

type Result = { error?: string };

class TeamError extends Error {}

/**
 * Load the target member with a row lock, refusing changes to yourself.
 * Owner-count checks run in the same transaction, so two owners editing at
 * once can't leave the team without an owner.
 */
async function lockTarget(tx: Tx, memberId: string, actorAuthId: string) {
  const [target] = await tx.select().from(members).where(eq(members.id, memberId)).for("update");
  if (!target) throw new TeamError("Member not found.");
  if (target.authUserId === actorAuthId) {
    throw new TeamError("You can't change your own access. Ask another owner.");
  }
  return target;
}

async function activeOwnerCount(tx: Tx) {
  // Lock active owners so concurrent demotions serialise.
  await tx
    .select({ id: members.id })
    .from(members)
    .where(and(eq(members.role, "owner"), isNull(members.disabledAt)))
    .for("update");
  const [{ n }] = await tx
    .select({ n: count() })
    .from(members)
    .where(and(eq(members.role, "owner"), isNull(members.disabledAt)));
  return n;
}

async function run(fn: (tx: Tx) => Promise<void>): Promise<Result> {
  try {
    await db.transaction(fn);
  } catch (e) {
    if (e instanceof TeamError) return { error: e.message };
    throw e;
  }
  revalidatePath("/settings/team");
  return {};
}

/**
 * Let in someone from the "Waiting for access" list as a member (owner only).
 * Re-checks on the server that they really are a pending Microsoft sign-in.
 */
export async function addPendingMember(authUserId: string): Promise<Result> {
  await requireOwner();
  const pending = await getPendingSignIn(authUserId);
  if (!pending) return { error: "That person is no longer waiting for access." };
  await db
    .insert(members)
    .values({
      authUserId: pending.authUserId,
      email: pending.email.toLowerCase(),
      name: pending.name,
      role: "member",
    })
    .onConflictDoNothing();
  revalidatePath("/settings/team");
  return {};
}

/** Make someone an owner or a member (owner only). */
export async function setMemberRole(memberId: string, role: "owner" | "member"): Promise<Result> {
  const actor = await requireOwner();
  return run(async (tx) => {
    const target = await lockTarget(tx, memberId, actor.id);
    if (target.role === role) return;
    if (target.role === "owner" && !target.disabledAt && (await activeOwnerCount(tx)) <= 1) {
      throw new TeamError("There must always be at least one owner.");
    }
    await tx.update(members).set({ role }).where(eq(members.id, memberId));
  });
}

/**
 * Remove (disable) or restore someone (owner only). Removed people keep their
 * row so automatic Microsoft re-joining can't bring them back.
 */
export async function setMemberDisabled(memberId: string, disabled: boolean): Promise<Result> {
  const actor = await requireOwner();
  return run(async (tx) => {
    const target = await lockTarget(tx, memberId, actor.id);
    if (!!target.disabledAt === disabled) return;
    if (disabled && target.role === "owner" && (await activeOwnerCount(tx)) <= 1) {
      throw new TeamError("There must always be at least one owner.");
    }
    await tx
      .update(members)
      .set({ disabledAt: disabled ? new Date() : null })
      .where(eq(members.id, memberId));
  });
}
