import { cn } from "cn";
import { Paperclip, Receipt, Search } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { CARD, EmptyState, StatCard } from "@/components/app/blocks";
import { PageHeader } from "@/components/app/page-header";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { orderTotals } from "@/lib/currency-totals";
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
  const [primary, ...others] = orderTotals(
    totals.map((t) => ({ currency: t.currency, cents: t.totalCents })),
    settings.defaultCurrency,
  );
  const withReceipt = rows.filter((e) => e.hasFile).length;
  const period =
    month === "all"
      ? "All time"
      : new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" }).format(
          new Date(`${month}-01T00:00:00Z`),
        );

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Expenses"
        description="Business costs, with their receipts attached."
        actions={
          <Link href="/expenses/new" className={buttonVariants()}>
            New expense
          </Link>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          label={`Spent · ${period}`}
          value={formatMoney(primary.cents, primary.currency)}
          hint={
            others.length > 0 ? others.map((t) => `+ ${formatMoney(t.cents, t.currency)}`).join("  ") : undefined
          }
          icon={Receipt}
          hero
        />
        <StatCard label="Expenses" value={count} hint={categoryId || sp.q ? "Matching your filters" : period} />
        <StatCard
          label="Receipts attached"
          value={`${withReceipt} of ${rows.length}`}
          hint={rows.length > withReceipt ? "Some are missing a receipt" : "All have receipts"}
          icon={Paperclip}
        />
      </div>

      <form
        role="search"
        className={cn(CARD, "flex flex-wrap items-end gap-3 p-3")}
        aria-label="Filter expenses"
      >
        <div className="grid gap-1.5">
          <Label htmlFor="f-month" className="text-xs text-muted-foreground">
            Month
          </Label>
          <Input
            id="f-month"
            type="month"
            name="month"
            defaultValue={month === "all" ? "" : month}
            className="w-40"
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="f-category" className="text-xs text-muted-foreground">
            Category
          </Label>
          <NativeSelect id="f-category" name="categoryId" defaultValue={categoryId ?? ""} className="w-44">
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="grid min-w-48 flex-1 gap-1.5">
          <Label htmlFor="f-q" className="text-xs text-muted-foreground">
            Search
          </Label>
          <div className="relative">
            <Search
              aria-hidden
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input id="f-q" type="search" name="q" defaultValue={sp.q} placeholder="Vendor or notes" className="pl-9" />
          </div>
        </div>
        <Button type="submit">Apply</Button>
        <Link
          href={month === "all" ? "/expenses" : "/expenses?month=all"}
          className={buttonVariants({ variant: "ghost" })}
        >
          {month === "all" ? "This month" : "All time"}
        </Link>
      </form>

      {rows.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="No expenses for this filter"
          action={
            <Link href="/expenses/new" className={buttonVariants({ variant: "outline" })}>
              Record an expense
            </Link>
          }
        >
          Try another month or category, or show all time.
        </EmptyState>
      ) : (
        <div className={cn(CARD, "overflow-x-auto")}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead className="hidden sm:table-cell">Category</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="w-10">
                  <span className="sr-only">Receipt attached</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="text-muted-foreground tabular-nums whitespace-nowrap">
                    {e.expenseDate}
                  </TableCell>
                  <TableCell className="font-medium">
                    <Link href={`/expenses/${e.id}`} className="hover:underline">
                      {e.vendor}
                    </Link>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    {e.categoryName ? (
                      <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                        {e.categoryName}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
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
