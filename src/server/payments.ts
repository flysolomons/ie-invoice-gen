import "server-only";
import { and, desc, eq, ilike, isNull, or, sql } from "drizzle-orm";
import { db, type Tx } from "@/db";
import { clients, invoices, payments } from "@/db/schema";
import { statusForPaid } from "@/lib/payments";

/**
 * Recalculate an invoice's paid amount from its non-reversed payments and set
 * the matching status. The only place that writes `paidCents`, so it can't drift.
 */
export async function recomputeInvoicePaid(tx: Tx, invoiceId: string) {
  const [{ paid }] = await tx
    .select({ paid: sql<number>`coalesce(sum(${payments.amountCents}), 0)::int` })
    .from(payments)
    .where(and(eq(payments.invoiceId, invoiceId), isNull(payments.voidedAt)));
  const [inv] = await tx
    .select({ totalCents: invoices.totalCents })
    .from(invoices)
    .where(eq(invoices.id, invoiceId));
  await tx
    .update(invoices)
    .set({ paidCents: paid, status: statusForPaid(paid, inv.totalCents) })
    .where(eq(invoices.id, invoiceId));
}

const paymentColumns = {
  id: payments.id,
  receiptNumber: payments.receiptNumber,
  amountCents: payments.amountCents,
  paidAt: payments.paidAt,
  method: payments.method,
  reference: payments.reference,
  voidedAt: payments.voidedAt,
  voidReason: payments.voidReason,
  invoiceId: invoices.id,
  invoiceNumber: invoices.number,
  currency: invoices.currency,
  clientId: clients.id,
  clientName: clients.name,
};

export async function listPayments(opts: { q?: string } = {}) {
  const q = opts.q?.trim();
  return db
    .select(paymentColumns)
    .from(payments)
    .innerJoin(invoices, eq(invoices.id, payments.invoiceId))
    .innerJoin(clients, eq(clients.id, invoices.clientId))
    .where(
      q
        ? or(
            ilike(payments.receiptNumber, `%${q}%`),
            ilike(invoices.number, `%${q}%`),
            ilike(clients.name, `%${q}%`),
            ilike(payments.reference, `%${q}%`),
          )
        : undefined,
    )
    .orderBy(desc(payments.paidAt), desc(payments.createdAt))
    .limit(500);
}

export type PaymentRow = Awaited<ReturnType<typeof listPayments>>[number];

export async function listInvoicePayments(invoiceId: string) {
  return db
    .select(paymentColumns)
    .from(payments)
    .innerJoin(invoices, eq(invoices.id, payments.invoiceId))
    .innerJoin(clients, eq(clients.id, invoices.clientId))
    .where(eq(payments.invoiceId, invoiceId))
    .orderBy(desc(payments.paidAt), desc(payments.createdAt));
}

/** Everything a receipt needs, including the paid-to-date total as of this payment. */
export async function getPaymentForReceipt(paymentId: string) {
  const [row] = await db
    .select({
      payment: payments,
      invoice: {
        id: invoices.id,
        number: invoices.number,
        currency: invoices.currency,
        totalCents: invoices.totalCents,
        issueDate: invoices.issueDate,
      },
      client: {
        name: clients.name,
        email: clients.email,
        address: clients.address,
      },
    })
    .from(payments)
    .innerJoin(invoices, eq(invoices.id, payments.invoiceId))
    .innerJoin(clients, eq(clients.id, invoices.clientId))
    .where(eq(payments.id, paymentId));
  if (!row) return null;

  // Paid to date = this payment plus earlier, non-reversed ones on the same invoice.
  const [{ paidToDate }] = await db
    .select({ paidToDate: sql<number>`coalesce(sum(${payments.amountCents}), 0)::int` })
    .from(payments)
    .where(
      and(
        eq(payments.invoiceId, row.invoice.id),
        isNull(payments.voidedAt),
        // Compare in SQL: Postgres keeps microseconds, a JS Date only milliseconds,
        // so passing row.payment.createdAt back in would exclude this payment.
        sql`${payments.createdAt} <= (select p2.created_at from payments p2 where p2.id = ${paymentId})`,
      ),
    );

  return { ...row, paidToDate };
}
