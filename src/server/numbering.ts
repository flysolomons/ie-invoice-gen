import "server-only";
import { eq, sql } from "drizzle-orm";
import type { Tx } from "@/db";
import { businessSettings } from "@/db/schema";

/** INV- + 7 → "INV-0007"; grows past 4 digits naturally ("INV-12345"). */
export function formatDocNumber(prefix: string, n: number): string {
  return `${prefix}${String(n).padStart(4, "0")}`;
}

/**
 * Take the next invoice or receipt number. Must run inside a transaction: the
 * UPDATE row-locks the settings row, so concurrent issuers queue up and every
 * number is used exactly once. If the surrounding transaction rolls back, the
 * counter rolls back too, so there are no gaps.
 */
export async function takeNextNumber(tx: Tx, kind: "invoice" | "receipt"): Promise<string> {
  const counter =
    kind === "invoice" ? businessSettings.nextInvoiceNumber : businessSettings.nextReceiptNumber;
  const prefix = kind === "invoice" ? businessSettings.invoicePrefix : businessSettings.receiptPrefix;

  // Make sure the singleton row exists (first issue on a fresh database).
  await tx.insert(businessSettings).values({ id: 1 }).onConflictDoNothing();

  const [row] = await tx
    .update(businessSettings)
    .set(
      kind === "invoice"
        ? { nextInvoiceNumber: sql`${counter} + 1` }
        : { nextReceiptNumber: sql`${counter} + 1` },
    )
    .where(eq(businessSettings.id, 1))
    .returning({ taken: sql<number>`${counter} - 1`, prefix });

  return formatDocNumber(row.prefix, Number(row.taken));
}
