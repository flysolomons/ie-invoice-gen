import { Receipt, RotateCcw, Wallet } from "lucide-react";
import type { Metadata } from "next";
import { EmptyState, SearchBox, StatCard } from "@/components/app/blocks";
import { PageHeader } from "@/components/app/page-header";
import { PaymentsTable } from "@/components/app/payments-table";
import { orderTotals } from "@/lib/currency-totals";
import { todayInTimezone } from "@/lib/invoice-status";
import { formatMoney } from "@/lib/money";
import { requireUser } from "@/lib/session";
import { listPayments } from "@/server/payments";
import { getSettings } from "@/server/settings";

export const metadata: Metadata = { title: "Payments" };

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const user = await requireUser();
  const { q } = await searchParams;
  const [rows, settings] = await Promise.all([listPayments({ q }), getSettings()]);
  const isOwner = user.role === "owner";

  // This month's figures, from the rows already loaded (latest 500).
  const month = todayInTimezone(settings.timezone).slice(0, 7);
  const thisMonth = rows.filter((p) => !p.voidedAt && p.paidAt.startsWith(month));
  const byCurrency = new Map<string, number>();
  for (const p of thisMonth) byCurrency.set(p.currency, (byCurrency.get(p.currency) ?? 0) + p.amountCents);
  const [primary, ...others] = orderTotals(
    [...byCurrency].map(([currency, cents]) => ({ currency, cents })),
    settings.defaultCurrency,
  );
  const reversed = rows.filter((p) => p.voidedAt).length;
  const monthName = new Intl.DateTimeFormat("en-GB", { month: "long", timeZone: "UTC" }).format(
    new Date(`${month}-01T00:00:00Z`),
  );

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Payments"
        description="Payments received from clients. Record new ones from an issued invoice."
      />

      {!q && rows.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-3">
          <StatCard
            label={`Received in ${monthName}`}
            value={formatMoney(primary.cents, primary.currency)}
            hint={
              others.length > 0
                ? others.map((t) => `+ ${formatMoney(t.cents, t.currency)}`).join("  ")
                : undefined
            }
            icon={Wallet}
            hero
          />
          <StatCard
            label={`Receipts in ${monthName}`}
            value={thisMonth.length}
            hint={`${rows.length} recorded in total`}
            icon={Receipt}
          />
          <StatCard
            label="Reversed"
            value={reversed}
            hint={reversed === 0 ? "None reversed" : "Kept for the record, not counted"}
            icon={RotateCcw}
          />
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <SearchBox
          label="Search payments"
          placeholder="Search receipt, invoice, client or reference"
          defaultValue={q}
          className="sm:w-96"
        />
        {q && (
          <p className="text-sm text-muted-foreground">
            {rows.length} result{rows.length === 1 ? "" : "s"} for &ldquo;{q}&rdquo;
          </p>
        )}
      </div>

      {rows.length === 0 ? (
        <EmptyState icon={Wallet} title={q ? "No payments match your search" : "No payments yet"}>
          {q
            ? "Try a receipt number, invoice number, client name or bank reference."
            : "Open an issued invoice and use Record payment. Each payment gets its own receipt."}
        </EmptyState>
      ) : (
        <PaymentsTable rows={rows} canReverse={isOwner} canAmend={isOwner} />
      )}
    </div>
  );
}
