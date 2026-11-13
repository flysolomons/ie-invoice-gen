import { z } from "zod";
import { quantityToMilli } from "./invoice-calc";
import { percentToBp, toCents } from "./money";
import { PAYMENT_METHODS } from "./payments";

/** "" → null for optional text fields. */
const optionalText = z
  .string()
  .trim()
  .max(5000)
  .transform((v) => (v === "" ? null : v));

const currency = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{3}$/, "Use a 3-letter currency code, e.g. USD");

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date");

const money = z
  .string()
  .transform((v, ctx) => {
    const cents = toCents(v);
    if (cents === null) {
      ctx.addIssue({ code: "custom", message: "Enter an amount like 120 or 99.50" });
      return z.NEVER;
    }
    return cents;
  });

const percent = z.string().transform((v, ctx) => {
  const bp = percentToBp(v === "" ? "0" : v);
  if (bp === null) {
    ctx.addIssue({ code: "custom", message: "Enter a percentage between 0 and 100" });
    return z.NEVER;
  }
  return bp;
});

/* ------------------------------------------------------------------ */

export const clientSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  email: optionalText.pipe(z.email("Invalid email").nullable()),
  phone: optionalText,
  address: optionalText,
  taxId: optionalText,
  currency: optionalText.pipe(currency.nullable()),
  notes: optionalText,
});
export type ClientInput = z.infer<typeof clientSchema>;

/* ------------------------------------------------------------------ */

export const invoiceItemSchema = z.object({
  description: z.string().trim().min(1, "Describe the item").max(1000),
  quantity: z.string().refine((q) => {
    const milli = quantityToMilli(q);
    return milli !== null && milli > 0;
  }, "Quantity must be above 0 (max 3 decimals)"),
  unitPrice: money,
  taxRate: percent,
});

/**
 * Raw form values (strings) → validated, normalized draft.
 * The form posts this as JSON; totals are recomputed on the server.
 */
export const invoiceDraftSchema = z
  .object({
    clientId: z.uuid("Choose a client"),
    currency,
    issueDate: isoDate,
    dueDate: isoDate,
    discountType: z.enum(["none", "percent", "fixed"]),
    /** Percent ("10") for percent discounts, amount ("25.00") for fixed. */
    discountValue: z.string(),
    notes: optionalText,
    terms: optionalText,
    items: z.array(invoiceItemSchema).min(1, "Add at least one line item").max(200),
  })
  .refine((d) => d.dueDate >= d.issueDate, {
    message: "Due date can't be before the issue date",
    path: ["dueDate"],
  })
  .transform((d, ctx) => {
    let discountValue = 0;
    if (d.discountType === "percent") {
      const bp = percentToBp(d.discountValue || "0");
      if (bp === null) {
        ctx.addIssue({ code: "custom", message: "Enter a percentage between 0 and 100", path: ["discountValue"] });
        return z.NEVER;
      }
      discountValue = bp;
    } else if (d.discountType === "fixed") {
      const cents = toCents(d.discountValue || "0");
      if (cents === null) {
        ctx.addIssue({ code: "custom", message: "Enter an amount like 25 or 9.99", path: ["discountValue"] });
        return z.NEVER;
      }
      discountValue = cents;
    }
    return { ...d, discountValue };
  });

export type InvoiceDraftInput = z.input<typeof invoiceDraftSchema>;
export type InvoiceDraft = z.output<typeof invoiceDraftSchema>;

export const paymentSchema = z.object({
  amount: money.refine((c) => c > 0, "Amount must be above zero"),
  paidAt: isoDate,
  method: z.enum(PAYMENT_METHODS, "Choose a payment method"),
  reference: optionalText,
});
export type PaymentInput = z.output<typeof paymentSchema>;

export const expenseSchema = z
  .object({
    vendor: z.string().trim().min(1, "Who was paid?").max(200),
    categoryId: z.string(),
    /** Optional new category name; used instead of categoryId when filled. */
    newCategory: z.string().trim().max(60),
    amount: money.refine((c) => c > 0, "Amount must be above zero"),
    currency,
    expenseDate: isoDate,
    notes: optionalText,
  })
  .superRefine((d, ctx) => {
    if (!d.newCategory && d.categoryId && !z.uuid().safeParse(d.categoryId).success) {
      ctx.addIssue({ code: "custom", message: "Choose a category", path: ["categoryId"] });
    }
  });
export type ExpenseInput = z.output<typeof expenseSchema>;

/** Flatten zod issues to { "items.0.quantity": "message" } for form display. */
export function issuesToFieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_form";
    out[key] ??= issue.message;
  }
  return out;
}
