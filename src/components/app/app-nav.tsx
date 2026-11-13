"use client";

import { FileText, LayoutDashboard, LogOut, Receipt, Settings, Users, Wallet } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "@/app/(auth)/actions";
import type { SessionUser } from "@/lib/session";
import { cn } from "@/lib/utils";

const links = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/invoices", label: "Invoices", icon: FileText },
  { href: "/clients", label: "Clients", icon: Users },
  { href: "/payments", label: "Payments", icon: Wallet },
  { href: "/expenses", label: "Expenses", icon: Receipt },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

export function AppNav({ user }: { user: SessionUser }) {
  const pathname = usePathname();
  return (
    <aside className="border-b bg-muted/30 md:flex md:w-56 md:flex-col md:border-r md:border-b-0">
      <div className="flex items-center justify-between p-4">
        <Link href="/dashboard" className="font-semibold">
          Invoices
        </Link>
        <form action={signOut} className="md:hidden">
          <button type="submit" className="text-sm text-muted-foreground hover:text-foreground">
            Sign out
          </button>
        </form>
      </div>
      <nav className="flex gap-1 overflow-x-auto px-2 pb-2 md:flex-col md:pb-0">
        {links.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-muted",
                active && "bg-muted font-medium",
              )}
            >
              <Icon className="size-4" aria-hidden />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto hidden border-t p-4 text-sm md:block">
        <p className="truncate font-medium">{user.name}</p>
        <p className="truncate text-muted-foreground">
          {user.email} · {user.role}
        </p>
        <form action={signOut}>
          <button
            type="submit"
            className="mt-3 flex items-center gap-2 text-muted-foreground hover:text-foreground"
          >
            <LogOut className="size-4" aria-hidden /> Sign out
          </button>
        </form>
      </div>
    </aside>
  );
}
