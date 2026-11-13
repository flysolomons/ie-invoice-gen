import { Download, FileText } from "lucide-react";
import Link from "next/link";
import { reversePayment } from "@/app/(app)/payments/actions";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatMoney } from "@/lib/money";
import { PAYMENT_METHOD_LABELS } from "@/lib/payments";
import type { PaymentRow } from "@/server/payments";
import { ConfirmActionButton } from "./confirm-action-button";

export function PaymentsTable({
  rows,
  showInvoice = true,
  canReverse = false,
}: {
  rows: PaymentRow[];
  showInvoice?: boolean;
  canReverse?: boolean;
}) {
  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Receipt</TableHead>
            <TableHead>Date</TableHead>
            {showInvoice && <TableHead>Invoice</TableHead>}
            {showInvoice && <TableHead className="hidden md:table-cell">Client</TableHead>}
            <TableHead className="hidden sm:table-cell">Method</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead className="text-right">
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((p) => {
            const reversed = !!p.voidedAt;
            const receiptUrl = `/api/payments/${p.id}/receipt`;
            return (
              <TableRow key={p.id} className={reversed ? "text-muted-foreground" : undefined}>
                <TableCell className="font-medium whitespace-nowrap">
                  {p.receiptNumber}
                  {reversed && <span className="ml-2 text-xs">(reversed)</span>}
                </TableCell>
                <TableCell className="tabular-nums whitespace-nowrap">{p.paidAt}</TableCell>
                {showInvoice && (
                  <TableCell>
                    <Link href={`/invoices/${p.invoiceId}`} className="hover:underline">
                      {p.invoiceNumber}
                    </Link>
                  </TableCell>
                )}
                {showInvoice && (
                  <TableCell className="hidden md:table-cell">
                    <Link href={`/clients/${p.clientId}`} className="hover:underline">
                      {p.clientName}
                    </Link>
                  </TableCell>
                )}
                <TableCell className="hidden sm:table-cell">
                  {PAYMENT_METHOD_LABELS[p.method]}
                  {p.reference && <div className="text-xs text-muted-foreground">{p.reference}</div>}
                </TableCell>
                <TableCell
                  className={`text-right tabular-nums ${reversed ? "line-through" : ""}`}
                >
                  {formatMoney(p.amountCents, p.currency)}
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    <a
                      href={receiptUrl}
                      target="_blank"
                      rel="noopener"
                      className="rounded-md p-1.5 hover:bg-muted"
                      aria-label={`View receipt ${p.receiptNumber}`}
                      title="View receipt"
                    >
                      <FileText className="size-4" />
                    </a>
                    <a
                      href={`${receiptUrl}?download=1`}
                      className="rounded-md p-1.5 hover:bg-muted"
                      aria-label={`Download receipt ${p.receiptNumber}`}
                      title="Download receipt"
                    >
                      <Download className="size-4" />
                    </a>
                    {canReverse && !reversed && (
                      <ConfirmActionButton
                        label="Reverse"
                        confirmLabel="Confirm reverse"
                        variant="ghost"
                        action={reversePayment.bind(null, p.id)}
                      />
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
