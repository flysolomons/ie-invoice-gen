import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/app/page-header";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireUser } from "@/lib/session";
import { listClients } from "@/server/clients";

export const metadata: Metadata = { title: "Clients" };

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; archived?: string }>;
}) {
  await requireUser();
  const { q, archived } = await searchParams;
  const showArchived = archived === "1";
  const rows = await listClients({ q, archived: showArchived });

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Clients"
        actions={
          <Link href="/clients/new" className={buttonVariants()}>
            New client
          </Link>
        }
      />

      <form className="flex flex-wrap items-center gap-2" role="search">
        <Input
          name="q"
          defaultValue={q}
          placeholder="Search name or email"
          aria-label="Search clients"
          className="max-w-xs"
        />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="archived" value="1" defaultChecked={showArchived} />
          Include archived
        </label>
        <Button type="submit" variant="outline">
          Search
        </Button>
      </form>

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {q ? "No clients match your search." : "No clients yet. Add your first one."}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="hidden sm:table-cell">Phone</TableHead>
                <TableHead className="text-right">Invoices</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">
                    <Link href={`/clients/${c.id}`} className="hover:underline">
                      {c.name}
                    </Link>
                    {c.archivedAt && (
                      <span className="ml-2 text-xs text-muted-foreground">(archived)</span>
                    )}
                  </TableCell>
                  <TableCell>{c.email ?? "—"}</TableCell>
                  <TableCell className="hidden sm:table-cell">{c.phone ?? "—"}</TableCell>
                  <TableCell className="text-right tabular-nums">{c.invoiceCount}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
