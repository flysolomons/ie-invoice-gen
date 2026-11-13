import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatMoney } from "@/lib/money";
import type { InvoiceListRow } from "@/server/invoices";
import { StatusBadge } from "./status-badge";

export function InvoiceTable({ rows, hideClient }: { rows: InvoiceListRow[]; hideClient?: boolean }) {
  return (
    <div className="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Number</TableHead>
            {!hideClient && <TableHead>Client</TableHead>}
            <TableHead>Status</TableHead>
            <TableHead className="hidden sm:table-cell">Issued</TableHead>
            <TableHead className="hidden sm:table-cell">Due</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead className="hidden text-right md:table-cell">Balance</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((inv) => (
            <TableRow key={inv.id}>
              <TableCell className="font-medium">
                <Link href={`/invoices/${inv.id}`} className="hover:underline">
                  {inv.number ?? <span className="text-muted-foreground italic">Draft</span>}
                </Link>
              </TableCell>
              {!hideClient && (
                <TableCell>
                  <Link href={`/clients/${inv.clientId}`} className="hover:underline">
                    {inv.clientName}
                  </Link>
                </TableCell>
              )}
              <TableCell>
                <StatusBadge status={inv.effectiveStatus} />
              </TableCell>
              <TableCell className="hidden tabular-nums sm:table-cell">{inv.issueDate}</TableCell>
              <TableCell className="hidden tabular-nums sm:table-cell">{inv.dueDate}</TableCell>
              <TableCell className="text-right tabular-nums">
                {formatMoney(inv.totalCents, inv.currency)}
              </TableCell>
              <TableCell className="hidden text-right tabular-nums md:table-cell">
                {inv.status === "void" || inv.status === "draft"
                  ? "—"
                  : formatMoney(inv.totalCents - inv.paidCents, inv.currency)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
