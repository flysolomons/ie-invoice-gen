import { cn } from "cn";
import {
  AlertTriangle,
  ArrowRight,
  CircleCheck,
  Clock,
  type LucideIcon,
  Plus,
  Receipt,
  Wallet,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { CARD, EmptyState } from "@/components/app/blocks";
import { AgingBreakdown, CashFlowChart } from "@/components/app/dashboard-charts";
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
  hero,
}: {
  label: string;
  metric: Metric;
  detail: string;
  href: string;
  icon: LucideIcon;
  alert?: boolean;
  /** Navy highlight card for the headline figure. */
  hero?: boolean;
}) {
  const [primary, ...others] = metric.totals;
  return (
    <Link
      href={href}
      className={cn(
        "group relative grid gap-4 overflow-hidden rounded-2xl border p-5 shadow-float transition-all hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        hero
          ? "border-transparent bg-primary text-primary-foreground"
          : "bg-card hover:border-primary/30",
        alert && "border-destructive/40 hover:border-destructive/60",
      )}
    >
      {hero && (
        <span
          aria-hidden
          className="pointer-events-none absolute -top-12 -right-12 size-40 rounded-full bg-primary-foreground/10"
        />
      )}
      <div className="flex items-center justify-between gap-2">
        <span
          className={cn(
            "text-sm font-medium",
            hero ? "text-primary-foreground/80" : "text-muted-foreground",
          )}
        >
          {label}
        </span>
        <span
          className={cn(
            "grid size-9 place-items-center rounded-xl",
            hero
              ? "bg-primary-foreground/15 text-primary-foreground"
              : alert
                ? "bg-destructive/10 text-danger-foreground"
                : "bg-primary/10 text-primary",
          )}
        >
          <Icon className="size-4" aria-hidden />
        </span>
      </div>
      <div className="grid gap-0.5">
        <span
          className={cn(
            "text-[1.75rem] leading-tight font-semibold tracking-tight tabular-nums",
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
      <span
        className={cn(
          "flex items-center justify-between gap-2 text-xs",
          hero ? "text-primary-foreground/80" : "text-muted-foreground",
        )}
      >
        {detail}
        <ArrowRight
          aria-hidden
          className="size-3.5 opacity-0 transition-opacity group-hover:opacity-100"
        />
      </span>
    </Link>
  );
}

function plural(count: number, one: string, many = `${one}s`) {
  return `${count} ${count === 1 ? one : many}`;
}

function Section({
  title,
  description,
  href,
  linkLabel,
  children,
  className,
  flush,
}: {
  title: string;
  description?: string;
  href?: string;
  linkLabel?: string;
  children: React.ReactNode;
  className?: string;
  /** Let a table sit edge to edge inside the card. */
  flush?: boolean;
}) {
  return (
    <section
      className={cn(CARD, "flex flex-col overflow-hidden rounded-2xl", className)}
      aria-label={title}
    >
      <div className="flex items-start justify-between gap-2 px-5 pt-4 pb-3">
        <div className="grid gap-0.5">
          <h2 className="font-semibold">{title}</h2>
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>
        {href && (
          <Link
            href={href}
            className={buttonVariants({ variant: "ghost", size: "sm", className: "-mr-2" })}
          >
            {linkLabel}
            <ArrowRight aria-hidden />
          </Link>
        )}
      </div>
      <div
        className={cn(
          "flex-1",
          flush
            ? "[&>div:first-child]:rounded-none [&>div:first-child]:border-x-0 [&>div:first-child]:border-b-0 [&>div:first-child]:shadow-none"
            : "px-5 pb-5",
        )}
      >
        {children}
      </div>
    </section>
  );
}

export default async function DashboardPage() {
  const [user, d] = await Promise.all([requireUser(), getDashboard()]);
  const monthName = new Intl.DateTimeFormat("en-GB", { month: "long", timeZone: "UTC" }).format(
    new Date(`${d.month}-01T00:00:00Z`),
  );
  const firstName = user.name.split(" ")[0];

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="grid gap-1">
          <p className="text-sm font-medium text-muted-foreground">{monthName} overview</p>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Welcome back, {firstName}
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/expenses/new" className={buttonVariants({ variant: "outline" })}>
            <Receipt aria-hidden />
            Add expense
          </Link>
          <Link href="/invoices/new" className={buttonVariants()}>
            <Plus aria-hidden />
            New invoice
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Outstanding"
          metric={d.outstanding}
          detail={plural(d.outstanding.count, "unpaid invoice")}
          href="/invoices"
          icon={Clock}
          hero
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

      <div className="grid gap-6 lg:grid-cols-3">
        <Section
          title="Cash flow"
          description={`Last 6 months, ${d.currency} only`}
          className="lg:col-span-2"
        >
          <CashFlowChart data={d.trend} currency={d.currency} />
        </Section>
        <Section
          title="Unpaid by age"
          description={`Open invoices, ${d.currency} only`}
          href="/invoices"
          linkLabel="Invoices"
        >
          <AgingBreakdown buckets={d.aging} currency={d.currency} />
        </Section>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Section
          title="Most overdue"
          description="Oldest due dates first: these are the ones to chase"
          href="/invoices?status=overdue"
          linkLabel="All overdue"
          flush={d.overdueInvoices.length > 0}
        >
          {d.overdueInvoices.length > 0 ? (
            <InvoiceTable rows={d.overdueInvoices} />
          ) : (
            <EmptyState icon={CircleCheck} title="All caught up">
              No invoices are past their due date.
            </EmptyState>
          )}
        </Section>
        <Section
          title="Recent payments"
          description="The latest receipts issued"
          href="/payments"
          linkLabel="All payments"
          flush={d.recentPayments.length > 0}
        >
          {d.recentPayments.length > 0 ? (
            <PaymentsTable rows={d.recentPayments} />
          ) : (
            <EmptyState icon={Wallet} title="No payments yet">
              Record a payment from an issued invoice and it will show up here.
            </EmptyState>
          )}
        </Section>
      </div>
    </div>
  );
}
