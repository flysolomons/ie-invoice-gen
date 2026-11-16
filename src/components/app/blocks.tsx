import { cn } from "cn";
import { type LucideIcon, Search } from "lucide-react";
import type { ReactNode } from "react";
import { Input } from "@/components/ui/input";

/**
 * Shared page building blocks, so every screen uses the same card, stat,
 * search and empty-state look.
 */

/** Surface style for cards, tables and toolbars. */
export const CARD = "rounded-xl border bg-card shadow-float";

/** A card with an optional header row (title, description, actions). */
export function Panel({
  title,
  description,
  actions,
  children,
  className,
  bodyClassName,
}: {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={cn(CARD, "overflow-hidden", className)}>
      {(title || actions) && (
        <div className="flex flex-wrap items-start justify-between gap-3 border-b px-5 py-3.5">
          <div className="min-w-0">
            {title && <h2 className="font-medium">{title}</h2>}
            {description && <p className="text-sm text-muted-foreground">{description}</p>}
          </div>
          {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
        </div>
      )}
      <div className={cn("p-5", bodyClassName)}>{children}</div>
    </section>
  );
}

/** Small summary figure. `hero` = navy highlight, `alert` = red value. */
export function StatCard({
  label,
  value,
  hint,
  hero,
  alert,
  icon: Icon,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  hero?: boolean;
  alert?: boolean;
  icon?: LucideIcon;
}) {
  return (
    <div
      className={cn(
        "grid gap-1 rounded-xl p-4",
        hero ? "bg-primary text-primary-foreground shadow-float" : CARD,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span
          className={cn(
            "text-xs font-medium",
            hero ? "text-primary-foreground/75" : "text-muted-foreground",
          )}
        >
          {label}
        </span>
        {Icon && (
          <Icon
            aria-hidden
            className={cn("size-4", hero ? "text-primary-foreground/75" : "text-muted-foreground")}
          />
        )}
      </div>
      <span className={cn("text-xl font-semibold tabular-nums", alert && "text-danger-foreground")}>
        {value}
      </span>
      {hint && (
        <span
          className={cn(
            "text-xs",
            hero
              ? "text-primary-foreground/75"
              : alert
                ? "text-danger-foreground"
                : "text-muted-foreground",
          )}
        >
          {hint}
        </span>
      )}
    </div>
  );
}

/** Friendly placeholder for empty lists. */
export function EmptyState({
  icon: Icon,
  title,
  children,
  action,
}: {
  icon: LucideIcon;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="grid justify-items-center gap-2 rounded-xl border border-dashed bg-card/50 px-6 py-12 text-center">
      <span className="grid size-11 place-items-center rounded-full bg-primary/10 text-primary">
        <Icon className="size-5" aria-hidden />
      </span>
      <p className="font-medium">{title}</p>
      {children && <p className="max-w-sm text-sm text-muted-foreground">{children}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

/**
 * GET search form with a leading icon (Enter submits). `keep` carries other
 * filters (e.g. status) along with the search.
 */
export function SearchBox({
  label,
  placeholder,
  defaultValue,
  keep,
  className,
}: {
  label: string;
  placeholder: string;
  defaultValue?: string;
  keep?: Record<string, string | undefined>;
  className?: string;
}) {
  return (
    <form role="search" className={cn("relative w-full sm:w-72", className)}>
      {Object.entries(keep ?? {}).map(([k, v]) =>
        v ? <input key={k} type="hidden" name={k} value={v} /> : null,
      )}
      <Search
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
      />
      <Input
        type="search"
        name="q"
        defaultValue={defaultValue}
        placeholder={placeholder}
        aria-label={label}
        className="h-10 rounded-xl bg-card pl-9 shadow-float"
      />
    </form>
  );
}
