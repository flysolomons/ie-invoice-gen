import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { businessSettings } from "@/db/schema";
import { detectFileType } from "@/lib/uploads";
import { readStoredFile } from "./storage";

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

export type Logo = { data: Buffer; mime: "image/png" | "image/jpeg" };

/** The business logo from storage, or null if none is set (or the file is missing). */
export async function getLogo(settings?: BusinessSettings): Promise<Logo | null> {
  const key = (settings ?? (await getSettings())).logoKey;
  if (!key) return null;
  try {
    const data = await readStoredFile(key);
    if (!data) return null;
    const mime = detectFileType(data);
    return mime === "image/png" || mime === "image/jpeg" ? { data, mime } : null;
  } catch (e) {
    // A missing logo shouldn't stop invoices from rendering.
    console.error("Failed to load logo", e);
    return null;
  }
}
