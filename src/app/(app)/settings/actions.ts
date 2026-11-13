"use server";

import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { businessSettings } from "@/db/schema";
import { requireOwner } from "@/lib/session";
import { ALLOWED_UPLOADS, detectFileType, formatBytes, MAX_UPLOAD_BYTES } from "@/lib/uploads";
import { getStorage } from "@/server/storage";

const optional = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : v));

const settingsSchema = z.object({
  name: z.string().trim().min(1, "Business name is required"),
  email: optional.pipe(z.email("Invalid email").nullable()),
  phone: optional,
  address: optional,
  taxId: optional,
  defaultCurrency: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{3}$/, "Use a 3-letter currency code, e.g. USD"),
  /** Entered as a percentage (e.g. "15" or "7.5"); stored as basis points. */
  defaultTaxRate: z.coerce.number().min(0).max(100),
  defaultPaymentTermsDays: z.coerce.number().int().min(0).max(365),
  timezone: z.string().trim().refine((tz) => {
    try {
      new Intl.DateTimeFormat("en", { timeZone: tz });
      return true;
    } catch {
      return false;
    }
  }, "Unknown timezone, e.g. Europe/Dublin"),
  invoicePrefix: z.string().trim().min(1).max(10),
  receiptPrefix: z.string().trim().min(1).max(10),
  emailFromName: optional,
  footerNotes: optional,
});

export type SettingsState = { ok?: boolean; errors?: Record<string, string[]> } | null;

export async function updateSettings(_prev: SettingsState, formData: FormData): Promise<SettingsState> {
  await requireOwner();

  const parsed = settingsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors as Record<string, string[]> };
  }

  const { defaultTaxRate, ...rest } = parsed.data;
  const values = { ...rest, defaultTaxRateBp: Math.round(defaultTaxRate * 100) };

  await db
    .insert(businessSettings)
    .values({ id: 1, ...values })
    .onConflictDoUpdate({ target: businessSettings.id, set: values });

  revalidatePath("/settings");
  return { ok: true };
}

export type LogoState = { ok?: boolean; error?: string } | null;

/** Upload or replace the business logo shown on invoices and receipts (owner only). */
export async function uploadLogo(_prev: LogoState, formData: FormData): Promise<LogoState> {
  await requireOwner();
  const file = formData.get("logo");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose an image file." };
  if (file.size > MAX_UPLOAD_BYTES) {
    return { error: `Logo is ${formatBytes(file.size)}; the limit is ${formatBytes(MAX_UPLOAD_BYTES)}.` };
  }
  const data = Buffer.from(await file.arrayBuffer());
  const mime = detectFileType(data);
  // PDFs can embed PNG and JPEG only.
  if (mime !== "image/png" && mime !== "image/jpeg") return { error: "Upload a PNG or JPG image." };

  const key = `branding/logo-${randomUUID()}.${ALLOWED_UPLOADS[mime]}`;
  const storage = getStorage();
  await storage.put(key, data, mime);

  const [old] = await db.select({ logoKey: businessSettings.logoKey }).from(businessSettings);
  await db
    .insert(businessSettings)
    .values({ id: 1, logoKey: key })
    .onConflictDoUpdate({ target: businessSettings.id, set: { logoKey: key } });
  if (old?.logoKey) await storage.delete(old.logoKey).catch(() => {});

  revalidatePath("/settings");
  return { ok: true };
}

export async function removeLogo(): Promise<{ error?: string }> {
  await requireOwner();
  const [old] = await db.select({ logoKey: businessSettings.logoKey }).from(businessSettings);
  await db.update(businessSettings).set({ logoKey: null }).where(eq(businessSettings.id, 1));
  if (old?.logoKey) await getStorage().delete(old.logoKey).catch(() => {});
  revalidatePath("/settings");
  return {};
}
