import "server-only";
import { and, asc, desc, eq, gte, ilike, lt, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { expenseCategories, expenses } from "@/db/schema";

export type ExpenseFilter = {
  /** "YYYY-MM"; omitted = all time. */
  month?: string;
  categoryId?: string;
  q?: string;
};

/** "2026-11" → ["2026-11-01", "2026-12-01"] (half-open range). */
export function monthRange(month: string): [string, string] {
  const [y, m] = month.split("-").map(Number);
  const next = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
  return [`${month}-01`, `${next}-01`];
}

function where(f: ExpenseFilter) {
  const q = f.q?.trim();
  const range = f.month && /^\d{4}-(0[1-9]|1[0-2])$/.test(f.month) ? monthRange(f.month) : null;
  return and(
    range ? and(gte(expenses.expenseDate, range[0]), lt(expenses.expenseDate, range[1])) : undefined,
    f.categoryId ? eq(expenses.categoryId, f.categoryId) : undefined,
    q ? or(ilike(expenses.vendor, `%${q}%`), ilike(expenses.notes, `%${q}%`)) : undefined,
  );
}

export async function listExpenses(f: ExpenseFilter = {}) {
  const rows = await db
    .select({
      id: expenses.id,
      vendor: expenses.vendor,
      amountCents: expenses.amountCents,
      currency: expenses.currency,
      expenseDate: expenses.expenseDate,
      categoryName: expenseCategories.name,
      hasFile: sql<boolean>`${expenses.fileKey} is not null`,
    })
    .from(expenses)
    .leftJoin(expenseCategories, eq(expenseCategories.id, expenses.categoryId))
    .where(where(f))
    .orderBy(desc(expenses.expenseDate), desc(expenses.createdAt))
    .limit(500);

  // Totals per currency (no FX conversion).
  const totals = await db
    .select({
      currency: expenses.currency,
      totalCents: sql<number>`sum(${expenses.amountCents})::int`,
      count: sql<number>`count(*)::int`,
    })
    .from(expenses)
    .where(where(f))
    .groupBy(expenses.currency)
    .orderBy(expenses.currency);

  return { rows, totals };
}

export async function getExpense(id: string) {
  const [row] = await db.select().from(expenses).where(eq(expenses.id, id));
  return row ?? null;
}

export async function listCategories() {
  return db
    .select({ id: expenseCategories.id, name: expenseCategories.name })
    .from(expenseCategories)
    .orderBy(asc(expenseCategories.name));
}
