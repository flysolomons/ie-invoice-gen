"use client";

import {
  FileText,
  LayoutDashboard,
  type LucideIcon,
  Receipt,
  Settings,
  Users,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { APP_NAME } from "@/lib/constants";
import type { SessionUser } from "@/lib/session";
import { BrandLogo } from "./brand-logo";
import { NavUser } from "./nav-user";

type NavItem = { href: string; label: string; icon: LucideIcon };

const MAIN_NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/invoices", label: "Invoices", icon: FileText },
  { href: "/clients", label: "Clients", icon: Users },
  { href: "/payments", label: "Payments", icon: Wallet },
  { href: "/expenses", label: "Expenses", icon: Receipt },
];
const SYSTEM_NAV: NavItem[] = [{ href: "/settings", label: "Settings", icon: Settings }];

/** Navy pill for the current page (overrides the default subtle accent). */
const ACTIVE_PILL =
  "data-active:bg-sidebar-primary data-active:text-sidebar-primary-foreground data-active:hover:bg-sidebar-primary/90 data-active:hover:text-sidebar-primary-foreground data-active:shadow-sm";

function NavGroup({ label, items }: { label: string; items: NavItem[] }) {
  const pathname = usePathname();
  const { isMobile, setOpenMobile } = useSidebar();
  return (
    <SidebarGroup>
      <SidebarGroupLabel>{label}</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <SidebarMenuItem key={href}>
                <SidebarMenuButton
                  isActive={active}
                  tooltip={label}
                  className={ACTIVE_PILL}
                  render={
                    <Link
                      href={href}
                      aria-current={active ? "page" : undefined}
                      // Close the mobile drawer after navigating.
                      onClick={() => isMobile && setOpenMobile(false)}
                    />
                  }
                >
                  <Icon aria-hidden />
                  <span>{label}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

export function AppSidebar({
  user,
  businessName,
  logoVersion,
}: {
  user: SessionUser;
  businessName: string;
  logoVersion: string | null;
}) {
  return (
    <Sidebar variant="floating" collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" tooltip={businessName} render={<Link href="/dashboard" />}>
              <BrandLogo
                logoVersion={logoVersion}
                name={businessName}
                plate
                plateClassName="rounded-md p-0.5 shadow-none"
                className="size-7"
              />
              <span className="grid min-w-0 leading-tight">
                <span className="truncate font-heading font-semibold">{APP_NAME}</span>
                <span className="truncate text-xs text-muted-foreground">{businessName}</span>
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavGroup label="Workspace" items={MAIN_NAV} />
        <NavGroup label="System" items={SYSTEM_NAV} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
