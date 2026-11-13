import { Download, FileText } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ConfirmActionButton } from "@/components/app/confirm-action-button";
import { PaymentsTable } from "@/components/app/payments-table";
import { PageHeader } from "@/components/app/page-header";
import { StatusBadge } from "@/components/app/status-badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { todayInTimezone } from "@/lib/invoice-status";
import { bpToPercent, centsToInput, formatMoney } from "@/lib/money";
import { requireUser } from "@/lib/session";
import { getInvoice } from "@/server/invoices";
import { listInvoicePayments } from "@/server/payments";
import { getSettings } from "@/server/settings";
import { deleteDraft, duplicateInvoice, issueInvoice, voidInvoice } from "../actions";
import { RecordPaymentForm } from "./record-payment-form";

export const metadata: Metadata = { title: "Invoice" };

const UUID = /^[0-9a-f-]{36}$/i;

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const [invoice, payments, settings] = await Promise.all([
    getInvoice(id),
    listInvoicePayments(id),
    getSettings(),
  ]);
  if (!invoice) notFound();
  const canRecordPayment = invoice.status === "sent" || invoice.status === "partially_paid";

  const fmt = (cents: number) => formatMoney(cents, invoice.currency);
  const isDraft = invoice.status === "draft";
  const balance = invoice.totalCents - invoice.paidCents;
  const pdfUrl = `/api/invoices/${invoice.id}/pdf`;
  const canVoid =
    user.role === "owner" &&
    (invoice.status === "sent" || invoice.status === "partially_paid") &&
    invoice.paidCents === 0;

  return (
    <div className="grid gap-6">
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-3">
            {invoice.number ?? "Draft invoice"}
            <StatusBadge status={invoice.effectiveStatus} />
          </span>
        }
        description={
          <>
            For{" "}
            <Link href={`/clients/${invoice.client.id}`} className="underline-offset-4 hover:underline">
              {invoice.client.name}
            </Link>
          </>
        }
        actions={
          <>
            {isDraft && (
              <>
                <ConfirmActionButton
                  label="Issue invoice"
                  confirmLabel="Confirm: assign number & lock"
                  variant="default"
                  action={issueInvoice.bind(null, invoice.id)}
                />
                <Link
                  href={`/invoices/${invoice.id}/edit`}
                  className={buttonVariants({ variant: "outline" })}
                >
                  Edit
                </Link>
              </>
            )}
            <a
              href={`${pdfUrl}`}
              target="_blank"
              rel="noopener"
              className={buttonVariants({ variant: "outline" })}
            >
              <FileText className="size-4" aria-hidden /> {isDraft ? "Preview PDF" : "View PDF"}
            </a>
            <a href={`${pdfUrl}?download=1`} className={buttonVariants({ variant: "outline" })}>
              <Download className="size-4" aria-hidden /> Download
            </a>
            {!isDraft && (
              <ConfirmActionButton
                label="Duplicate"
                confirmLabel="Confirm: copy to new draft"
                action={duplicateInvoice.bind(null, invoice.id)}
              />
            )}
            {canVoid && (
              <ConfirmActionButton
                label="Void"
                confirmLabel="Confirm void"
                action={voidInvoice.bind(null, invoice.id)}
              />
            )}
            {isDraft && (
              <ConfirmActionButton
                label="Delete draft"
                confirmLabel="Confirm delete"
                action={deleteDraft.bind(null, invoice.id)}
              />
            )}
          </>
        }
      />

      {isDraft && (
        <p className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
          This is a draft. Issuing it assigns the next invoice number and locks it from editing.
        </p>
      )}
      {invoice.status === "void" && (
        <p className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
          Voided{invoice.voidedAt ? ` on ${invoice.voidedAt.toISOString().slice(0, 10)}` : ""}. Its
          number stays reserved. Use Duplicate to reissue it as a new invoice.
        </p>
      )}
      {(invoice.status === "sent" || invoice.status === "partially_paid") && (
        <p className="text-sm text-muted-foreground">
          Download the PDF and send it to {invoice.client.email ?? "your client"}.
        </p>
      )}

      <dl className="grid gap-4 text-sm sm:grid-cols-4">
        <div>
          <dt className="text-muted-foreground">Issue date</dt>
          <dd className="tabular-nums">{invoice.issueDate}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Due date</dt>
          <dd className="tabular-nums">{invoice.dueDate}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Bill to</dt>
          <dd>
            {invoice.client.name}
            {invoice.client.email && <div className="text-muted-foreground">{invoice.client.email}</div>}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Balance due</dt>
          <dd className="text-base font-semibold tabular-nums">
            {invoice.status === "void" ? "—" : fmt(balance)}
          </dd>
        </div>
      </dl>

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead className="text-right">Unit price</TableHead>
              <TableHead className="text-right">Tax</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoice.items.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="whitespace-pre-wrap">{item.description}</TableCell>
                <TableCell className="text-right tabular-nums">{Number(item.quantity)}</TableCell>
                <TableCell className="text-right tabular-nums">{fmt(item.unitPriceCents)}</TableCell>
                <TableCell className="text-right tabular-nums">{bpToPercent(item.taxRateBp)}%</TableCell>
                <TableCell className="text-right tabular-nums">{fmt(item.lineSubtotalCents)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="grid h-fit gap-4 text-sm">
          {invoice.notes && (
            <div>
              <h2 className="font-medium">Notes</h2>
              <p className="whitespace-pre-wrap text-muted-foreground">{invoice.notes}</p>
            </div>
          )}
          {invoice.terms && (
            <div>
              <h2 className="font-medium">Terms</h2>
              <p className="whitespace-pre-wrap text-muted-foreground">{invoice.terms}</p>
            </div>
          )}
        </div>
        <dl className="grid h-fit gap-2 rounded-lg border p-4 text-sm">
          <div className="flex justify-between">
            <dt>Subtotal</dt>
            <dd className="tabular-nums">{fmt(invoice.subtotalCents)}</dd>
          </div>
          {invoice.discountCents > 0 && (
            <div className="flex justify-between">
              <dt>
                Discount
                {invoice.discountType === "percent" && ` (${bpToPercent(invoice.discountValue)}%)`}
              </dt>
              <dd className="tabular-nums">−{fmt(invoice.discountCents)}</dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt>Tax</dt>
            <dd className="tabular-nums">{fmt(invoice.taxCents)}</dd>
          </div>
          <div className="flex justify-between border-t pt-2 text-base font-semibold">
            <dt>Total</dt>
            <dd className="tabular-nums">{fmt(invoice.totalCents)}</dd>
          </div>
          {invoice.paidCents > 0 && (
            <div className="flex justify-between">
              <dt>Paid</dt>
              <dd className="tabular-nums">−{fmt(invoice.paidCents)}</dd>
            </div>
          )}
        </dl>
      </div>

      {(canRecordPayment || payments.length > 0) && (
        <section className="grid gap-3" aria-labelledby="payments-heading">
          <h2 id="payments-heading" className="font-medium">
            Payments
          </h2>
          {canRecordPayment && (
            <RecordPaymentForm
              invoiceId={invoice.id}
              balance={centsToInput(balance)}
              currency={invoice.currency}
              today={todayInTimezone(settings.timezone)}
            />
          )}
          {payments.length > 0 ? (
            <PaymentsTable rows={payments} showInvoice={false} canReverse={user.role === "owner"} />
          ) : (
            <p className="text-sm text-muted-foreground">No payments recorded yet.</p>
          )}
        </section>
      )}
    </div>
  );
}
