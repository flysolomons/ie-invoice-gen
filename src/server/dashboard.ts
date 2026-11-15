import "server-only";
import { and, asc, eq, gte, inArray, isNull, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import { clients, expenses, invoices, payments } from "@/db/schema";
import { type CurrencyTotal, orderTotals } from "@/lib/currency-totals";
import { effectiveStatus, OPEN_STATUSES, todayInTimezone } from "@/lib/invoice-status";
import { monthRange } from "./expenses";
import { listPayments } from "./payments";
import { getSettings } from "./settings";

export type Metric = { totals: CurrencyTotal[]; count: number };

const balance = sql<number>`coalesce(sum(${invoices.totalCents} - ${invoices.paidCents}), 0)::int`;
const n = sql<number>`count(*)::int`;

function toMetric(rows: { currency: string; cents: number; count: number }[], fallback: string): Metric {
  return {
    totals: orderTotals(rows, fallback),
    count: rows.reduce((sum, r) => sum + r.count, 0),
  };
}

/**
 * Everything the dashboard shows, in one round of parallel queries.
 * "This month" and "overdue" use today's date in the business timezone.
 */
export async function getDashboard() {
  const settings = await getSettings();
  const today = todayInTimezone(settings.timezone);
  const month = today.slice(0, 7);
  const [monthStart, nextMonthStart] = monthRange(month);
  const isOpen = inArray(invoices.status, [...OPEN_STATUSES]);
  const currency = settings.defaultCurrency;

  const [outstanding, overdue, paid, spent, overdueList, recentPayments] = await Promise.all([
    // Unpaid balance on every issued, not-void, not-fully-paid invoice.
    db
      .select({ currency: invoices.currency, cents: balance, count: n })
      .from(invoices)
      .where(isOpen)
      .groupBy(invoices.currency),
    db
      .select({ currency: invoices.currency, cents: balance, count: n })
      .from(invoices)
      .where(and(isOpen, lt(invoices.dueDate, today)))
      .groupBy(invoices.currency),
    // Payments received this month (reversed payments excluded), in the invoice's currency.
    db
      .select({
        currency: invoices.currency,
        cents: sql<number>`coalesce(sum(${payments.amountCents}), 0)::int`,
        count: n,
      })
      .from(payments)
      .innerJoin(invoices, eq(invoices.id, payments.invoiceId))
      .where(
        and(
          isNull(payments.voidedAt),
          gte(payments.paidAt, monthStart),
          lt(payments.paidAt, nextMonthStart),
        ),
      )
      .groupBy(invoices.currency),
    db
      .select({
        currency: expenses.currency,
        cents: sql<number>`coalesce(sum(${expenses.amountCents}), 0)::int`,
        count: n,
      })
      .from(expenses)
      .where(and(gte(expenses.expenseDate, monthStart), lt(expenses.expenseDate, nextMonthStart)))
      .groupBy(expenses.currency),
    // Most overdue first: these are the ones to chase.
    db
      .select({
        id: invoices.id,
        number: invoices.number,
        status: invoices.status,
        currency: invoices.currency,
        issueDate: invoices.issueDate,
        dueDate: invoices.dueDate,
        totalCents: invoices.totalCents,
        paidCents: invoices.paidCents,
        clientId: clients.id,
        clientName: clients.name,
        updatedAt: invoices.updatedAt,
      })
      .from(invoices)
      .innerJoin(clients, eq(clients.id, invoices.clientId))
      .where(and(isOpen, lt(invoices.dueDate, today)))
      .orderBy(asc(invoices.dueDate))
      .limit(5),
    listPayments({ limit: 5 }),
  ]);

  return {
    month,
    outstanding: toMetric(outstanding, currency),
    overdue: toMetric(overdue, currency),
    paidThisMonth: toMetric(paid, currency),
    expensesThisMonth: toMetric(spent, currency),
    overdueInvoices: overdueList.map((r) => ({ ...r, effectiveStatus: effectiveStatus(r, today) })),
    recentPayments,
  };
}
