import { Paperclip } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/app/page-header";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { todayInTimezone } from "@/lib/invoice-status";
import { formatMoney } from "@/lib/money";
import { requireUser } from "@/lib/session";
import { listCategories, listExpenses } from "@/server/expenses";
import { getSettings } from "@/server/settings";

export const metadata: Metadata = { title: "Expenses" };

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; categoryId?: string; q?: string }>;
}) {
  await requireUser();
  const [sp, settings, categories] = await Promise.all([
    searchParams,
    getSettings(),
    listCategories(),
  ]);
  // Default to the current month; "all" shows everything.
  const month = sp.month ?? todayInTimezone(settings.timezone).slice(0, 7);
  const categoryId = categories.some((c) => c.id === sp.categoryId) ? sp.categoryId : undefined;
  const { rows, totals } = await listExpenses({
    month: month === "all" ? undefined : month,
    categoryId,
    q: sp.q,
  });
  const count = totals.reduce((n, t) => n + t.count, 0);

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Expenses"
        actions={
          <Link href="/expenses/new" className={buttonVariants()}>
            New expense
          </Link>
        }
      />

      <form className="flex flex-wrap items-end gap-2" role="search">
        <label className="grid gap-1 text-sm">
          Month
          <Input
            type="month"
            name="month"
            defaultValue={month === "all" ? "" : month}
            className="w-40"
          />
        </label>
        <label className="grid gap-1 text-sm">
          Category
          <NativeSelect name="categoryId" defaultValue={categoryId ?? ""} className="w-44">
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </NativeSelect>
        </label>
        <label className="grid gap-1 text-sm">
          Search
          <Input name="q" defaultValue={sp.q} placeholder="Vendor or notes" className="w-48" />
        </label>
        <Button type="submit" variant="outline">
          Filter
        </Button>
        <Link href="/expenses?month=all" className="self-center text-sm underline-offset-4 hover:underline">
          Show all time
        </Link>
      </form>

      {totals.length > 0 && (
        <p className="text-sm">
          <span className="text-muted-foreground">
            {month === "all" ? "All time" : month} total:{" "}
          </span>
          {totals.map((t, i) => (
            <span key={t.currency} className="font-semibold tabular-nums">
              {i > 0 && " + "}
              {formatMoney(t.totalCents, t.currency)}
            </span>
          ))}
          <span className="text-muted-foreground">
            {" "}
            ({count} {count === 1 ? "expense" : "expenses"})
          </span>
        </p>
      )}

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No expenses for this filter.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead className="hidden sm:table-cell">Category</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="w-8">
                  <span className="sr-only">Receipt attached</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="tabular-nums whitespace-nowrap">{e.expenseDate}</TableCell>
                  <TableCell className="font-medium">
                    <Link href={`/expenses/${e.id}`} className="hover:underline">
                      {e.vendor}
                    </Link>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">{e.categoryName ?? "—"}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatMoney(e.amountCents, e.currency)}
                  </TableCell>
                  <TableCell>
                    {e.hasFile && (
                      <Paperclip className="size-4 text-muted-foreground" aria-label="Receipt attached" />
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
