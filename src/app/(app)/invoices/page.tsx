import { cn } from "cn";
import type { Metadata } from "next";
import Link from "next/link";
import { InvoiceTable } from "@/components/app/invoice-table";
import { PageHeader } from "@/components/app/page-header";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { type EffectiveStatus, STATUS_LABELS } from "@/lib/invoice-status";
import { requireUser } from "@/lib/session";
import { listInvoices } from "@/server/invoices";

export const metadata: Metadata = { title: "Invoices" };

const TABS: (EffectiveStatus | "all")[] = [
  "all",
  "draft",
  "sent",
  "partially_paid",
  "overdue",
  "paid",
  "void",
];

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  await requireUser();
  const sp = await searchParams;
  const status = TABS.includes(sp.status as EffectiveStatus) ? (sp.status as EffectiveStatus) : "all";
  const rows = await listInvoices({ status, q: sp.q });

  const href = (s: string) => {
    const p = new URLSearchParams();
    if (s !== "all") p.set("status", s);
    if (sp.q) p.set("q", sp.q);
    const qs = p.toString();
    return qs ? `/invoices?${qs}` : "/invoices";
  };

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Invoices"
        actions={
          <Link href="/invoices/new" className={buttonVariants()}>
            New invoice
          </Link>
        }
      />

      <nav aria-label="Filter by status" className="flex gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {TABS.map((s) => (
          <Link
            key={s}
            href={href(s)}
            aria-current={status === s ? "page" : undefined}
            className={cn(
              "shrink-0 rounded-full px-3 py-1 text-sm hover:bg-muted",
              status === s && "bg-muted font-medium",
            )}
          >
            {s === "all" ? "All" : STATUS_LABELS[s]}
          </Link>
        ))}
      </nav>

      <form className="flex gap-2" role="search">
        {status !== "all" && <input type="hidden" name="status" value={status} />}
        <Input
          name="q"
          defaultValue={sp.q}
          placeholder="Search number or client"
          aria-label="Search invoices"
          className="max-w-xs"
        />
        <Button type="submit" variant="outline">
          Search
        </Button>
      </form>

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No invoices found.</p>
      ) : (
        <InvoiceTable rows={rows} />
      )}
    </div>
  );
}
