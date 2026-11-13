import type { Metadata } from "next";
import { PageHeader } from "@/components/app/page-header";
import { addDays, todayInTimezone } from "@/lib/invoice-status";
import { bpToPercent } from "@/lib/money";
import { requireUser } from "@/lib/session";
import { listClientOptions } from "@/server/clients";
import { getSettings } from "@/server/settings";
import { InvoiceForm } from "../invoice-form";

export const metadata: Metadata = { title: "New invoice" };

export default async function NewInvoicePage({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string }>;
}) {
  await requireUser();
  const [{ clientId }, settings, clients] = await Promise.all([
    searchParams,
    getSettings(),
    listClientOptions(),
  ]);

  const client = clients.find((c) => c.id === clientId);
  const today = todayInTimezone(settings.timezone);
  const taxRate = bpToPercent(settings.defaultTaxRateBp);

  return (
    <div className="grid gap-6">
      <PageHeader title="New invoice" description="Saved as a draft. You can issue it later." />
      <InvoiceForm
        id={null}
        clients={clients}
        defaultCurrency={settings.defaultCurrency}
        defaultTaxRate={taxRate}
        defaults={{
          clientId: client?.id ?? "",
          currency: client?.currency ?? settings.defaultCurrency,
          issueDate: today,
          dueDate: addDays(today, settings.defaultPaymentTermsDays),
          discountType: "none",
          discountValue: "",
          notes: "",
          terms: settings.footerNotes ?? "",
          items: [],
        }}
      />
    </div>
  );
}
