import "server-only";
import { and, asc, desc, eq, ilike, inArray, lt, or, type SQL, sql } from "drizzle-orm";
import { db } from "@/db";
import { clients, invoiceItems, invoices, members } from "@/db/schema";
import {
  type EffectiveStatus,
  effectiveStatus,
  OPEN_STATUSES,
  todayInTimezone,
} from "@/lib/invoice-status";
import { escapeLike } from "@/lib/document-number";
import { oldNumberMatches } from "./numbering";
import { getSettings } from "./settings";

export type InvoiceListFilter = {
  status?: EffectiveStatus | "all";
  clientId?: string;
  q?: string;
};

/** SQL condition matching invoices whose *effective* status is `status`. */
function statusCondition(status: EffectiveStatus, today: string): SQL | undefined {
  const isOpen = inArray(invoices.status, [...OPEN_STATUSES]);
  if (status === "overdue") return and(isOpen, lt(invoices.dueDate, today));
  if (status === "sent" || status === "partially_paid") {
    // Open invoices that are not (yet) overdue.
    return and(eq(invoices.status, status), sql`${invoices.dueDate} >= ${today}`);
  }
  return eq(invoices.status, status);
}

/** Search by current number, client name or an old (amended) number. */
function searchCondition(q: string | undefined): SQL | undefined {
  if (!q) return undefined;
  return or(
    ilike(invoices.number, `%${escapeLike(q)}%`),
    ilike(clients.name, `%${escapeLike(q)}%`),
    oldNumberMatches("invoice", invoices.id, q),
  );
}

/**
 * How many invoices match the search in each effective status (for the filter
 * tabs). Same "overdue" rule as statusCondition/effectiveStatus.
 */
export async function countInvoicesByStatus(
  q?: string,
): Promise<Record<EffectiveStatus | "all", number>> {
  const settings = await getSettings();
  const today = todayInTimezone(settings.timezone);
  const effective = sql<EffectiveStatus>`case when ${inArray(invoices.status, [...OPEN_STATUSES])} and ${lt(invoices.dueDate, today)} then 'overdue' else ${invoices.status}::text end`;
  const rows = await db
    .select({ status: effective, n: sql<number>`count(*)::int` })
    .from(invoices)
    .innerJoin(clients, eq(clients.id, invoices.clientId))
    .where(searchCondition(q?.trim()))
    // By position: the CASE has bound parameters, so repeating it wouldn't match.
    .groupBy(sql`1`);
  const counts: Record<EffectiveStatus | "all", number> = {
    all: 0,
    draft: 0,
    sent: 0,
    partially_paid: 0,
    overdue: 0,
    paid: 0,
    void: 0,
  };
  for (const r of rows) {
    counts[r.status] = r.n;
    counts.all += r.n;
  }
  return counts;
}

export async function listInvoices(filter: InvoiceListFilter = {}) {
  const settings = await getSettings();
  const today = todayInTimezone(settings.timezone);
  const q = filter.q?.trim();

  const rows = await db
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
      /** Team member who created it (their current name); null if unknown. */
      createdByName: members.name,
      updatedAt: invoices.updatedAt,
    })
    .from(invoices)
    .innerJoin(clients, eq(clients.id, invoices.clientId))
    .leftJoin(members, eq(members.authUserId, invoices.createdBy))
    .where(
      and(
        filter.status && filter.status !== "all" ? statusCondition(filter.status, today) : undefined,
        filter.clientId ? eq(invoices.clientId, filter.clientId) : undefined,
        searchCondition(q),
      ),
    )
    .orderBy(desc(invoices.issueDate), desc(invoices.createdAt))
    .limit(500);

  return rows.map((r) => ({ ...r, effectiveStatus: effectiveStatus(r, today) }));
}

export type InvoiceListRow = Awaited<ReturnType<typeof listInvoices>>[number];

export async function getInvoice(id: string) {
  const invoice = await db.query.invoices.findFirst({
    where: eq(invoices.id, id),
    with: {
      client: true,
      items: { orderBy: asc(invoiceItems.position) },
    },
  });
  if (!invoice) return null;
  const settings = await getSettings();
  const today = todayInTimezone(settings.timezone);
  return { ...invoice, effectiveStatus: effectiveStatus(invoice, today) };
}

export type InvoiceDetail = NonNullable<Awaited<ReturnType<typeof getInvoice>>>;
