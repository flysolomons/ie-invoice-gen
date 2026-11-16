import { cn } from "cn";
import { CircleCheck } from "lucide-react";
import Link from "next/link";
import { formatMoney } from "@/lib/money";
import type { AgingBucket, TrendMonth } from "@/server/dashboard";

/**
 * Dashboard charts. Plain HTML/CSS (server-rendered, no chart library):
 * hover/focus tooltips are CSS-only, and each chart carries a screen-reader
 * table so the numbers never depend on colour or pointer.
 */

const SERIES = {
  received: { label: "Received", className: "bg-chart-1" },
  expenses: { label: "Expenses", className: "bg-chart-3" },
} as const;

function compact(cents: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(cents / 100);
}

function monthLabel(month: string, style: "short" | "long" = "short") {
  return new Intl.DateTimeFormat("en-GB", { month: style, timeZone: "UTC" }).format(
    new Date(`${month}-01T00:00:00Z`),
  );
}

/** Round the axis top up to a tidy 1/2/2.5/5 × 10ⁿ value. */
function niceMax(value: number) {
  if (value <= 0) return 100_00;
  const pow = 10 ** Math.floor(Math.log10(value));
  const step = [1, 2, 2.5, 5, 10].find((s) => s * pow >= value) ?? 10;
  return step * pow;
}

function Swatch({ className }: { className: string }) {
  return <span aria-hidden className={cn("size-2.5 shrink-0 rounded-[3px]", className)} />;
}

export function CashFlowChart({ data, currency }: { data: TrendMonth[]; currency: string }) {
  const top = niceMax(Math.max(...data.flatMap((d) => [d.receivedCents, d.expensesCents])));
  const ticks = [top, top / 2, 0];
  const totalIn = data.reduce((s, d) => s + d.receivedCents, 0);
  const totalOut = data.reduce((s, d) => s + d.expensesCents, 0);
  const net = totalIn - totalOut;

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <dl className="flex flex-wrap gap-x-8 gap-y-3">
          {[
            { label: "Received", value: totalIn, swatch: SERIES.received.className },
            { label: "Expenses", value: totalOut, swatch: SERIES.expenses.className },
          ].map((s) => (
            <div key={s.label} className="grid gap-0.5">
              <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Swatch className={s.swatch} />
                {s.label}
              </dt>
              <dd className="text-lg font-semibold tabular-nums">{formatMoney(s.value, currency)}</dd>
            </div>
          ))}
          <div className="grid gap-0.5">
            <dt className="text-xs text-muted-foreground">Net</dt>
            <dd
              className={cn(
                "text-lg font-semibold tabular-nums",
                net < 0 ? "text-danger-foreground" : "text-success-foreground",
              )}
            >
              {net > 0 ? "+" : ""}
              {formatMoney(net, currency)}
            </dd>
          </div>
        </dl>
      </div>

      <div aria-hidden className="grid grid-cols-[auto_1fr] gap-x-3">
        {/* Y axis */}
        <div className="relative h-48 text-right text-[11px] text-muted-foreground tabular-nums">
          {ticks.map((t, i) => (
            <span
              key={t}
              className="absolute right-0 -translate-y-1/2"
              style={{ top: `${(i / (ticks.length - 1)) * 100}%` }}
            >
              {compact(t, currency)}
            </span>
          ))}
          <span className="invisible">{compact(top, currency)}</span>
        </div>

        {/* Plot */}
        <div className="relative h-48">
          {ticks.map((t, i) => (
            <div
              key={t}
              className={cn(
                "absolute inset-x-0 border-t",
                t === 0 ? "border-border" : "border-dashed border-border/60",
              )}
              style={{ top: `${(i / (ticks.length - 1)) * 100}%` }}
            />
          ))}
          <div className="relative grid h-full grid-cols-6 gap-2">
            {data.map((d, i) => (
              <div
                key={d.month}
                tabIndex={0}
                className="group relative flex h-full items-end justify-center gap-0.5 rounded-md outline-none hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring"
              >
                {(["received", "expenses"] as const).map((k) => {
                  const cents = k === "received" ? d.receivedCents : d.expensesCents;
                  return (
                    <div
                      key={k}
                      className={cn("w-full max-w-5 rounded-t-[4px]", SERIES[k].className)}
                      style={{ height: `${Math.max((cents / top) * 100, cents > 0 ? 1.5 : 0)}%` }}
                    />
                  );
                })}
                {/* Tooltip */}
                <div
                  className={cn(
                    "pointer-events-none absolute bottom-full z-10 mb-2 hidden w-max min-w-40 gap-1.5 rounded-lg border bg-popover p-3 text-xs text-popover-foreground shadow-float group-hover:grid group-focus-visible:grid",
                    i < 2 ? "left-0" : i > 3 ? "right-0" : "left-1/2 -translate-x-1/2",
                  )}
                >
                  <span className="font-medium">{monthLabel(d.month, "long")}</span>
                  {(["received", "expenses"] as const).map((k) => (
                    <span key={k} className="flex items-center justify-between gap-4">
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <Swatch className={SERIES[k].className} />
                        {SERIES[k].label}
                      </span>
                      <span className="font-medium tabular-nums">
                        {formatMoney(k === "received" ? d.receivedCents : d.expensesCents, currency)}
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* X axis */}
        <div />
        <div className="mt-2 grid grid-cols-6 gap-2 text-center text-xs text-muted-foreground">
          {data.map((d, i) => (
            <span key={d.month} className={cn(i === data.length - 1 && "font-medium text-foreground")}>
              {monthLabel(d.month)}
            </span>
          ))}
        </div>
      </div>

      <table className="sr-only">
        <caption>Received and expenses by month, {currency}</caption>
        <thead>
          <tr>
            <th scope="col">Month</th>
            <th scope="col">Received</th>
            <th scope="col">Expenses</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.month}>
              <th scope="row">{monthLabel(d.month, "long")}</th>
              <td>{formatMoney(d.receivedCents, currency)}</td>
              <td>{formatMoney(d.expensesCents, currency)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Light → dark navy as invoices get later (one hue = magnitude of lateness). */
const AGING_SHADE: Record<string, string> = {
  current: "bg-chart-1/30",
  "1-30": "bg-chart-1/55",
  "31-60": "bg-chart-1/80",
  "61+": "bg-chart-1",
};

export function AgingBreakdown({ buckets, currency }: { buckets: AgingBucket[]; currency: string }) {
  const total = buckets.reduce((s, b) => s + b.cents, 0);
  const max = Math.max(...buckets.map((b) => b.cents), 1);

  if (total === 0) {
    return (
      <div className="grid h-full min-h-48 content-center justify-items-center gap-2 text-center">
        <span className="grid size-11 place-items-center rounded-full bg-success text-success-foreground">
          <CircleCheck className="size-5" aria-hidden />
        </span>
        <p className="font-medium">Nothing unpaid</p>
        <p className="max-w-56 text-sm text-muted-foreground">
          Every issued {currency} invoice has been paid in full.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-5">
      <div className="grid gap-0.5">
        <span className="text-xs text-muted-foreground">Total unpaid</span>
        <span className="text-lg font-semibold tabular-nums">{formatMoney(total, currency)}</span>
      </div>

      {/* Stacked overview bar */}
      <div aria-hidden className="flex h-2.5 gap-0.5 overflow-hidden rounded-full">
        {buckets
          .filter((b) => b.cents > 0)
          .map((b) => (
            <div
              key={b.key}
              className={AGING_SHADE[b.key]}
              style={{ width: `${(b.cents / total) * 100}%` }}
            />
          ))}
      </div>

      <ul className="grid gap-3.5">
        {buckets.map((b) => {
          const late = b.key !== "current";
          return (
            <li key={b.key}>
              <Link
                href={late ? "/invoices?status=overdue" : "/invoices?status=sent"}
                className="group grid gap-1.5 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="flex items-center gap-2">
                    <Swatch className={AGING_SHADE[b.key]} />
                    <span className="group-hover:underline">{b.label}</span>
                    <span className="text-xs text-muted-foreground">
                      {b.count} {b.count === 1 ? "invoice" : "invoices"}
                    </span>
                  </span>
                  <span className="font-medium tabular-nums">{formatMoney(b.cents, currency)}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn("h-full rounded-full", AGING_SHADE[b.key])}
                    style={{ width: `${(b.cents / max) * 100}%` }}
                  />
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
