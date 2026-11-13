"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { businessSettings } from "@/db/schema";
import { requireOwner } from "@/lib/session";

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
