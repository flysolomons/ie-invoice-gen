"use server";

import { and, asc, count, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { clients, invoiceItems, invoices } from "@/db/schema";
import { calculateInvoice } from "@/lib/invoice-calc";
import { addDays, todayInTimezone } from "@/lib/invoice-status";
import { requireOwner, requireUser } from "@/lib/session";
import { type InvoiceDraftInput, invoiceDraftSchema, issuesToFieldErrors } from "@/lib/validation";
import { takeNextNumber } from "@/server/numbering";
import { getSettings } from "@/server/settings";

export type InvoiceFormState = { errors?: Record<string, string> } | null;

class DraftError extends Error {}

/**
 * Create (id = null) or update a draft invoice. Totals are always recomputed
 * here from the line items; anything the browser calculated is ignored.
 * Only drafts are editable — issued invoices are locked (void & reissue instead).
 */
export async function saveInvoiceDraft(
  id: string | null,
  payload: InvoiceDraftInput,
): Promise<InvoiceFormState> {
  const user = await requireUser();

  const parsed = invoiceDraftSchema.safeParse(payload);
  if (!parsed.success) return { errors: issuesToFieldErrors(parsed.error) };
  const draft = parsed.data;

  const [client] = await db
    .select({ id: clients.id })
    .from(clients)
    .where(eq(clients.id, draft.clientId));
  if (!client) return { errors: { clientId: "Client not found" } };

  const totals = calculateInvoice({
    items: draft.items.map((i) => ({
      quantity: i.quantity,
      unitPriceCents: i.unitPrice,
      taxRateBp: i.taxRate,
    })),
    discountType: draft.discountType,
    discountValue: draft.discountValue,
  });

  const header = {
    clientId: draft.clientId,
    currency: draft.currency,
    issueDate: draft.issueDate,
    dueDate: draft.dueDate,
    discountType: draft.discountType,
    discountValue: draft.discountValue,
    notes: draft.notes,
    terms: draft.terms,
    subtotalCents: totals.subtotalCents,
    discountCents: totals.discountCents,
    taxCents: totals.taxCents,
    totalCents: totals.totalCents,
  };

  let invoiceId: string;
  try {
    invoiceId = await db.transaction(async (tx) => {
      let targetId: string;
      if (id) {
        // Lock the row so a concurrent "issue" can't slip in between check and write.
        const [current] = await tx
          .select({ status: invoices.status })
          .from(invoices)
          .where(eq(invoices.id, id))
          .for("update");
        if (!current) throw new DraftError("Invoice not found.");
        if (current.status !== "draft") {
          throw new DraftError("This invoice has been issued and can no longer be edited.");
        }
        await tx.update(invoices).set(header).where(eq(invoices.id, id));
        await tx.delete(invoiceItems).where(eq(invoiceItems.invoiceId, id));
        targetId = id;
      } else {
        const [row] = await tx
          .insert(invoices)
          .values({ ...header, createdBy: user.id })
          .returning({ id: invoices.id });
        targetId = row.id;
      }

      await tx.insert(invoiceItems).values(
        draft.items.map((item, i) => ({
          invoiceId: targetId,
          position: i,
          description: item.description,
          quantity: item.quantity,
          unitPriceCents: item.unitPrice,
          taxRateBp: item.taxRate,
          lineSubtotalCents: totals.lines[i].lineSubtotalCents,
          lineTaxCents: totals.lines[i].lineTaxCents,
        })),
      );
      return targetId;
    });
  } catch (e) {
    if (e instanceof DraftError) return { errors: { _form: e.message } };
    throw e;
  }

  revalidatePath("/invoices");
  redirect(`/invoices/${invoiceId}`);
}

/**
 * Issue a draft: assign the next invoice number and lock it from editing.
 * Status becomes "sent" (shown as "Issued"); emailing it comes separately.
 */
export async function issueInvoice(id: string): Promise<{ error?: string }> {
  await requireUser();
  try {
    await db.transaction(async (tx) => {
      const [inv] = await tx
        .select({ status: invoices.status, totalCents: invoices.totalCents })
        .from(invoices)
        .where(eq(invoices.id, id))
        .for("update");
      if (!inv) throw new DraftError("Invoice not found.");
      if (inv.status !== "draft") throw new DraftError("This invoice has already been issued.");
      const [{ n }] = await tx
        .select({ n: count() })
        .from(invoiceItems)
        .where(eq(invoiceItems.invoiceId, id));
      if (n === 0) throw new DraftError("Add at least one line item before issuing.");
      if (inv.totalCents <= 0) throw new DraftError("The invoice total must be above zero.");

      const number = await takeNextNumber(tx, "invoice");
      await tx.update(invoices).set({ number, status: "sent" }).where(eq(invoices.id, id));
    });
  } catch (e) {
    if (e instanceof DraftError) return { error: e.message };
    throw e;
  }
  revalidatePath("/invoices");
  revalidatePath(`/invoices/${id}`);
  return {};
}

/**
 * Void an issued invoice (owner only). Its number stays used so the sequence
 * has no gaps. Invoices with recorded payments must have them reversed first.
 */
export async function voidInvoice(id: string): Promise<{ error?: string }> {
  await requireOwner();
  const updated = await db
    .update(invoices)
    .set({ status: "void", voidedAt: new Date() })
    .where(
      and(
        eq(invoices.id, id),
        inArray(invoices.status, ["sent", "partially_paid"]),
        eq(invoices.paidCents, 0),
      ),
    )
    .returning({ id: invoices.id });
  if (updated.length === 0) {
    return {
      error:
        "Only issued invoices without payments can be voided. Drafts can be deleted; reverse payments first.",
    };
  }
  revalidatePath("/invoices");
  revalidatePath(`/invoices/${id}`);
  return {};
}

/** Copy any invoice into a new draft dated today (e.g. to reissue a voided one). */
export async function duplicateInvoice(id: string): Promise<{ error?: string }> {
  const user = await requireUser();
  const source = await db.query.invoices.findFirst({
    where: eq(invoices.id, id),
    with: { items: { orderBy: asc(invoiceItems.position) } },
  });
  if (!source) return { error: "Invoice not found." };

  const settings = await getSettings();
  const today = todayInTimezone(settings.timezone);

  const newId = await db.transaction(async (tx) => {
    const [row] = await tx
      .insert(invoices)
      .values({
        clientId: source.clientId,
        currency: source.currency,
        issueDate: today,
        dueDate: addDays(today, settings.defaultPaymentTermsDays),
        discountType: source.discountType,
        discountValue: source.discountValue,
        subtotalCents: source.subtotalCents,
        discountCents: source.discountCents,
        taxCents: source.taxCents,
        totalCents: source.totalCents,
        notes: source.notes,
        terms: source.terms,
        createdBy: user.id,
      })
      .returning({ id: invoices.id });
    if (source.items.length) {
      await tx.insert(invoiceItems).values(
        source.items.map((item) => ({
          invoiceId: row.id,
          position: item.position,
          description: item.description,
          quantity: item.quantity,
          unitPriceCents: item.unitPriceCents,
          taxRateBp: item.taxRateBp,
          lineSubtotalCents: item.lineSubtotalCents,
          lineTaxCents: item.lineTaxCents,
        })),
      );
    }
    return row.id;
  });

  revalidatePath("/invoices");
  redirect(`/invoices/${newId}/edit`);
}

/** Delete a draft. Issued invoices can't be deleted (void them instead). */
export async function deleteDraft(id: string): Promise<{ error?: string }> {
  await requireUser();
  const deleted = await db
    .delete(invoices)
    .where(and(eq(invoices.id, id), eq(invoices.status, "draft")))
    .returning({ id: invoices.id });
  if (deleted.length === 0) return { error: "Only draft invoices can be deleted." };
  revalidatePath("/invoices");
  redirect("/invoices");
}
