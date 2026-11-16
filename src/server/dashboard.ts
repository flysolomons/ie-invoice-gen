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

/** One month of cash in/out, in the business default currency only. */
export type TrendMonth = { month: string; receivedCents: number; expensesCents: number };

/** Unpaid balance by how late it is, in the business default currency only. */
export type AgingBucket = { key: string; label: string; cents: number; count: number };

const AGING_BUCKETS = [
  { key: "current", label: "Not yet due" },
  { key: "1-30", label: "1–30 days late" },
  { key: "31-60", label: "31–60 days late" },
  { key: "61+", label: "Over 60 days late" },
] as const;

/** shiftMonth("2026-11", -5) → "2026-06". */
function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1 + delta, 1)).toISOString().slice(0, 7);
}

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
  const months = Array.from({ length: 6 }, (_, i) => shiftMonth(month, i - 5));
  const trendStart = `${months[0]}-01`;
  const daysLate = sql<number>`(${today}::date - ${invoices.dueDate})`;
  const bucket = sql<string>`case
    when ${daysLate} <= 0 then 'current'
    when ${daysLate} <= 30 then '1-30'
    when ${daysLate} <= 60 then '31-60'
    else '61+' end`;

  const [
    outstanding,
    overdue,
    paid,
    spent,
    overdueList,
    recentPayments,
    receivedTrend,
    expenseTrend,
    aging,
  ] = await Promise.all([
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
    // Six-month trend, default currency only (we never convert between currencies).
    db
      .select({
        month: sql<string>`to_char(${payments.paidAt}, 'YYYY-MM')`,
        cents: sql<number>`coalesce(sum(${payments.amountCents}), 0)::int`,
      })
      .from(payments)
      .innerJoin(invoices, eq(invoices.id, payments.invoiceId))
      .where(
        and(
          isNull(payments.voidedAt),
          eq(invoices.currency, currency),
          gte(payments.paidAt, trendStart),
          lt(payments.paidAt, nextMonthStart),
        ),
      )
      .groupBy(sql`1`),
    db
      .select({
        month: sql<string>`to_char(${expenses.expenseDate}, 'YYYY-MM')`,
        cents: sql<number>`coalesce(sum(${expenses.amountCents}), 0)::int`,
      })
      .from(expenses)
      .where(
        and(
          eq(expenses.currency, currency),
          gte(expenses.expenseDate, trendStart),
          lt(expenses.expenseDate, nextMonthStart),
        ),
      )
      .groupBy(sql`1`),
    db
      .select({ bucket, cents: balance, count: n })
      .from(invoices)
      .where(and(isOpen, eq(invoices.currency, currency)))
      .groupBy(sql`1`),
  ]);

  const received = new Map(receivedTrend.map((r) => [r.month, r.cents]));
  const spentBy = new Map(expenseTrend.map((r) => [r.month, r.cents]));
  const agingBy = new Map(aging.map((r) => [r.bucket, r]));

  return {
    month,
    outstanding: toMetric(outstanding, currency),
    overdue: toMetric(overdue, currency),
    paidThisMonth: toMetric(paid, currency),
    expensesThisMonth: toMetric(spent, currency),
    overdueInvoices: overdueList.map((r) => ({ ...r, effectiveStatus: effectiveStatus(r, today) })),
    recentPayments,
    currency,
    trend: months.map(
      (m): TrendMonth => ({
        month: m,
        receivedCents: received.get(m) ?? 0,
        expensesCents: spentBy.get(m) ?? 0,
      }),
    ),
    aging: AGING_BUCKETS.map(
      (b): AgingBucket => ({
        ...b,
        cents: agingBy.get(b.key)?.cents ?? 0,
        count: agingBy.get(b.key)?.count ?? 0,
      }),
    ),
  };
}
