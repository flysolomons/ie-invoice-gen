"use server";

import { eq } from "drizzle-orm";
import { db, type Tx } from "@/db";
import { invoices, payments } from "@/db/schema";
import { amendNumberSchema } from "@/lib/document-number";
import { requireOwner, type SessionUser } from "@/lib/session";
import { issuesToFieldErrors } from "@/lib/validation";
import { amendDocNumber, NumberError } from "@/server/numbering";
import { revalidateInvoiceViews } from "@/server/revalidate";

export type AmendNumberState = {
  ok?: boolean;
  errors?: Record<string, string>;
  /** Submitted values, echoed back on error so the form keeps what was typed. */
  values?: Record<string, string>;
} | null;

/** Postgres unique violation (Drizzle may wrap the driver error in `cause`). */
function isUniqueViolation(e: unknown): boolean {
  const err = e as { code?: string; cause?: { code?: string } };
  return err?.code === "23505" || err?.cause?.code === "23505";
}

/**
 * Shared shell: owner check, validation, one transaction, friendly errors.
 * `change` locks the invoice row, then calls amendDocNumber; it returns the
 * invoice id to revalidate.
 */
async function amend(
  formData: FormData,
  change: (
    tx: Tx,
    input: { number: string; reason: string | null },
    user: SessionUser,
  ) => Promise<string>,
): Promise<AmendNumberState> {
  const user = await requireOwner();
  const values = {
    number: String(formData.get("number") ?? ""),
    reason: String(formData.get("reason") ?? ""),
  };
  const parsed = amendNumberSchema.safeParse(values);
  if (!parsed.success) return { errors: issuesToFieldErrors(parsed.error), values };

  try {
    const invoiceId = await db.transaction((tx) => change(tx, parsed.data, user));
    revalidateInvoiceViews(invoiceId);
    return { ok: true };
  } catch (e) {
    if (e instanceof NumberError) return { errors: { [e.field]: e.message }, values };
    // Backstop for the case-insensitive unique indexes.
    if (isUniqueViolation(e)) return { errors: { number: "That number is already in use." }, values };
    throw e;
  }
}

/** Owner only. Any invoice that has a number (issued, paid or void) can be amended. */
export async function amendInvoiceNumber(
  invoiceId: string,
  _prev: AmendNumberState,
  formData: FormData,
): Promise<AmendNumberState> {
  return amend(formData, async (tx, input, user) => {
    const [inv] = await tx
      .select({ number: invoices.number })
      .from(invoices)
      .where(eq(invoices.id, invoiceId))
      .for("update");
    if (!inv) throw new NumberError("Invoice not found.", "_form");
    if (!inv.number) throw new NumberError("Drafts don't have a number yet. Issue it first.", "_form");
    await amendDocNumber(tx, {
      kind: "invoice",
      docId: invoiceId,
      invoiceId,
      current: inv.number,
      next: input.number,
      reason: input.reason,
      user,
    });
    return invoiceId;
  });
}

/** Owner only. Any receipt can be amended, including reversed ones. */
export async function amendReceiptNumber(
  paymentId: string,
  _prev: AmendNumberState,
  formData: FormData,
): Promise<AmendNumberState> {
  return amend(formData, async (tx, input, user) => {
    const [p] = await tx
      .select({ invoiceId: payments.invoiceId, receiptNumber: payments.receiptNumber })
      .from(payments)
      .where(eq(payments.id, paymentId));
    if (!p) throw new NumberError("Receipt not found.", "_form");
    // Lock the invoice (same order as recordPayment) to avoid deadlocks. Reading
    // the receipt number before the lock is safe: only amendDocNumber changes
    // it, and that runs under this same invoice lock.
    await tx
      .select({ id: invoices.id })
      .from(invoices)
      .where(eq(invoices.id, p.invoiceId))
      .for("update");
    await amendDocNumber(tx, {
      kind: "receipt",
      docId: paymentId,
      invoiceId: p.invoiceId,
      current: p.receiptNumber,
      next: input.number,
      reason: input.reason,
      user,
    });
    return p.invoiceId;
  });
}
