import "server-only";
import { revalidatePath } from "next/cache";

/**
 * Refresh every page that shows an invoice's numbers or money: its detail
 * page, the invoice and payment lists, and the dashboard.
 */
export function revalidateInvoiceViews(invoiceId: string) {
  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath("/invoices");
  revalidatePath("/payments");
  revalidatePath("/dashboard");
}
