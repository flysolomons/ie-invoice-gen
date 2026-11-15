import "server-only";
import { and, type AnyColumn, desc, eq, ne, type SQL, sql } from "drizzle-orm";
import { db, type Tx } from "@/db";
import { businessSettings, invoices, numberAmendments, payments } from "@/db/schema";
import { type DocKind, escapeLike, pickFreeNumber } from "@/lib/document-number";

/**
 * Invoice and receipt numbers.
 *
 * Rules (all enforced here, so every write to invoices.number or
 * payments.receipt_number must go through this module):
 * - Auto numbers come from a counter and never fail on a taken number: the
 *   counter skips numbers already used or reserved.
 * - Owners can amend a number. The old one stays reserved forever (it lives on
 *   as `oldNumber` in number_amendments), so no other document can take it.
 * - Numbers compare case-insensitively ("INV-1" = "inv-1").
 *
 * Every number-changing transaction locks the business_settings row, so
 * issuing, recording payments and amending run one at a time and the
 * "is it taken?" check can't race. Lock order: invoice row, then settings row.
 */

type Settings = Awaited<ReturnType<typeof lockSettings>>;

/** Where each kind of number lives, and which counter/prefix feeds it. */
const DOCS = {
  invoice: {
    table: invoices,
    id: invoices.id,
    number: invoices.number,
    prefix: (s: Settings) => s.invoicePrefix,
    next: (s: Settings) => s.nextInvoiceNumber,
    counter: (n: number) => ({ nextInvoiceNumber: n }),
    setNumber: (tx: Tx, id: string, number: string) =>
      tx.update(invoices).set({ number }).where(eq(invoices.id, id)),
  },
  receipt: {
    table: payments,
    id: payments.id,
    number: payments.receiptNumber,
    prefix: (s: Settings) => s.receiptPrefix,
    next: (s: Settings) => s.nextReceiptNumber,
    counter: (n: number) => ({ nextReceiptNumber: n }),
    setNumber: (tx: Tx, id: string, receiptNumber: string) =>
      tx.update(payments).set({ receiptNumber }).where(eq(payments.id, id)),
  },
} as const;

/** INV- + 7 → "INV-0007"; grows past 4 digits naturally ("INV-12345"). */
export function formatDocNumber(prefix: string, n: number): string {
  return `${prefix}${String(n).padStart(4, "0")}`;
}

/** Lock the settings row (creating it on a fresh database) and return it. */
async function lockSettings(tx: Tx) {
  await tx.insert(businessSettings).values({ id: 1 }).onConflictDoNothing();
  const [row] = await tx
    .select({
      invoicePrefix: businessSettings.invoicePrefix,
      nextInvoiceNumber: businessSettings.nextInvoiceNumber,
      receiptPrefix: businessSettings.receiptPrefix,
      nextReceiptNumber: businessSettings.nextReceiptNumber,
    })
    .from(businessSettings)
    .where(eq(businessSettings.id, 1))
    .for("update");
  return row;
}

/**
 * Is `number` held by another document of this kind, now or in the past?
 * `selfId` excludes one document, so it can go back to its own old number.
 */
async function isNumberTaken(tx: Tx, kind: DocKind, number: string, selfId?: string) {
  const d = DOCS[kind];
  const [live] = await tx
    .select({ one: sql`1` })
    .from(d.table)
    .where(and(sql`lower(${d.number}) = lower(${number})`, selfId ? ne(d.id, selfId) : undefined))
    .limit(1);
  if (live) return true;
  const [reserved] = await tx
    .select({ one: sql`1` })
    .from(numberAmendments)
    .where(
      and(
        eq(numberAmendments.kind, kind),
        sql`lower(${numberAmendments.oldNumber}) = lower(${number})`,
        selfId ? ne(numberAmendments.docId, selfId) : undefined,
      ),
    )
    .limit(1);
  return !!reserved;
}

/**
 * Take the next invoice or receipt number. Must run inside a transaction. If
 * the surrounding transaction rolls back, the counter rolls back too, so
 * there are no gaps (apart from numbers skipped because they're taken).
 */
export async function takeNextNumber(tx: Tx, kind: DocKind): Promise<string> {
  const d = DOCS[kind];
  const s = await lockSettings(tx);
  const { n, number } = await pickFreeNumber(
    d.next(s),
    (i) => formatDocNumber(d.prefix(s), i),
    (candidate) => isNumberTaken(tx, kind, candidate),
  );
  await tx.update(businessSettings).set(d.counter(n + 1)).where(eq(businessSettings.id, 1));
  return number;
}

/** A problem the owner can fix (shown next to the field). */
export class NumberError extends Error {
  constructor(
    message: string,
    readonly field: "number" | "_form" = "number",
  ) {
    super(message);
  }
}

/**
 * Change a document's number and record it in the permanent history.
 * The caller must already hold the invoice row lock (FOR UPDATE).
 * `invoiceId` is the invoice itself (kind "invoice") or the receipt's invoice.
 */
export async function amendDocNumber(
  tx: Tx,
  a: {
    kind: DocKind;
    docId: string;
    invoiceId: string;
    current: string;
    next: string;
    reason: string | null;
    user: { id: string; name: string };
  },
): Promise<void> {
  await lockSettings(tx);
  if (a.next === a.current) throw new NumberError("That is already the current number.");
  if (await isNumberTaken(tx, a.kind, a.next, a.docId)) {
    throw new NumberError(
      `That number is used by another ${a.kind}, now or in the past. Old numbers stay reserved.`,
    );
  }
  await DOCS[a.kind].setNumber(tx, a.docId, a.next);
  await tx.insert(numberAmendments).values({
    kind: a.kind,
    docId: a.docId,
    invoiceId: a.invoiceId,
    oldNumber: a.current,
    newNumber: a.next,
    reason: a.reason,
    changedBy: a.user.id,
    changedByName: a.user.name,
  });
}

/** Search condition: a document of this kind that used to have a number matching `q`. */
export function oldNumberMatches(kind: DocKind, docIdCol: AnyColumn, q: string): SQL {
  return sql`exists (select 1 from ${numberAmendments} where ${numberAmendments.kind} = ${kind} and ${numberAmendments.docId} = ${docIdCol} and ${numberAmendments.oldNumber} ilike ${`%${escapeLike(q)}%`})`;
}

export type NumberAmendment = typeof numberAmendments.$inferSelect;

/** Number changes for an invoice and its receipts, newest first. */
export async function listNumberAmendments(invoiceId: string): Promise<NumberAmendment[]> {
  return db
    .select()
    .from(numberAmendments)
    .where(eq(numberAmendments.invoiceId, invoiceId))
    .orderBy(desc(numberAmendments.createdAt));
}
