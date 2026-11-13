import { cn } from "cn";
import { type EffectiveStatus, STATUS_LABELS } from "@/lib/invoice-status";

// Theme tokens (see globals.css) so badges follow the brand palette in light and dark.
const STYLES: Record<EffectiveStatus, string> = {
  draft: "bg-muted text-muted-foreground ring-border",
  sent: "bg-primary/10 text-primary ring-primary/20 dark:bg-primary/20",
  partially_paid: "bg-warning text-warning-foreground ring-warning",
  paid: "bg-success/12 text-success-foreground ring-success/25 dark:bg-success/20",
  overdue: "bg-destructive/10 text-danger-foreground ring-destructive/25 dark:bg-destructive/20",
  void: "bg-muted text-muted-foreground ring-border line-through",
};

const DOT: Partial<Record<EffectiveStatus, string>> = {
  sent: "bg-primary",
  paid: "bg-success",
  overdue: "bg-destructive",
  partially_paid: "bg-warning-foreground",
};

export function StatusBadge({ status }: { status: EffectiveStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ring-1 ring-inset",
        STYLES[status],
      )}
    >
      {DOT[status] && <span aria-hidden className={cn("size-1.5 rounded-full", DOT[status])} />}
      {STATUS_LABELS[status]}
    </span>
  );
}
