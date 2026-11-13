import "server-only";
import { and, asc, desc, eq, ilike, inArray, lt, or, type SQL, sql } from "drizzle-orm";
import { db } from "@/db";
import { clients, invoiceItems, invoices } from "@/db/schema";
import {
  type EffectiveStatus,
  effectiveStatus,
  OPEN_STATUSES,
  todayInTimezone,
} from "@/lib/invoice-status";
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
      updatedAt: invoices.updatedAt,
    })
    .from(invoices)
    .innerJoin(clients, eq(clients.id, invoices.clientId))
    .where(
      and(
        filter.status && filter.status !== "all" ? statusCondition(filter.status, today) : undefined,
        filter.clientId ? eq(invoices.clientId, filter.clientId) : undefined,
        q ? or(ilike(invoices.number, `%${q}%`), ilike(clients.name, `%${q}%`)) : undefined,
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
