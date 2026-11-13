"use server";

import { count, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { clients, invoices } from "@/db/schema";
import { requireOwner, requireUser } from "@/lib/session";
import { clientSchema, issuesToFieldErrors } from "@/lib/validation";

export type ClientFormState = { errors?: Record<string, string> } | null;

/** Create (no id) or update a client, then go to its page. */
export async function saveClient(
  id: string | null,
  _prev: ClientFormState,
  formData: FormData,
): Promise<ClientFormState> {
  await requireUser();
  const parsed = clientSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { errors: issuesToFieldErrors(parsed.error) };

  let clientId = id;
  if (id) {
    const [row] = await db
      .update(clients)
      .set(parsed.data)
      .where(eq(clients.id, id))
      .returning({ id: clients.id });
    if (!row) return { errors: { _form: "Client not found." } };
  } else {
    const [row] = await db.insert(clients).values(parsed.data).returning({ id: clients.id });
    clientId = row.id;
  }

  revalidatePath("/clients");
  redirect(`/clients/${clientId}`);
}

export async function setClientArchived(id: string, archived: boolean) {
  await requireUser();
  await db
    .update(clients)
    .set({ archivedAt: archived ? new Date() : null })
    .where(eq(clients.id, id));
  revalidatePath("/clients");
  revalidatePath(`/clients/${id}`);
}

/** Owner-only; only allowed when the client has no invoices (otherwise archive). */
export async function deleteClient(id: string): Promise<{ error?: string }> {
  await requireOwner();
  const [{ n }] = await db.select({ n: count() }).from(invoices).where(eq(invoices.clientId, id));
  if (n > 0) return { error: "This client has invoices. Archive it instead." };
  await db.delete(clients).where(eq(clients.id, id));
  revalidatePath("/clients");
  redirect("/clients");
}
