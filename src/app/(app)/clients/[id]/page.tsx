import { FileText } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EmptyState, Panel, StatCard } from "@/components/app/blocks";
import { ConfirmActionButton } from "@/components/app/confirm-action-button";
import { InvoiceTable } from "@/components/app/invoice-table";
import { PageHeader } from "@/components/app/page-header";
import { buttonVariants } from "@/components/ui/button";
import { orderTotals } from "@/lib/currency-totals";
import { initials } from "@/lib/initials";
import { formatMoney } from "@/lib/money";
import { requireUser } from "@/lib/session";
import { getClient } from "@/server/clients";
import { listInvoices } from "@/server/invoices";
import { getSettings } from "@/server/settings";
import { deleteClient, setClientArchived } from "../actions";
import { ClientForm } from "../client-form";

export const metadata: Metadata = { title: "Client" };

const UUID = /^[0-9a-f-]{36}$/i;

/** Sum `cents` per currency, default currency first. */
function totals(rows: { currency: string; cents: number }[], defaultCurrency: string) {
  const m = new Map<string, number>();
  for (const r of rows) m.set(r.currency, (m.get(r.currency) ?? 0) + r.cents);
  return orderTotals([...m].map(([currency, cents]) => ({ currency, cents })), defaultCurrency);
}

export default async function ClientPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const [client, settings] = await Promise.all([getClient(id), getSettings()]);
  if (!client) notFound();
  const invoices = await listInvoices({ clientId: id });

  const archived = !!client.archivedAt;
  const currency = client.currency ?? settings.defaultCurrency;
  const open = invoices.filter((i) => i.status === "sent" || i.status === "partially_paid");
  const overdue = invoices.filter((i) => i.effectiveStatus === "overdue");
  const [outstanding, ...outstandingOther] = totals(
    open.map((i) => ({ currency: i.currency, cents: i.totalCents - i.paidCents })),
    currency,
  );
  const [paid] = totals(
    invoices.filter((i) => i.status !== "void").map((i) => ({ currency: i.currency, cents: i.paidCents })),
    currency,
  );
  const fmt = (t: { cents: number; currency: string }) => formatMoney(t.cents, t.currency);

  return (
    <div className="grid gap-6">
      <PageHeader
        back={{ href: "/clients", label: "Clients" }}
        title={
          <span className="flex items-center gap-3">
            <span
              aria-hidden
              className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-sm font-semibold text-primary"
            >
              {initials(client.name)}
            </span>
            <span className="truncate">{client.name}</span>
            {archived && (
              <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                Archived
              </span>
            )}
          </span>
        }
        description={[client.email, client.phone].filter(Boolean).join(" · ") || undefined}
        actions={
          <>
            {!archived && (
              <Link href={`/invoices/new?clientId=${client.id}`} className={buttonVariants()}>
                New invoice
              </Link>
            )}
            <ConfirmActionButton
              label={archived ? "Restore" : "Archive"}
              confirmLabel={archived ? "Confirm restore" : "Confirm archive"}
              action={setClientArchived.bind(null, client.id, !archived)}
            />
            {user.role === "owner" && invoices.length === 0 && (
              <ConfirmActionButton
                label="Delete"
                confirmLabel="Confirm delete"
                action={deleteClient.bind(null, client.id)}
              />
            )}
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          label="Outstanding"
          value={fmt(outstanding)}
          hint={
            outstandingOther.length > 0
              ? outstandingOther.map((t) => `+ ${fmt(t)}`).join("  ")
              : `${open.length} unpaid invoice${open.length === 1 ? "" : "s"}`
          }
          hero
        />
        <StatCard
          label="Overdue"
          value={overdue.length}
          hint={overdue.length === 0 ? "Nothing past due" : "Past their due date"}
          alert={overdue.length > 0}
        />
        <StatCard
          label="Received to date"
          value={fmt(paid)}
          hint={`${invoices.length} invoice${invoices.length === 1 ? "" : "s"} in total`}
        />
      </div>

      <section className="grid gap-3" aria-labelledby="client-invoices-heading">
        <h2 id="client-invoices-heading" className="text-lg font-semibold">
          Invoices
        </h2>
        {invoices.length === 0 ? (
          <EmptyState icon={FileText} title="No invoices for this client yet">
            {!archived && "Use New invoice to bill them."}
          </EmptyState>
        ) : (
          <InvoiceTable rows={invoices} hideClient showCreatedBy />
        )}
      </section>

      <Panel title="Client details" description="Used on invoices and receipts." className="max-w-3xl">
        <ClientForm
          id={client.id}
          defaults={{
            name: client.name,
            email: client.email ?? "",
            phone: client.phone ?? "",
            address: client.address ?? "",
            taxId: client.taxId ?? "",
            currency: client.currency ?? "",
            notes: client.notes ?? "",
          }}
        />
      </Panel>
    </div>
  );
}
