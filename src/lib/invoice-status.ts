/**
 * "Overdue" is derived, never stored: an issued, not-fully-paid invoice whose
 * due date is before today (in the business timezone). No cron job needed.
 */

export type StoredStatus = "draft" | "sent" | "partially_paid" | "paid" | "void";
export type EffectiveStatus = StoredStatus | "overdue";

export const STATUS_LABELS: Record<EffectiveStatus, string> = {
  draft: "Draft",
  sent: "Issued",
  partially_paid: "Partially paid",
  paid: "Paid",
  overdue: "Overdue",
  void: "Void",
};

/** Statuses that can become overdue. */
export const OPEN_STATUSES = ["sent", "partially_paid"] as const satisfies StoredStatus[];

/** Today's date as YYYY-MM-DD in the given IANA timezone. */
export function todayInTimezone(timeZone: string, now = new Date()): string {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** Dates are YYYY-MM-DD strings, so lexical comparison is chronological. */
export function effectiveStatus(
  invoice: { status: StoredStatus; dueDate: string },
  today: string,
): EffectiveStatus {
  const open = (OPEN_STATUSES as readonly string[]).includes(invoice.status);
  return open && invoice.dueDate < today ? "overdue" : invoice.status;
}

/** Add whole days to a YYYY-MM-DD date (UTC math, no DST issues). */
export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
