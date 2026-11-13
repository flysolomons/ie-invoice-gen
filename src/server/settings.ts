import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { businessSettings } from "@/db/schema";

export type BusinessSettings = typeof businessSettings.$inferSelect;

/** Returns the single settings row, creating it with defaults on first use. */
export async function getSettings(): Promise<BusinessSettings> {
  const [row] = await db.select().from(businessSettings).where(eq(businessSettings.id, 1));
  if (row) return row;
  const [created] = await db
    .insert(businessSettings)
    .values({ id: 1 })
    .onConflictDoNothing()
    .returning();
  return created ?? (await db.select().from(businessSettings).where(eq(businessSettings.id, 1)))[0];
}
