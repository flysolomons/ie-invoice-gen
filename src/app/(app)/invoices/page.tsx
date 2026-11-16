import { cn } from "cn";
import { Search } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { InvoiceTable } from "@/components/app/invoice-table";
import { PageHeader } from "@/components/app/page-header";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { type EffectiveStatus, STATUS_LABELS } from "@/lib/invoice-status";
import { requireUser } from "@/lib/session";
import { countInvoicesByStatus, listInvoices } from "@/server/invoices";

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

/** Small status dot beside each filter, matching the status badge colours. */
const DOT: Partial<Record<EffectiveStatus, string>> = {
  draft: "bg-muted-foreground/60",
  sent: "bg-primary",
  partially_paid: "bg-warning",
  overdue: "bg-destructive",
  paid: "bg-success",
  void: "bg-muted-foreground/30",
};

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  await requireUser();
  const sp = await searchParams;
  const status = TABS.includes(sp.status as EffectiveStatus) ? (sp.status as EffectiveStatus) : "all";
  const [rows, counts] = await Promise.all([
    listInvoices({ status, q: sp.q }),
    countInvoicesByStatus(sp.q),
  ]);

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

      <div className="flex flex-wrap items-center justify-between gap-3">
        <nav
          aria-label="Filter by status"
          className="flex max-w-full gap-1 overflow-x-auto rounded-xl border bg-card p-1 shadow-float [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {TABS.map((s) => {
            const active = status === s;
            return (
              <Link
                key={s}
                href={href(s)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex shrink-0 items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                  active
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {s !== "all" && (
                  <span
                    aria-hidden
                    className={cn("size-1.5 rounded-full", active ? "bg-primary-foreground" : DOT[s])}
                  />
                )}
                {s === "all" ? "All" : STATUS_LABELS[s]}
                <span
                  className={cn(
                    "min-w-5 rounded-full px-1.5 text-center text-xs tabular-nums",
                    active ? "bg-primary-foreground/20" : "bg-muted text-muted-foreground",
                  )}
                >
                  {counts[s]}
                  <span className="sr-only"> invoices</span>
                </span>
              </Link>
            );
          })}
        </nav>

        <form role="search" className="relative w-full sm:w-72">
          {status !== "all" && <input type="hidden" name="status" value={status} />}
          <Search
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            type="search"
            name="q"
            defaultValue={sp.q}
            placeholder="Search number or client"
            aria-label="Search invoices"
            className="h-10 rounded-xl bg-card pl-9 shadow-float"
          />
        </form>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-xl border border-dashed bg-card/50 px-4 py-10 text-center text-sm text-muted-foreground">
          {sp.q ? "No invoices match your search." : "No invoices here yet."}
        </p>
      ) : (
        <InvoiceTable rows={rows} showCreatedBy />
      )}
    </div>
  );
}
