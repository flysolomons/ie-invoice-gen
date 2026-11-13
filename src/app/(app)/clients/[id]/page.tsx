import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ConfirmActionButton } from "@/components/app/confirm-action-button";
import { InvoiceTable } from "@/components/app/invoice-table";
import { PageHeader } from "@/components/app/page-header";
import { buttonVariants } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { requireUser } from "@/lib/session";
import { getClient } from "@/server/clients";
import { listInvoices } from "@/server/invoices";
import { deleteClient, setClientArchived } from "../actions";
import { ClientForm } from "../client-form";

export const metadata: Metadata = { title: "Client" };

const UUID = /^[0-9a-f-]{36}$/i;

export default async function ClientPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const client = await getClient(id);
  if (!client) notFound();
  const invoices = await listInvoices({ clientId: id });

  const archived = !!client.archivedAt;

  return (
    <div className="grid gap-6">
      <PageHeader
        title={client.name}
        description={archived ? "Archived client" : client.email}
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

      <section className="grid gap-3">
        <h2 className="font-medium">Invoices</h2>
        {invoices.length === 0 ? (
          <p className="text-sm text-muted-foreground">No invoices for this client yet.</p>
        ) : (
          <InvoiceTable rows={invoices} hideClient />
        )}
      </section>

      <Separator />

      <section className="grid gap-3">
        <h2 className="font-medium">Details</h2>
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
      </section>
    </div>
  );
}
