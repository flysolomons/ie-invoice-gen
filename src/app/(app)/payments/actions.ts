"use server";

import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { invoices, payments } from "@/db/schema";
import { todayInTimezone } from "@/lib/invoice-status";
import { formatMoney } from "@/lib/money";
import { requireOwner, requireUser } from "@/lib/session";
import { issuesToFieldErrors, paymentSchema } from "@/lib/validation";
import { takeNextNumber } from "@/server/numbering";
import { recomputeInvoicePaid } from "@/server/payments";
import { getSettings } from "@/server/settings";

export type PaymentFormState = {
  ok?: boolean;
  receiptNumber?: string;
  errors?: Record<string, string>;
  /** Submitted values, echoed back on error so the form keeps what was typed. */
  values?: Record<string, string>;
} | null;

class PaymentError extends Error {
  constructor(
    message: string,
    readonly field = "_form",
  ) {
    super(message);
  }
}

function revalidate(invoiceId: string) {
  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath("/invoices");
  revalidatePath("/payments");
  revalidatePath("/dashboard");
}

/**
 * Record a (full or partial) payment against an issued invoice and give it the
 * next receipt number. The invoice row is locked for the duration, so two
 * people recording at once can't overpay it.
 */
export async function recordPayment(
  invoiceId: string,
  _prev: PaymentFormState,
  formData: FormData,
): Promise<PaymentFormState> {
  const user = await requireUser();
  const values = Object.fromEntries(
    ["amount", "paidAt", "method", "reference"].map((k) => [k, String(formData.get(k) ?? "")]),
  );
  const parsed = paymentSchema.safeParse(values);
  if (!parsed.success) return { errors: issuesToFieldErrors(parsed.error), values };
  const input = parsed.data;

  const settings = await getSettings();
  if (input.paidAt > todayInTimezone(settings.timezone)) {
    return { errors: { paidAt: "Payment date can't be in the future" }, values };
  }

  try {
    const receiptNumber = await db.transaction(async (tx) => {
      const [inv] = await tx
        .select({
          status: invoices.status,
          totalCents: invoices.totalCents,
          paidCents: invoices.paidCents,
          currency: invoices.currency,
        })
        .from(invoices)
        .where(eq(invoices.id, invoiceId))
        .for("update");
      if (!inv) throw new PaymentError("Invoice not found.");
      if (inv.status !== "sent" && inv.status !== "partially_paid") {
        throw new PaymentError(
          inv.status === "paid"
            ? "This invoice is already fully paid."
            : "Payments can only be recorded on issued, unpaid invoices.",
        );
      }
      const balance = inv.totalCents - inv.paidCents;
      if (input.amount > balance) {
        throw new PaymentError(
          `Amount is more than the balance due (${formatMoney(balance, inv.currency)}).`,
          "amount",
        );
      }

      const number = await takeNextNumber(tx, "receipt");
      await tx.insert(payments).values({
        invoiceId,
        amountCents: input.amount,
        paidAt: input.paidAt,
        method: input.method,
        reference: input.reference,
        receiptNumber: number,
        recordedBy: user.id,
      });
      await recomputeInvoicePaid(tx, invoiceId);
      return number;
    });

    revalidate(invoiceId);
    return { ok: true, receiptNumber };
  } catch (e) {
    if (e instanceof PaymentError) return { errors: { [e.field]: e.message }, values };
    throw e;
  }
}

/**
 * Reverse a payment (owner only). Payments are never edited or deleted: the
 * row is marked reversed, its receipt number stays used, and the invoice's
 * paid amount and status are recalculated.
 */
export async function reversePayment(paymentId: string): Promise<{ error?: string }> {
  await requireOwner();
  const invoiceId = await db.transaction(async (tx) => {
    const [p] = await tx
      .select({ invoiceId: payments.invoiceId })
      .from(payments)
      .where(and(eq(payments.id, paymentId), isNull(payments.voidedAt)));
    if (!p) return null;
    // Lock the invoice first (same order as recordPayment) to avoid deadlocks.
    await tx.select({ id: invoices.id }).from(invoices).where(eq(invoices.id, p.invoiceId)).for("update");
    await tx
      .update(payments)
      .set({ voidedAt: new Date(), voidReason: "Reversed" })
      .where(eq(payments.id, paymentId));
    await recomputeInvoicePaid(tx, p.invoiceId);
    return p.invoiceId;
  });
  if (!invoiceId) return { error: "Payment not found or already reversed." };
  revalidate(invoiceId);
  return {};
}
