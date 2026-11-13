import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { PageHeader } from "@/components/app/page-header";
import { bpToPercent, centsToInput } from "@/lib/money";
import { requireUser } from "@/lib/session";
import { listClientOptions } from "@/server/clients";
import { getInvoice } from "@/server/invoices";
import { getSettings } from "@/server/settings";
import { InvoiceForm } from "../../invoice-form";

export const metadata: Metadata = { title: "Edit invoice" };

const UUID = /^[0-9a-f-]{36}$/i;

export default async function EditInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const [invoice, settings, clients] = await Promise.all([
    getInvoice(id),
    getSettings(),
    listClientOptions(),
  ]);
  if (!invoice) notFound();
  // Issued invoices are locked.
  if (invoice.status !== "draft") redirect(`/invoices/${id}`);

  // Keep an archived client selectable on its existing drafts.
  const options = clients.some((c) => c.id === invoice.clientId)
    ? clients
    : [
        ...clients,
        {
          id: invoice.client.id,
          name: `${invoice.client.name} (archived)`,
          email: invoice.client.email,
          currency: invoice.client.currency,
        },
      ];

  return (
    <div className="grid gap-6">
      <PageHeader title="Edit draft invoice" />
      <InvoiceForm
        id={invoice.id}
        clients={options}
        defaultCurrency={settings.defaultCurrency}
        defaultTaxRate={bpToPercent(settings.defaultTaxRateBp)}
        defaults={{
          clientId: invoice.clientId,
          currency: invoice.currency,
          issueDate: invoice.issueDate,
          dueDate: invoice.dueDate,
          discountType: invoice.discountType,
          discountValue:
            invoice.discountType === "percent"
              ? bpToPercent(invoice.discountValue)
              : invoice.discountType === "fixed"
                ? centsToInput(invoice.discountValue)
                : "",
          notes: invoice.notes ?? "",
          terms: invoice.terms ?? "",
          items: invoice.items.map((i) => ({
            description: i.description,
            // numeric(12,3) comes back as "2.500"; trim trailing zeros for editing.
            quantity: String(Number(i.quantity)),
            unitPrice: centsToInput(i.unitPriceCents),
            taxRate: bpToPercent(i.taxRateBp),
          })),
        }}
      />
    </div>
  );
}
