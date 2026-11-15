import { cn } from "cn";
import {
  AlertTriangle,
  ArrowRight,
  Clock,
  type LucideIcon,
  Receipt,
  Wallet,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { InvoiceTable } from "@/components/app/invoice-table";
import { PaymentsTable } from "@/components/app/payments-table";
import { buttonVariants } from "@/components/ui/button";
import { formatMoney } from "@/lib/money";
import { requireUser } from "@/lib/session";
import { getDashboard, type Metric } from "@/server/dashboard";

export const metadata: Metadata = { title: "Dashboard" };

function MetricCard({
  label,
  metric,
  detail,
  href,
  icon: Icon,
  alert,
}: {
  label: string;
  metric: Metric;
  detail: string;
  href: string;
  icon: LucideIcon;
  alert?: boolean;
}) {
  const [primary, ...others] = metric.totals;
  return (
    <Link
      href={href}
      className={cn(
        "group grid gap-3 rounded-xl border bg-card p-5 shadow-float transition-colors hover:border-primary/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        alert && "border-destructive/40",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span
          className={cn(
            "grid size-8 place-items-center rounded-lg bg-primary/10 text-primary",
            alert && "bg-destructive/10 text-danger-foreground",
          )}
        >
          <Icon className="size-4" aria-hidden />
        </span>
      </div>
      <div className="grid gap-0.5">
        <span
          className={cn(
            "text-2xl font-semibold tabular-nums",
            alert && "text-danger-foreground",
          )}
        >
          {formatMoney(primary.cents, primary.currency)}
        </span>
        {others.map((t) => (
          <span key={t.currency} className="text-sm font-medium tabular-nums">
            + {formatMoney(t.cents, t.currency)}
          </span>
        ))}
      </div>
      <span className="text-xs text-muted-foreground">{detail}</span>
    </Link>
  );
}

function plural(count: number, one: string, many = `${one}s`) {
  return `${count} ${count === 1 ? one : many}`;
}

function Section({
  title,
  href,
  linkLabel,
  children,
}: {
  title: string;
  href: string;
  linkLabel: string;
  children: React.ReactNode;
}) {
  return (
    <section className="grid gap-3" aria-label={title}>
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">{title}</h2>
        <Link href={href} className={buttonVariants({ variant: "ghost", size: "sm" })}>
          {linkLabel}
          <ArrowRight aria-hidden />
        </Link>
      </div>
      {children}
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-xl border border-dashed bg-card/50 px-4 py-8 text-center text-sm text-muted-foreground">
      {children}
    </p>
  );
}

export default async function DashboardPage() {
  const [user, d] = await Promise.all([requireUser(), getDashboard()]);
  const monthName = new Intl.DateTimeFormat("en-GB", { month: "long", timeZone: "UTC" }).format(
    new Date(`${d.month}-01T00:00:00Z`),
  );

  return (
    <div className="grid gap-8">
      <div>
        <h1 className="text-2xl font-semibold">Welcome, {user.name}</h1>
        <p className="text-sm text-muted-foreground">Here&rsquo;s where things stand.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Outstanding"
          metric={d.outstanding}
          detail={`${plural(d.outstanding.count, "unpaid invoice")}`}
          href="/invoices"
          icon={Clock}
        />
        <MetricCard
          label="Overdue"
          metric={d.overdue}
          detail={
            d.overdue.count === 0
              ? "Nothing past its due date"
              : `${plural(d.overdue.count, "invoice")} past due`
          }
          href="/invoices?status=overdue"
          icon={AlertTriangle}
          alert={d.overdue.count > 0}
        />
        <MetricCard
          label={`Received in ${monthName}`}
          metric={d.paidThisMonth}
          detail={plural(d.paidThisMonth.count, "payment")}
          href="/payments"
          icon={Wallet}
        />
        <MetricCard
          label={`Expenses in ${monthName}`}
          metric={d.expensesThisMonth}
          detail={plural(d.expensesThisMonth.count, "expense")}
          href={`/expenses?month=${d.month}`}
          icon={Receipt}
        />
      </div>

      <div className="grid gap-8 xl:grid-cols-2">
        <Section title="Most overdue" href="/invoices?status=overdue" linkLabel="All overdue">
          {d.overdueInvoices.length > 0 ? (
            <InvoiceTable rows={d.overdueInvoices} />
          ) : (
            <Empty>No overdue invoices. Nice.</Empty>
          )}
        </Section>
        <Section title="Recent payments" href="/payments" linkLabel="All payments">
          {d.recentPayments.length > 0 ? (
            <PaymentsTable rows={d.recentPayments} />
          ) : (
            <Empty>No payments recorded yet.</Empty>
          )}
        </Section>
      </div>
    </div>
  );
}
