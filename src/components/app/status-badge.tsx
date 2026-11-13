import { cn } from "cn";
import { type EffectiveStatus, STATUS_LABELS } from "@/lib/invoice-status";

const STYLES: Record<EffectiveStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  sent: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200",
  partially_paid: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
  paid: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
  overdue: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200",
  void: "bg-muted text-muted-foreground line-through",
};

export function StatusBadge({ status }: { status: EffectiveStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        STYLES[status],
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
