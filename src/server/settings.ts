import "server-only";
import { eq, getTableColumns } from "drizzle-orm";
import { db } from "@/db";
import { businessSettings } from "@/db/schema";

// Every column except the logo bytes, which are loaded only when serving the logo.
const allColumns = getTableColumns(businessSettings);
const settingsColumns = Object.fromEntries(
  Object.entries(allColumns).filter(([name]) => name !== "logoData"),
) as Omit<typeof allColumns, "logoData">;

export type BusinessSettings = Omit<typeof businessSettings.$inferSelect, "logoData">;

/** Returns the single settings row (without logo bytes), creating it on first use. */
export async function getSettings(): Promise<BusinessSettings> {
  const select = () =>
    db.select(settingsColumns).from(businessSettings).where(eq(businessSettings.id, 1));
  const [row] = await select();
  if (row) return row;
  await db.insert(businessSettings).values({ id: 1 }).onConflictDoNothing();
  return (await select())[0];
}

export type Logo = { data: Buffer; mime: "image/png" | "image/jpeg" };

/** The business logo bytes from the database, or null if none is set. */
export async function getLogo(): Promise<Logo | null> {
  const [row] = await db
    .select({ data: businessSettings.logoData, mime: businessSettings.logoMime })
    .from(businessSettings)
    .where(eq(businessSettings.id, 1));
  if (!row?.data || (row.mime !== "image/png" && row.mime !== "image/jpeg")) return null;
  return { data: Buffer.from(row.data), mime: row.mime };
}
