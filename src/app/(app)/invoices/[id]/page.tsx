import { cn } from "cn";
import {
  AlertTriangle,
  ArrowLeft,
  Ban,
  CheckCircle2,
  Download,
  FileText,
  PencilLine,
  type LucideIcon,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AmendNumberDialog } from "@/components/app/amend-number-dialog";
import { CARD, StatCard } from "@/components/app/blocks";
import { ConfirmActionButton } from "@/components/app/confirm-action-button";
import { NumberHistory } from "@/components/app/number-history";
import { PaymentsTable } from "@/components/app/payments-table";
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
import { dueLabel, todayInTimezone } from "@/lib/invoice-status";
import { bpToPercent, centsToInput, formatMoney } from "@/lib/money";
import { requireUser } from "@/lib/session";
import { getInvoice } from "@/server/invoices";
import { getMemberName } from "@/server/members";
import { listNumberAmendments } from "@/server/numbering";
import { listInvoicePayments } from "@/server/payments";
import { getSettings } from "@/server/settings";
import { deleteDraft, duplicateInvoice, issueInvoice, voidInvoice } from "../actions";
import { amendInvoiceNumber } from "../amend-number-actions";
import { RecordPaymentForm } from "./record-payment-form";

export const metadata: Metadata = { title: "Invoice" };

const UUID = /^[0-9a-f-]{36}$/i;

function Notice({
  icon: Icon,
  tone,
  children,
}: {
  icon: LucideIcon;
  tone: "info" | "danger" | "muted" | "success";
  children: React.ReactNode;
}) {
  const tones = {
    info: "border-primary/20 bg-primary/5 text-foreground [&>svg]:text-primary",
    danger: "border-destructive/30 bg-destructive/5 text-foreground [&>svg]:text-danger-foreground",
    muted: "border-border bg-muted/60 text-muted-foreground [&>svg]:text-muted-foreground",
    success: "border-success/25 bg-success/8 text-foreground [&>svg]:text-success-foreground",
  };
  return (
    <div className={cn("flex items-start gap-3 rounded-xl border px-4 py-3 text-sm", tones[tone])}>
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div>{children}</div>
    </div>
  );
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{children}</dd>
    </div>
  );
}

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const [invoice, payments, settings, numberChanges] = await Promise.all([
    getInvoice(id),
    listInvoicePayments(id),
    getSettings(),
    listNumberAmendments(id),
  ]);
  if (!invoice) notFound();
  const createdByName = await getMemberName(invoice.createdBy);

  const isOwner = user.role === "owner";
  const isDraft = invoice.status === "draft";
  const isVoid = invoice.status === "void";
  const isOpen = invoice.status === "sent" || invoice.status === "partially_paid";
  const isOverdue = invoice.effectiveStatus === "overdue";
  const canVoid = isOwner && isOpen && invoice.paidCents === 0;
  const today = todayInTimezone(settings.timezone);

  const fmt = (cents: number) => formatMoney(cents, invoice.currency);
  const balance = invoice.totalCents - invoice.paidCents;
  const paidPct =
    invoice.totalCents > 0 ? Math.min(100, Math.round((invoice.paidCents / invoice.totalCents) * 100)) : 0;
  const pdfUrl = `/api/invoices/${invoice.id}/pdf`;

  return (
    <div className="grid gap-6">
      {/* Header */}
      <div className="grid gap-4">
        <Link
          href="/invoices"
          className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden /> Invoices
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="grid min-w-0 gap-1">
            <h1 className="flex flex-wrap items-center gap-3 text-2xl font-semibold">
              <span className="truncate">{invoice.number ?? "Draft invoice"}</span>
              <StatusBadge status={invoice.effectiveStatus} />
            </h1>
            <p className="text-sm text-muted-foreground">
              Billed to{" "}
              <Link
                href={`/clients/${invoice.client.id}`}
                className="font-medium text-foreground underline-offset-4 hover:underline"
              >
                {invoice.client.name}
              </Link>
              {createdByName && <> · Created by {createdByName}</>}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
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
                  <PencilLine aria-hidden /> Edit
                </Link>
              </>
            )}
            <a href={pdfUrl} target="_blank" rel="noopener" className={buttonVariants({ variant: "outline" })}>
              <FileText aria-hidden /> {isDraft ? "Preview PDF" : "View PDF"}
            </a>
            <a href={`${pdfUrl}?download=1`} className={buttonVariants({ variant: "outline" })}>
              <Download aria-hidden /> Download
            </a>
            {isOwner && invoice.number && (
              <AmendNumberDialog
                kind="invoice"
                current={invoice.number}
                action={amendInvoiceNumber.bind(null, invoice.id)}
              />
            )}
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
          </div>
        </div>
      </div>

      {/* Status notices */}
      {isDraft && (
        <Notice icon={PencilLine} tone="info">
          This is a draft. Issuing it assigns the next invoice number and locks it from editing.
        </Notice>
      )}
      {isVoid && (
        <Notice icon={Ban} tone="muted">
          Voided{invoice.voidedAt ? ` on ${invoice.voidedAt.toISOString().slice(0, 10)}` : ""}. Its
          number stays reserved. Use Duplicate to reissue it as a new invoice.
        </Notice>
      )}
      {isOverdue && (
        <Notice icon={AlertTriangle} tone="danger">
          <span className="font-medium">{dueLabel(invoice.dueDate, today)}.</span> {fmt(balance)} is
          still outstanding.
        </Notice>
      )}
      {invoice.status === "paid" && (
        <Notice icon={CheckCircle2} tone="success">
          Paid in full. Receipts are listed under Payments below.
        </Notice>
      )}

      {/* Summary */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total" value={fmt(invoice.totalCents)} hint={`${invoice.items.length} line item${invoice.items.length === 1 ? "" : "s"}`} />
        <StatCard
          label="Paid"
          value={fmt(invoice.paidCents)}
          hint={isDraft || isVoid ? undefined : `${paidPct}% of total`}
        />
        <StatCard
          label="Balance due"
          value={isVoid ? "—" : fmt(balance)}
          hint={isVoid ? "Void" : balance === 0 && !isDraft ? "Nothing left to pay" : undefined}
          hero
        />
        <StatCard
          label="Due date"
          value={invoice.dueDate}
          hint={isOpen ? dueLabel(invoice.dueDate, today) : `Issued ${invoice.issueDate}`}
          alert={isOverdue}
        />
      </div>
      {!isDraft && !isVoid && (
        <div className="grid gap-1.5" aria-hidden>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className={cn("h-full rounded-full", paidPct === 100 ? "bg-success" : "bg-primary")}
              style={{ width: `${paidPct}%` }}
            />
          </div>
        </div>
      )}

      {/* Items + sidebar */}
      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="grid h-fit gap-6">
          <section className={cn(CARD, "overflow-hidden")} aria-labelledby="items-heading">
            <h2 id="items-heading" className="border-b px-5 py-3.5 font-medium">
              Items
            </h2>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="pl-5">Description</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Unit price</TableHead>
                    <TableHead className="hidden text-right sm:table-cell">Tax</TableHead>
                    <TableHead className="pr-5 text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoice.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="pl-5 whitespace-pre-wrap">{item.description}</TableCell>
                      <TableCell className="text-right tabular-nums">{Number(item.quantity)}</TableCell>
                      <TableCell className="text-right text-muted-foreground tabular-nums">
                        {fmt(item.unitPriceCents)}
                      </TableCell>
                      <TableCell className="hidden text-right text-muted-foreground tabular-nums sm:table-cell">
                        {bpToPercent(item.taxRateBp)}%
                      </TableCell>
                      <TableCell className="pr-5 text-right font-medium tabular-nums">
                        {fmt(item.lineSubtotalCents)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <dl className="ml-auto grid w-full max-w-xs gap-1.5 border-t px-5 py-4 text-sm sm:border-t-0">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Subtotal</dt>
                <dd className="tabular-nums">{fmt(invoice.subtotalCents)}</dd>
              </div>
              {invoice.discountCents > 0 && (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">
                    Discount
                    {invoice.discountType === "percent" && ` (${bpToPercent(invoice.discountValue)}%)`}
                  </dt>
                  <dd className="tabular-nums">−{fmt(invoice.discountCents)}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Tax</dt>
                <dd className="tabular-nums">{fmt(invoice.taxCents)}</dd>
              </div>
              <div className="mt-1 flex justify-between rounded-lg bg-primary px-3 py-2 text-base font-semibold text-primary-foreground">
                <dt>Total</dt>
                <dd className="tabular-nums">{fmt(invoice.totalCents)}</dd>
              </div>
              {invoice.paidCents > 0 && (
                <>
                  <div className="mt-1 flex justify-between">
                    <dt className="text-muted-foreground">Paid</dt>
                    <dd className="tabular-nums">−{fmt(invoice.paidCents)}</dd>
                  </div>
                  <div className="flex justify-between font-semibold">
                    <dt>Balance due</dt>
                    <dd className="tabular-nums">{fmt(balance)}</dd>
                  </div>
                </>
              )}
            </dl>
          </section>

          {(invoice.notes || invoice.terms) && (
            <section className={cn(CARD, "grid gap-4 p-5 text-sm sm:grid-cols-2")} aria-label="Notes and terms">
              {invoice.notes && (
                <div>
                  <h2 className="mb-1 font-medium">Notes</h2>
                  <p className="whitespace-pre-wrap text-muted-foreground">{invoice.notes}</p>
                </div>
              )}
              {invoice.terms && (
                <div>
                  <h2 className="mb-1 font-medium">Terms</h2>
                  <p className="whitespace-pre-wrap text-muted-foreground">{invoice.terms}</p>
                </div>
              )}
            </section>
          )}
        </div>

        <aside className="grid h-fit gap-6">
          <section className={cn(CARD, "p-5")} aria-labelledby="billto-heading">
            <h2 id="billto-heading" className="mb-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Bill to
            </h2>
            <Link
              href={`/clients/${invoice.client.id}`}
              className="font-semibold underline-offset-4 hover:underline"
            >
              {invoice.client.name}
            </Link>
            <div className="mt-1 grid gap-0.5 text-sm text-muted-foreground">
              {invoice.client.email && <span className="break-all">{invoice.client.email}</span>}
              {invoice.client.phone && <span>{invoice.client.phone}</span>}
              {invoice.client.address && <span className="whitespace-pre-wrap">{invoice.client.address}</span>}
              {invoice.client.taxId && <span>Tax ID: {invoice.client.taxId}</span>}
            </div>
          </section>

          <section className={cn(CARD, "px-5 py-3")} aria-labelledby="details-heading">
            <h2 id="details-heading" className="py-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Details
            </h2>
            <dl className="divide-y">
              <DetailRow label="Invoice no.">{invoice.number ?? "Not issued"}</DetailRow>
              <DetailRow label="Issue date">
                <span className="tabular-nums">{invoice.issueDate}</span>
              </DetailRow>
              <DetailRow label="Due date">
                <span className="tabular-nums">{invoice.dueDate}</span>
              </DetailRow>
              <DetailRow label="Currency">{invoice.currency}</DetailRow>
              <DetailRow label="Created by">{createdByName ?? "—"}</DetailRow>
            </dl>
          </section>
        </aside>
      </div>

      {/* Payments */}
      {(isOpen || payments.length > 0) && (
        <section className="grid gap-3" aria-labelledby="payments-heading">
          <div className="flex items-baseline justify-between gap-2">
            <h2 id="payments-heading" className="text-lg font-semibold">
              Payments
            </h2>
            {payments.length > 0 && (
              <span className="text-sm text-muted-foreground">
                {payments.length} receipt{payments.length === 1 ? "" : "s"}
              </span>
            )}
          </div>
          {isOpen && (
            <RecordPaymentForm
              invoiceId={invoice.id}
              balance={centsToInput(balance)}
              currency={invoice.currency}
              today={today}
            />
          )}
          {payments.length > 0 ? (
            <PaymentsTable rows={payments} showInvoice={false} canReverse={isOwner} canAmend={isOwner} />
          ) : (
            <p className="text-sm text-muted-foreground">No payments recorded yet.</p>
          )}
        </section>
      )}

      {numberChanges.length > 0 && <NumberHistory rows={numberChanges} timeZone={settings.timezone} />}
    </div>
  );
}
