import { cn } from "cn";
import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/app/page-header";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireOwner } from "@/lib/session";
import { describeUserAgent, SIGN_IN_REASONS } from "@/lib/sign-in-context";
import { getSettings } from "@/server/settings";
import {
  listSignIns,
  pruneOldSignIns,
  SIGN_IN_RETENTION_DAYS,
  type SignInAttempt,
  type SignInFilter,
  signInSummary,
} from "@/server/sign-ins";

export const metadata: Metadata = { title: "Sign-in activity" };

const OUTCOME: Record<SignInAttempt["outcome"], { label: string; className: string }> = {
  success: {
    label: "Signed in",
    className: "bg-success/12 text-success-foreground ring-success/25 dark:bg-success/20",
  },
  blocked: { label: "No access", className: "bg-warning text-warning-foreground ring-warning" },
  failed: {
    label: "Failed",
    className: "bg-destructive/10 text-danger-foreground ring-destructive/25 dark:bg-destructive/20",
  },
};

export default async function SignInsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireOwner();
  const filter: SignInFilter = (await searchParams).show === "problems" ? "problems" : "all";
  await pruneOldSignIns();
  const [attempts, summary, settings] = await Promise.all([
    listSignIns(filter),
    signInSummary(),
    getSettings(),
  ]);
  const when = new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: settings.timezone,
  });

  return (
    <div className="grid gap-6">
      <PageHeader
        title="Sign-in activity"
        description={`Every attempt to sign in, newest first. Kept for ${SIGN_IN_RETENTION_DAYS} days.`}
      />

      <section aria-label="Last 24 hours" className="grid gap-3 sm:grid-cols-3">
        {(["success", "failed", "blocked"] as const).map((o) => (
          <div key={o} className="rounded-xl border bg-card p-4 shadow-float">
            <p className="text-sm text-muted-foreground">{OUTCOME[o].label} · last 24h</p>
            <p className="text-2xl font-semibold tabular-nums">{summary[o]}</p>
          </div>
        ))}
      </section>

      <nav aria-label="Filter" className="flex gap-2 text-sm">
        {(
          [
            ["all", "All attempts", "/settings/sign-ins"],
            ["problems", "Failed & no access", "/settings/sign-ins?show=problems"],
          ] as const
        ).map(([key, label, href]) => (
          <Link
            key={key}
            href={href}
            aria-current={filter === key ? "page" : undefined}
            className={cn(
              "rounded-full px-3 py-1 ring-1 ring-border ring-inset",
              filter === key
                ? "bg-primary text-primary-foreground ring-primary"
                : "bg-card text-muted-foreground hover:text-foreground",
            )}
          >
            {label}
          </Link>
        ))}
      </nav>

      <div className="overflow-x-auto rounded-xl border bg-card shadow-float">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>When</TableHead>
              <TableHead>Who</TableHead>
              <TableHead>Result</TableHead>
              <TableHead className="hidden md:table-cell">Method</TableHead>
              <TableHead className="hidden lg:table-cell">Device</TableHead>
              <TableHead className="hidden sm:table-cell">IP address</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {attempts.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                  No sign-in attempts recorded yet.
                </TableCell>
              </TableRow>
            )}
            {attempts.map((a) => (
              <TableRow key={a.id}>
                <TableCell className="whitespace-nowrap tabular-nums">
                  {when.format(a.createdAt)}
                </TableCell>
                <TableCell className="max-w-56 truncate">
                  {a.email ?? <span className="text-muted-foreground">Unknown</span>}
                </TableCell>
                <TableCell>
                  <div className="grid gap-0.5">
                    <span
                      className={cn(
                        "inline-flex w-fit rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ring-1 ring-inset",
                        OUTCOME[a.outcome].className,
                      )}
                    >
                      {OUTCOME[a.outcome].label}
                    </span>
                    {a.reason && (
                      <span className="text-xs text-muted-foreground">
                        {SIGN_IN_REASONS[a.reason] ?? a.reason}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  {a.method === "microsoft" ? "Microsoft" : "Email & password"}
                </TableCell>
                <TableCell className="hidden lg:table-cell" title={a.userAgent ?? undefined}>
                  {describeUserAgent(a.userAgent)}
                </TableCell>
                <TableCell className="hidden font-mono text-xs sm:table-cell">
                  {a.ipAddress ?? "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {attempts.length === 200 && (
        <p className="text-sm text-muted-foreground">Showing the latest 200 attempts.</p>
      )}
    </div>
  );
}
