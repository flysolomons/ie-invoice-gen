import type { Metadata } from "next";
import { PageHeader } from "@/components/app/page-header";
import { PaymentsTable } from "@/components/app/payments-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { requireUser } from "@/lib/session";
import { listPayments } from "@/server/payments";

export const metadata: Metadata = { title: "Payments" };

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const user = await requireUser();
  const { q } = await searchParams;
  const rows = await listPayments({ q });

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Payments"
        description="Payments received from clients. Record new ones from an issued invoice."
      />
      <form className="flex gap-2" role="search">
        <Input
          name="q"
          defaultValue={q}
          placeholder="Search receipt, invoice, client or reference"
          aria-label="Search payments"
          className="max-w-sm"
        />
        <Button type="submit" variant="outline">
          Search
        </Button>
      </form>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {q ? "No payments match your search." : "No payments recorded yet."}
        </p>
      ) : (
        <PaymentsTable rows={rows} canReverse={user.role === "owner"} />
      )}
    </div>
  );
}
