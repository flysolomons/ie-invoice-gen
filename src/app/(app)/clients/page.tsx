import { cn } from "cn";
import { Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { CARD, EmptyState, SearchBox } from "@/components/app/blocks";
import { PageHeader } from "@/components/app/page-header";
import { buttonVariants } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { initials } from "@/lib/initials";
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

  const tab = (value: boolean) => {
    const p = new URLSearchParams();
    if (value) p.set("archived", "1");
    if (q) p.set("q", q);
    const qs = p.toString();
    return qs ? `/clients?${qs}` : "/clients";
  };

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Clients"
        description="The companies and people you invoice."
        actions={
          <Link href="/clients/new" className={buttonVariants()}>
            New client
          </Link>
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav aria-label="Show clients" className={cn(CARD, "flex gap-1 p-1")}>
          {(
            [
              [false, "Active"],
              [true, "Include archived"],
            ] as const
          ).map(([value, label]) => {
            const active = showArchived === value;
            return (
              <Link
                key={label}
                href={tab(value)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                  active
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {label}
              </Link>
            );
          })}
        </nav>
        <SearchBox
          label="Search clients"
          placeholder="Search name or email"
          defaultValue={q}
          keep={{ archived: showArchived ? "1" : undefined }}
        />
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={Users}
          title={q ? "No clients match your search" : "No clients yet"}
          action={
            !q && (
              <Link href="/clients/new" className={buttonVariants()}>
                Add your first client
              </Link>
            )
          }
        >
          {q ? "Try part of the name or email address." : "Add a client to start invoicing them."}
        </EmptyState>
      ) : (
        <div className={cn(CARD, "overflow-x-auto")}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead className="hidden md:table-cell">Phone</TableHead>
                <TableHead className="text-right">Invoices</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((c) => (
                <TableRow key={c.id} className={c.archivedAt ? "text-muted-foreground" : undefined}>
                  <TableCell>
                    <Link href={`/clients/${c.id}`} className="group flex items-center gap-3">
                      <span
                        aria-hidden
                        className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-xs font-semibold text-primary"
                      >
                        {initials(c.name)}
                      </span>
                      <span className="grid min-w-0">
                        <span className="truncate font-medium group-hover:underline">
                          {c.name}
                          {c.archivedAt && (
                            <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs font-normal text-muted-foreground">
                              Archived
                            </span>
                          )}
                        </span>
                        <span className="truncate text-xs text-muted-foreground">{c.email ?? "No email"}</span>
                      </span>
                    </Link>
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground md:table-cell">{c.phone ?? "—"}</TableCell>
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
