import "server-only";
import { and, asc, count, eq, ilike, isNull, or } from "drizzle-orm";
import { db } from "@/db";
import { clients, invoices } from "@/db/schema";

export type Client = typeof clients.$inferSelect;

export async function listClients(opts: { q?: string; archived?: boolean } = {}) {
  const search = opts.q?.trim();
  const rows = await db
    .select({
      id: clients.id,
      name: clients.name,
      email: clients.email,
      phone: clients.phone,
      archivedAt: clients.archivedAt,
      invoiceCount: count(invoices.id),
    })
    .from(clients)
    .leftJoin(invoices, eq(invoices.clientId, clients.id))
    .where(
      and(
        opts.archived ? undefined : isNull(clients.archivedAt),
        search
          ? or(ilike(clients.name, `%${search}%`), ilike(clients.email, `%${search}%`))
          : undefined,
      ),
    )
    .groupBy(clients.id)
    .orderBy(asc(clients.name));
  return rows;
}

/** Active clients for pickers (id, name, email, currency). */
export async function listClientOptions() {
  return db
    .select({ id: clients.id, name: clients.name, email: clients.email, currency: clients.currency })
    .from(clients)
    .where(isNull(clients.archivedAt))
    .orderBy(asc(clients.name));
}

export async function getClient(id: string): Promise<Client | null> {
  const [row] = await db.select().from(clients).where(eq(clients.id, id));
  return row ?? null;
}
