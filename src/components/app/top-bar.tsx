"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment } from "react";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";

const LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  invoices: "Invoices",
  clients: "Clients",
  payments: "Payments",
  expenses: "Expenses",
  settings: "Settings",
  team: "Team",
  new: "New",
  edit: "Edit",
};

const UUID = /^[0-9a-f-]{36}$/i;

/** Breadcrumbs derived from the URL, e.g. Invoices › Details › Edit. */
function useCrumbs() {
  const segments = usePathname().split("/").filter(Boolean);
  return segments.map((seg, i) => ({
    href: `/${segments.slice(0, i + 1).join("/")}`,
    label: LABELS[seg] ?? (UUID.test(seg) ? "Details" : seg),
    current: i === segments.length - 1,
  }));
}

export function TopBar() {
  const crumbs = useCrumbs();
  return (
    <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 bg-background/80 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:px-6">
      <SidebarTrigger className="-ml-1" aria-label="Toggle sidebar (Ctrl+B)" />
      <Separator orientation="vertical" className="mr-1 data-vertical:h-4 data-vertical:self-center" />
      <nav aria-label="Breadcrumb" className="min-w-0">
        <ol className="flex items-center gap-1.5 text-sm">
          {crumbs.map((c, i) => (
            <Fragment key={c.href}>
              {i > 0 && <ChevronRight className="size-3.5 text-muted-foreground" aria-hidden />}
              <li className="min-w-0 truncate">
                {c.current ? (
                  <span aria-current="page" className="font-medium text-foreground">
                    {c.label}
                  </span>
                ) : (
                  <Link href={c.href} className="text-muted-foreground transition-colors hover:text-foreground">
                    {c.label}
                  </Link>
                )}
              </li>
            </Fragment>
          ))}
        </ol>
      </nav>
    </header>
  );
}
