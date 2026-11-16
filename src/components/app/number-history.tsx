import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { NumberAmendment } from "@/server/numbering";

/** Permanent record of number changes on an invoice and its receipts. */
export function NumberHistory({ rows, timeZone }: { rows: NumberAmendment[]; timeZone: string }) {
  const when = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone });
  return (
    <section className="grid gap-3" aria-labelledby="number-history-heading">
      <div>
        <h2 id="number-history-heading" className="text-lg font-semibold">
          Number history
        </h2>
        <p className="text-sm text-muted-foreground">
          Old numbers stay reserved and still find this invoice in search.
        </p>
      </div>
      <div className="overflow-x-auto rounded-xl border bg-card shadow-float">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>When</TableHead>
              <TableHead>Document</TableHead>
              <TableHead>Change</TableHead>
              <TableHead className="hidden sm:table-cell">By</TableHead>
              <TableHead className="hidden md:table-cell">Reason</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="whitespace-nowrap tabular-nums">{when.format(r.createdAt)}</TableCell>
                <TableCell>{r.kind === "invoice" ? "Invoice" : "Receipt"}</TableCell>
                <TableCell className="whitespace-nowrap">
                  <span className="text-muted-foreground line-through">{r.oldNumber}</span>
                  <span aria-hidden> → </span>
                  <span className="sr-only"> changed to </span>
                  <span className="font-medium">{r.newNumber}</span>
                </TableCell>
                <TableCell className="hidden sm:table-cell">{r.changedByName}</TableCell>
                <TableCell className="hidden text-muted-foreground md:table-cell">
                  {r.reason ?? "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}
