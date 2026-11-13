import "server-only";
import { renderToBuffer } from "@react-pdf/renderer";
import { bpToPercent, formatMoney } from "@/lib/money";
import { PAYMENT_METHOD_LABELS } from "@/lib/payments";
import { registerPdfFonts } from "@/lib/pdf/fonts";
import { InvoicePdf, type InvoicePdfData } from "@/lib/pdf/invoice-pdf";
import { ReceiptPdf, type ReceiptPdfData } from "@/lib/pdf/receipt-pdf";
import { getInvoice } from "./invoices";
import { getPaymentForReceipt } from "./payments";
import { getSettings } from "./settings";

function businessInfo(settings: Awaited<ReturnType<typeof getSettings>>) {
  return {
    name: settings.name,
    email: settings.email,
    phone: settings.phone,
    address: settings.address,
    taxId: settings.taxId,
  };
}

/** Render an invoice to a PDF buffer. */
export async function renderInvoicePdf(invoiceId: string) {
  const [invoice, settings] = await Promise.all([getInvoice(invoiceId), getSettings()]);
  if (!invoice) return null;

  const discountLabel =
    invoice.discountType === "percent"
      ? `Discount (${bpToPercent(invoice.discountValue)}%)`
      : invoice.discountType === "fixed"
        ? `Discount (${formatMoney(invoice.discountValue, invoice.currency)})`
        : null;

  const data: InvoicePdfData = {
    number: invoice.number,
    status: invoice.effectiveStatus,
    currency: invoice.currency,
    issueDate: invoice.issueDate,
    dueDate: invoice.dueDate,
    business: businessInfo(settings),
    client: {
      name: invoice.client.name,
      email: invoice.client.email,
      address: invoice.client.address,
      taxId: invoice.client.taxId,
    },
    items: invoice.items.map((i) => ({
      description: i.description,
      quantity: String(Number(i.quantity)),
      unitPriceCents: i.unitPriceCents,
      taxRateBp: i.taxRateBp,
      lineSubtotalCents: i.lineSubtotalCents,
    })),
    subtotalCents: invoice.subtotalCents,
    discountCents: invoice.discountCents,
    discountLabel,
    taxCents: invoice.taxCents,
    totalCents: invoice.totalCents,
    paidCents: invoice.paidCents,
    notes: invoice.notes,
    terms: invoice.terms,
    footer: null,
  };

  registerPdfFonts();
  const buffer = await renderToBuffer(<InvoicePdf data={data} />);
  const filename = invoice.number
    ? `${invoice.number}.pdf`
    : `draft-invoice-${invoice.id.slice(0, 8)}.pdf`;
  return { buffer, filename };
}

/** Render a payment receipt to a PDF buffer. */
export async function renderReceiptPdf(paymentId: string) {
  const [row, settings] = await Promise.all([getPaymentForReceipt(paymentId), getSettings()]);
  if (!row) return null;

  const data: ReceiptPdfData = {
    receiptNumber: row.payment.receiptNumber,
    paidAt: row.payment.paidAt,
    amountCents: row.payment.amountCents,
    currency: row.invoice.currency,
    method: PAYMENT_METHOD_LABELS[row.payment.method],
    reference: row.payment.reference,
    reversed: !!row.payment.voidedAt,
    business: businessInfo(settings),
    client: row.client,
    invoice: {
      number: row.invoice.number,
      issueDate: row.invoice.issueDate,
      totalCents: row.invoice.totalCents,
    },
    paidToDateCents: row.paidToDate,
  };

  registerPdfFonts();
  const buffer = await renderToBuffer(<ReceiptPdf data={data} />);
  return { buffer, filename: `${row.payment.receiptNumber}.pdf` };
}
