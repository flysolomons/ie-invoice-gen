"use server";

import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { businessSettings } from "@/db/schema";
import { requireOwner } from "@/lib/session";
import { detectFileType, formatBytes } from "@/lib/uploads";
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

/** The logo is stored in the database and loaded on every PDF, so keep it small. */
const MAX_LOGO_BYTES = 1024 * 1024;

/** Logos from before they moved into the database were files ("branding/…"); tidy those up. */
async function deleteLegacyLogoFile(oldKey: string | null | undefined) {
  if (oldKey?.startsWith("branding/")) {
    await getStorage()
      .delete(oldKey)
      .catch(() => {});
  }
}

/**
 * Upload or replace the business logo shown on invoices, receipts, the sidebar
 * and the login page (owner only). The bytes are stored in the database so every
 * environment using it (local dev, Vercel) serves the same logo.
 */
export async function uploadLogo(_prev: LogoState, formData: FormData): Promise<LogoState> {
  await requireOwner();
  const file = formData.get("logo");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose an image file." };
  if (file.size > MAX_LOGO_BYTES) {
    return {
      error: `Logo is ${formatBytes(file.size)}; the limit is ${formatBytes(MAX_LOGO_BYTES)}. Try a smaller PNG or JPG.`,
    };
  }
  const data = Buffer.from(await file.arrayBuffer());
  const mime = detectFileType(data);
  // PDFs can embed PNG and JPEG only.
  if (mime !== "image/png" && mime !== "image/jpeg") return { error: "Upload a PNG or JPG image." };

  // A new version string on every upload busts browser caches of /api/branding/logo?v=…
  const logo = { logoKey: `logo-${randomUUID()}`, logoData: data, logoMime: mime };
  const [old] = await db.select({ logoKey: businessSettings.logoKey }).from(businessSettings);
  await db
    .insert(businessSettings)
    .values({ id: 1, ...logo })
    .onConflictDoUpdate({ target: businessSettings.id, set: logo });
  await deleteLegacyLogoFile(old?.logoKey);

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function removeLogo(): Promise<{ error?: string }> {
  await requireOwner();
  const [old] = await db.select({ logoKey: businessSettings.logoKey }).from(businessSettings);
  await db
    .update(businessSettings)
    .set({ logoKey: null, logoData: null, logoMime: null })
    .where(eq(businessSettings.id, 1));
  await deleteLegacyLogoFile(old?.logoKey);
  revalidatePath("/", "layout");
  return {};
}
